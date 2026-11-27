import { connectDB } from '@/lib/db';
import { PaymentSubmission } from '@/models/PaymentSubmission';
import { RentRecord } from '@/models/RentRecord';
import { PaymentReceipt } from '@/models/PaymentReceipt';
import { ResidentProfile } from '@/models/ResidentProfile';
import { PGProperty } from '@/models/PGProperty';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { createInAppNotification } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';
import { generateReceiptPDF } from '@/lib/pdf';
import {
  sendTenantPaymentConfirmationEmail,
  sendAdminPaymentNotificationEmail,
} from '@/lib/emailService';

// Helper to find the Admin's email for a given property or organization
async function getAdminEmailForProperty(propertyId?: any, organizationId?: any): Promise<{ email: string; name: string } | null> {
  try {
    let admin = null;
    if (propertyId) {
      admin = await User.findOne({ propertyId, role: 'admin', isActive: true });
    }
    if (!admin && organizationId) {
      admin = await User.findOne({ organizationId, role: 'admin', isActive: true });
    }
    if (!admin) {
      admin = await User.findOne({ role: 'admin', isActive: true });
    }
    if (admin && admin.email) {
      return { email: admin.email, name: admin.name || 'Property Admin' };
    }
  } catch (err) {
    console.error('[Admin Email Lookup Error]:', err);
  }
  return null;
}

export async function submitPayment({
  residentId,
  rentRecordId,
  amount,
  paymentMethod,
  transactionId,
  screenshotPath,
  remarks,
}: {
  residentId: string;
  rentRecordId: string;
  amount: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash';
  transactionId?: string;
  screenshotPath?: string;
  remarks?: string;
}) {
  await connectDB();
  const rentRecord = await RentRecord.findById(rentRecordId);
  if (!rentRecord) throw new Error('Rent record not found');

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // UPI requires transaction reference and proof
  if (paymentMethod === 'UPI') {
    if (!transactionId || transactionId.trim() === '') {
      throw new Error('Transaction ID / UTR is required for UPI payment.');
    }
  }

  const submission = await PaymentSubmission.create({
    residentId,
    rentRecordId,
    rentMonth: rentRecord.rentMonth,
    amount,
    paymentMethod,
    paymentDate: new Date(),
    transactionId: transactionId || '',
    screenshotPath: screenshotPath || '',
    remarks: remarks || '',
    status: 'Pending',
  });

  // Update rent record status to Verification Pending
  rentRecord.status = 'Verification Pending';
  await rentRecord.save();

  // Send immediate payment alert email to Admin
  const resident = await ResidentProfile.findById(residentId).populate('roomId');
  const property = await PGProperty.findById(rentRecord.propertyId);
  const adminContact = await getAdminEmailForProperty(rentRecord.propertyId, resident?.organizationId);

  if (adminContact && resident) {
    const roomNumber = (resident.roomId as any)?.roomNumber || 'Assigned';
    sendAdminPaymentNotificationEmail({
      toEmail: adminContact.email,
      adminName: adminContact.name,
      tenantName: resident.fullName,
      tenantPhone: resident.phone,
      pgName: property?.name || 'HostTech PG',
      roomNumber,
      rentMonth: rentRecord.rentMonth,
      amountPaid: amount,
      paymentMethod,
      transactionId: transactionId || '',
      remainingBalance: Math.max(0, rentRecord.outstandingAmount - amount),
      isApprovalAction: false,
    }).catch(err => {
      console.error('[SubmitPayment Admin Email Alert Error]:', err);
    });
  }

  return submission;
}

export async function approvePayment({
  submissionId,
  adminId,
  adminName,
}: {
  submissionId: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const submission = await PaymentSubmission.findById(submissionId);
  if (!submission) throw new Error('Payment submission not found');
  if (submission.status === 'Approved') {
    throw new Error('This payment submission is already approved.');
  }

  const rentRecord = await RentRecord.findById(submission.rentRecordId);
  if (!rentRecord) throw new Error('Linked rent record not found');

  // Mark submission approved
  submission.status = 'Approved';
  submission.verifiedBy = adminId as any;
  submission.verifiedAt = new Date();
  await submission.save();

  // Update RentRecord Ledger
  rentRecord.amountPaid += submission.amount;
  rentRecord.outstandingAmount = Math.max(0, rentRecord.totalPayable - rentRecord.amountPaid);
  if (rentRecord.outstandingAmount === 0) {
    rentRecord.status = 'Paid';
  } else {
    rentRecord.status = 'Partially Paid';
  }
  await rentRecord.save();

  // Generate Unique Receipt Number
  const settings = await AppSettings.findOne();
  const prefix = settings?.receiptPrefix || 'REC';
  const receiptNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const receipt = await PaymentReceipt.create({
    receiptNumber,
    propertyId: rentRecord.propertyId,
    residentId: submission.residentId,
    rentRecordId: rentRecord._id,
    paymentSubmissionId: submission._id,
    rentMonth: rentRecord.rentMonth,
    amount: submission.amount,
    paymentMethod: submission.paymentMethod,
    paymentDate: submission.paymentDate,
    transactionReference: submission.transactionId,
    remainingBalance: rentRecord.outstandingAmount,
    receivedBy: adminId,
  });

  // Notify resident via In-App
  const resident = await ResidentProfile.findById(submission.residentId).populate('roomId').populate('bedId');
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Payment Approved & Receipt Issued',
      message: `Your payment of ₹${submission.amount} for ${rentRecord.rentMonth} has been approved. Receipt ${receiptNumber} generated. Outstanding balance: ₹${rentRecord.outstandingAmount}.`,
      type: 'Payment',
      referenceId: receipt._id.toString(),
    });
  }

  // Audit Log
  await logAudit({
    action: 'Payment Approved',
    module: 'Payments',
    recordId: submissionId,
    adminId,
    adminName,
    newValues: {
      amount: submission.amount,
      receiptNumber,
      rentRecordStatus: rentRecord.status,
    },
  });

  // Generate PDF Receipt Buffer & send emails to BOTH Tenant and Admin
  const property = await PGProperty.findById(rentRecord.propertyId);
  const baseUrl = process.env.BASE_URL || 'https://pgappbackend.vercel.app';
  const receiptDownloadUrl = `${baseUrl}/api/receipts/${receipt._id}/pdf`;

  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = generateReceiptPDF({ receipt, property, resident });
  } catch (pdfErr) {
    console.error('[Receipt PDF Generation Error]:', pdfErr);
  }

  // 1. Send receipt confirmation email to Tenant with PDF download link & attachment
  if (resident && resident.email) {
    const roomNumber = (resident.roomId as any)?.roomNumber || 'Assigned';
    sendTenantPaymentConfirmationEmail({
      toEmail: resident.email,
      tenantName: resident.fullName,
      pgName: property?.name || 'HostTech PG',
      roomNumber,
      rentMonth: rentRecord.rentMonth,
      amountPaid: submission.amount,
      paymentMethod: submission.paymentMethod,
      transactionId: submission.transactionId,
      receiptNumber,
      remainingBalance: rentRecord.outstandingAmount,
      receiptDownloadUrl,
      pdfBuffer,
    }).catch(err => {
      console.error('[ApprovePayment Tenant Email Error]:', err);
    });
  }

  // 2. Send confirmation notice to PG Admin
  const adminContact = await getAdminEmailForProperty(rentRecord.propertyId, resident?.organizationId);
  if (adminContact && resident) {
    const roomNumber = (resident.roomId as any)?.roomNumber || 'Assigned';
    sendAdminPaymentNotificationEmail({
      toEmail: adminContact.email,
      adminName: adminContact.name,
      tenantName: resident.fullName,
      tenantPhone: resident.phone,
      pgName: property?.name || 'HostTech PG',
      roomNumber,
      rentMonth: rentRecord.rentMonth,
      amountPaid: submission.amount,
      paymentMethod: submission.paymentMethod,
      transactionId: submission.transactionId,
      receiptNumber,
      remainingBalance: rentRecord.outstandingAmount,
      isApprovalAction: true,
    }).catch(err => {
      console.error('[ApprovePayment Admin Email Error]:', err);
    });
  }

  return { submission, receipt, rentRecord };
}

export async function rejectPayment({
  submissionId,
  rejectionReason,
  adminId,
  adminName,
}: {
  submissionId: string;
  rejectionReason: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const submission = await PaymentSubmission.findById(submissionId);
  if (!submission) throw new Error('Payment submission not found');
  if (submission.status === 'Approved') {
    throw new Error('Approved payment cannot be rejected.');
  }

  submission.status = 'Rejected';
  submission.rejectionReason = rejectionReason;
  submission.verifiedBy = adminId as any;
  submission.verifiedAt = new Date();
  await submission.save();

  const rentRecord = await RentRecord.findById(submission.rentRecordId);
  if (rentRecord) {
    if (rentRecord.amountPaid === 0) {
      rentRecord.status = 'Unpaid';
    } else {
      rentRecord.status = 'Partially Paid';
    }
    await rentRecord.save();
  }

  const resident = await ResidentProfile.findById(submission.residentId);
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Payment Proof Rejected',
      message: `Your payment submission of ₹${submission.amount} for ${submission.rentMonth} was rejected. Reason: ${rejectionReason}. Please re-submit valid payment proof.`,
      type: 'Payment',
      referenceId: submission._id.toString(),
    });
  }

  await logAudit({
    action: 'Payment Rejected',
    module: 'Payments',
    recordId: submissionId,
    adminId,
    adminName,
    newValues: { rejectionReason },
  });

  return submission;
}

export async function recordCashPayment({
  residentId,
  rentRecordId,
  amount,
  remarks,
  adminId,
  adminName,
}: {
  residentId: string;
  rentRecordId: string;
  amount: number;
  remarks?: string;
  adminId: string;
  adminName: string;
}) {
  await connectDB();
  const rentRecord = await RentRecord.findById(rentRecordId);
  if (!rentRecord) throw new Error('Rent record not found');

  // Create submission auto-approved for cash
  const submission = await PaymentSubmission.create({
    residentId,
    rentRecordId,
    rentMonth: rentRecord.rentMonth,
    amount,
    paymentMethod: 'Cash',
    paymentDate: new Date(),
    transactionId: 'CASH-' + Date.now().toString().slice(-6),
    remarks: remarks || 'Cash collected by admin',
    status: 'Approved',
    verifiedBy: adminId,
    verifiedAt: new Date(),
  });

  // Update RentRecord
  rentRecord.amountPaid += amount;
  rentRecord.outstandingAmount = Math.max(0, rentRecord.totalPayable - rentRecord.amountPaid);
  if (rentRecord.outstandingAmount === 0) {
    rentRecord.status = 'Paid';
  } else {
    rentRecord.status = 'Partially Paid';
  }
  await rentRecord.save();

  // Generate Receipt
  const settings = await AppSettings.findOne();
  const prefix = settings?.receiptPrefix || 'REC';
  const receiptNumber = `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const receipt = await PaymentReceipt.create({
    receiptNumber,
    propertyId: rentRecord.propertyId,
    residentId,
    rentRecordId: rentRecord._id,
    paymentSubmissionId: submission._id,
    rentMonth: rentRecord.rentMonth,
    amount,
    paymentMethod: 'Cash',
    paymentDate: new Date(),
    transactionReference: submission.transactionId,
    remainingBalance: rentRecord.outstandingAmount,
    receivedBy: adminId,
    notes: remarks || '',
  });

  const resident = await ResidentProfile.findById(residentId).populate('roomId').populate('bedId');
  if (resident) {
    await createInAppNotification({
      recipientId: resident.userId,
      title: 'Cash Payment Recorded',
      message: `Cash payment of ₹${amount} for ${rentRecord.rentMonth} has been received. Receipt ${receiptNumber} generated.`,
      type: 'Payment',
      referenceId: receipt._id.toString(),
    });
  }

  await logAudit({
    action: 'Cash Payment Recorded',
    module: 'Payments',
    recordId: receipt._id.toString(),
    adminId,
    adminName,
    newValues: { amount, receiptNumber },
  });

  // Generate Receipt PDF & send confirmation to resident and admin
  const property = await PGProperty.findById(rentRecord.propertyId);
  const baseUrl = process.env.BASE_URL || 'https://pgappbackend.vercel.app';
  const receiptDownloadUrl = `${baseUrl}/api/receipts/${receipt._id}/pdf`;

  let pdfBuffer: Buffer | undefined;
  try {
    pdfBuffer = generateReceiptPDF({ receipt, property, resident });
  } catch (pdfErr) {
    console.error('[Receipt PDF Generation Error]:', pdfErr);
  }

  if (resident && resident.email) {
    const roomNumber = (resident.roomId as any)?.roomNumber || 'Assigned';
    sendTenantPaymentConfirmationEmail({
      toEmail: resident.email,
      tenantName: resident.fullName,
      pgName: property?.name || 'HostTech PG',
      roomNumber,
      rentMonth: rentRecord.rentMonth,
      amountPaid: amount,
      paymentMethod: 'Cash',
      transactionId: submission.transactionId,
      receiptNumber,
      remainingBalance: rentRecord.outstandingAmount,
      receiptDownloadUrl,
      pdfBuffer,
    }).catch(err => {
      console.error('[RecordCashPayment Tenant Email Error]:', err);
    });
  }

  const adminContact = await getAdminEmailForProperty(rentRecord.propertyId, resident?.organizationId);
  if (adminContact && resident) {
    const roomNumber = (resident.roomId as any)?.roomNumber || 'Assigned';
    sendAdminPaymentNotificationEmail({
      toEmail: adminContact.email,
      adminName: adminContact.name,
      tenantName: resident.fullName,
      tenantPhone: resident.phone,
      pgName: property?.name || 'HostTech PG',
      roomNumber,
      rentMonth: rentRecord.rentMonth,
      amountPaid: amount,
      paymentMethod: 'Cash',
      transactionId: submission.transactionId,
      receiptNumber,
      remainingBalance: rentRecord.outstandingAmount,
      isApprovalAction: true,
    }).catch(err => {
      console.error('[RecordCashPayment Admin Email Error]:', err);
    });
  }

  return { submission, receipt, rentRecord };
}
