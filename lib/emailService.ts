import nodemailer from 'nodemailer';
import { generateReceiptPDF } from '@/lib/pdf';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // 587 uses STARTTLS
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const DEFAULT_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'hosttech.am.solutions1904@gmail.com';
const DEFAULT_FROM_NAME = process.env.SMTP_FROM_NAME || 'HostTech';
const BASE_APP_URL = process.env.BASE_URL || 'https://pgappbackend.vercel.app';

export interface WelcomeEmailParams {
  toEmail: string;
  ownerName: string;
  pgName: string;
  username: string;
  systemPassword: string;
  planName?: string;
}

export async function sendWelcomeEmail({
  toEmail,
  ownerName,
  pgName,
  username,
  systemPassword,
  planName = 'Starter',
}: WelcomeEmailParams) {
  const fromEmail = DEFAULT_FROM_EMAIL;
  const fromName = DEFAULT_FROM_NAME;
  const baseUrl = BASE_APP_URL;
  const changePasswordLink = `${baseUrl}/reset-password?email=${encodeURIComponent(username)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Welcome to HostTech</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1b494f 0%, #326D75 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .header p { margin: 8px 0 0; color: #fef08a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; }
        .body-content { padding: 32px 28px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .cred-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; }
        .cred-item { margin-bottom: 12px; font-size: 14px; }
        .cred-label { color: #64748b; font-weight: 700; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .cred-value { font-size: 16px; font-weight: 800; color: #1e293b; font-family: monospace; letter-spacing: 0.5px; }
        .btn-change { display: inline-block; background-color: #326D75; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 8px; }
        .note { font-size: 13px; color: #64748b; margin-top: 18px; line-height: 1.5; }
        .footer { padding: 20px; text-align: center; background: #f8fafc; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HostTech</h1>
          <p>PG & Hostel Management SaaS</p>
        </div>
        <div class="body-content">
          <div class="greeting">Welcome aboard, ${ownerName}! 👋</div>
          <p>
            Congratulations! Your PG workspace <strong>${pgName}</strong> has been successfully set up on HostTech with the <strong>${planName}</strong> plan.
          </p>
          <p>
            Here are your login credentials to access the <strong>HostTech Property Portal</strong>:
          </p>
          
          <div class="cred-box">
            <div class="cred-item">
              <span class="cred-label">Login Username (Registered Email)</span>
              <span class="cred-value">${username}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">System Generated Password</span>
              <span class="cred-value">${systemPassword}</span>
            </div>
            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1; text-align: center;">
              <span style="font-size: 12px; color: #64748b; display: block; margin-bottom: 10px;">Want to set your own password?</span>
              <a href="${changePasswordLink}" class="btn-change" target="_blank">Change Password Link</a>
            </div>
          </div>

          <p class="note">
            💡 <strong>Security Note:</strong> You can log in using the credentials above, or click <strong>Change Password Link</strong> anytime to set a new password. Once changed, you can immediately log in with your updated password.
          </p>

          <p style="margin-top: 24px; font-size: 14px; color: #475569;">
            Need help? Reply to this email or reach out to our platform support team.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} HostTech Solutions. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: `Welcome to HostTech - Login Credentials for ${pgName}`,
    html: htmlContent,
  });

  return info;
}

export interface TenantWelcomeEmailParams {
  toEmail: string;
  tenantName: string;
  pgName: string;
  roomNumber: string;
  username: string;
  password: string;
  monthlyRent: number;
  securityDeposit: number;
  securityDepositPaid?: number;
}

export async function sendTenantWelcomeEmail({
  toEmail,
  tenantName,
  pgName,
  roomNumber,
  username,
  password,
  monthlyRent,
  securityDeposit,
  securityDepositPaid = 0,
}: TenantWelcomeEmailParams) {
  const fromEmail = DEFAULT_FROM_EMAIL;
  const fromName = DEFAULT_FROM_NAME;
  const baseUrl = BASE_APP_URL;
  const changePasswordLink = `${baseUrl}/reset-password?email=${encodeURIComponent(username)}`;

  const depositDue = Math.max(0, (securityDeposit || 0) - (securityDepositPaid || 0));
  const isPartiallyPaid = (securityDepositPaid || 0) > 0 && depositDue > 0;
  const isFullyPaid = (securityDepositPaid || 0) >= (securityDeposit || 0) && (securityDeposit || 0) > 0;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Welcome to ${pgName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1b494f 0%, #326D75 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .header p { margin: 8px 0 0; color: #fef08a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; }
        .body-content { padding: 32px 28px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        
        .stay-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .stay-grid { width: 100%; border-collapse: collapse; }
        .stay-grid td { padding: 8px; vertical-align: top; }
        .stay-item-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .stay-item-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px; }
        .deposit-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-left: 6px; }
        
        .deposit-table { width: 100%; margin-top: 10px; border-collapse: separate; border-spacing: 6px; }
        .deposit-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
        
        .cred-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .cred-item { margin-bottom: 12px; font-size: 14px; }
        .cred-label { color: #166534; font-weight: 700; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .cred-value { font-size: 16px; font-weight: 800; color: #14532d; font-family: monospace; letter-spacing: 0.5px; }
        .btn-change { display: inline-block; background-color: #326D75; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 8px; }
        .note { font-size: 13px; color: #64748b; margin-top: 18px; line-height: 1.5; }
        .footer { padding: 20px; text-align: center; background: #f8fafc; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${pgName}</h1>
          <p>Powered by HostTech Portal</p>
        </div>
        <div class="body-content">
          <div class="greeting">Welcome, ${tenantName}! 👋</div>
          <p style="color: #334155; margin-bottom: 18px;">
            Your accommodation at <strong>${pgName}</strong> has been confirmed. Below are your room details, security deposit status, and your personal login credentials for the <strong>Resident Portal</strong>:
          </p>

          <div class="stay-card">
            <table class="stay-grid">
              <tr>
                <td style="width: 50%;">
                  <div class="stay-item-label">Allocated Room</div>
                  <div class="stay-item-val" style="color: #326D75;">Room ${roomNumber}</div>
                </td>
                <td style="width: 50%;">
                  <div class="stay-item-label">Monthly Room Rent</div>
                  <div class="stay-item-val" style="color: #16a34a;">₹${monthlyRent?.toLocaleString('en-IN')}/mo</div>
                </td>
              </tr>
            </table>

            <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 8px;">
              <div class="stay-item-label">
                Security Deposit Breakdown:
                ${isFullyPaid
      ? '<span class="deposit-badge" style="background: #dcfce7; color: #15803d;">Fully Paid</span>'
      : isPartiallyPaid
        ? '<span class="deposit-badge" style="background: #fef9c3; color: #854d0e;">Partially Paid</span>'
        : '<span class="deposit-badge" style="background: #fee2e2; color: #b91c1c;">Pending</span>'
    }
              </div>
              <table class="deposit-table">
                <tr>
                  <td class="deposit-box">
                    <span style="color: #64748b; font-size: 11px; font-weight: 600; display: block;">Total Deposit</span>
                    <strong style="color: #0f172a; font-size: 15px;">₹${(securityDeposit || 0).toLocaleString('en-IN')}</strong>
                  </td>
                  <td class="deposit-box">
                    <span style="color: #64748b; font-size: 11px; font-weight: 600; display: block;">Amount Paid</span>
                    <strong style="color: #15803d; font-size: 15px;">₹${(securityDepositPaid || 0).toLocaleString('en-IN')}</strong>
                  </td>
                  <td class="deposit-box">
                    <span style="color: #64748b; font-size: 11px; font-weight: 600; display: block;">Remaining Due</span>
                    <strong style="color: ${depositDue > 0 ? '#b91c1c' : '#15803d'}; font-size: 15px;">
                      ₹${depositDue.toLocaleString('en-IN')}
                    </strong>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <div class="cred-box">
            <div class="cred-item">
              <span class="cred-label">Login Username (Your Email)</span>
              <span class="cred-value">${username}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">System Generated Password</span>
              <span class="cred-value">${password}</span>
            </div>
            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #86efac; text-align: center;">
              <span style="font-size: 12px; color: #166534; display: block; margin-bottom: 10px;">Want to set your own password?</span>
              <a href="${changePasswordLink}" class="btn-change" target="_blank">Change Password Link</a>
            </div>
          </div>

          <p class="note">
            💡 <strong>With your account you can:</strong> Pay monthly rent & light bills instantly via UPI QR, view payment breakdowns, download receipts, upload verification documents, and lodge maintenance requests directly.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} HostTech Solutions. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `Welcome to ${pgName} - Your Resident Login Credentials & Deposit Summary`,
      html: htmlContent,
      text: `Hello ${tenantName},\n\nWelcome to ${pgName}!\n\nYour Room: Room ${roomNumber}\nMonthly Rent: ₹${monthlyRent}\nTotal Security Deposit: ₹${securityDeposit}\nDeposit Paid: ₹${securityDepositPaid}\nDeposit Remaining Due: ₹${depositDue}\n\nYour Login Credentials:\nUsername: ${username}\nPassword: ${password}\n\nLogin URL: ${baseUrl}/login`,
    });
    console.log(`[Email] Tenant welcome credentials sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email] Failed to send tenant welcome credentials to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

export interface RentReminderEmailParams {
  toEmail: string;
  tenantName: string;
  pgName: string;
  roomNumber: string;
  rentMonth: string;
  baseRent: number;
  electricityAmount?: number;
  maintenanceAmount?: number;
  totalPayable: number;
  amountPaid?: number;
  outstandingBalance: number;
  dueDate: string | Date;
  payUrl?: string;
  upiId?: string;
}

export async function sendRentReminderEmail({
  toEmail,
  tenantName,
  pgName,
  roomNumber,
  rentMonth,
  baseRent,
  electricityAmount = 0,
  maintenanceAmount = 0,
  totalPayable,
  amountPaid = 0,
  outstandingBalance,
  dueDate,
  payUrl,
  upiId,
}: RentReminderEmailParams) {
  const fromEmail = DEFAULT_FROM_EMAIL;
  const fromName = DEFAULT_FROM_NAME;
  const actionPayUrl = payUrl || `${BASE_APP_URL}/resident/pay`;
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Rent Payment Reminder - ${rentMonth}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1b494f 0%, #326D75 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .header p { margin: 8px 0 0; color: #fef08a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; }
        .body-content { padding: 32px 28px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        
        .alert-banner { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 8px; margin: 16px 0; color: #9a3412; font-size: 14px; font-weight: 600; }
        
        .bill-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .bill-table { width: 100%; border-collapse: collapse; }
        .bill-table tr td { padding: 8px 0; font-size: 14px; color: #475569; }
        .bill-table tr.total-row td { padding-top: 14px; border-top: 2px dashed #cbd5e1; font-weight: 800; font-size: 17px; color: #0f172a; }
        .bill-table tr td.amount { text-align: right; font-weight: 700; color: #1e293b; }
        
        .cta-btn { display: inline-block; background-color: #326D75; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 800; font-size: 15px; text-align: center; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; background: #f8fafc; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${pgName}</h1>
          <p>Rent Payment Reminder • ${rentMonth}</p>
        </div>
        <div class="body-content">
          <div class="greeting">Hi ${tenantName}, 👋</div>
          <p style="color: #475569; margin-top: 4px;">
            This is a friendly reminder that your rent for <strong>${rentMonth}</strong> at <strong>${pgName} (Room ${roomNumber})</strong> is due on <strong>${formattedDueDate}</strong>.
          </p>

          <div class="alert-banner">
            ⚠️ Total Outstanding Due: <strong>₹${outstandingBalance.toLocaleString('en-IN')}</strong> (Due by ${formattedDueDate})
          </div>

          <div class="bill-card">
            <h3 style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">
              Billing Breakdown
            </h3>
            <table class="bill-table">
              <tr>
                <td>Monthly Base Rent</td>
                <td class="amount">₹${baseRent.toLocaleString('en-IN')}</td>
              </tr>
              ${electricityAmount > 0
      ? `<tr>
                      <td>Electricity / Light Bill Share</td>
                      <td class="amount" style="color: #ea580c;">₹${electricityAmount.toLocaleString('en-IN')}</td>
                    </tr>`
      : ''
    }
              ${maintenanceAmount > 0
      ? `<tr>
                      <td>Maintenance / Extras</td>
                      <td class="amount">₹${maintenanceAmount.toLocaleString('en-IN')}</td>
                    </tr>`
      : ''
    }
              ${amountPaid > 0
      ? `<tr>
                      <td>Already Paid</td>
                      <td class="amount" style="color: #16a34a;">-₹${amountPaid.toLocaleString('en-IN')}</td>
                    </tr>`
      : ''
    }
              <tr class="total-row">
                <td>Net Payable Amount</td>
                <td class="amount" style="color: #0f172a; font-size: 18px;">₹${outstandingBalance.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${actionPayUrl}" class="cta-btn" target="_blank">Pay Rent Online via App / UPI</a>
            ${upiId
      ? `<p style="font-size: 12px; color: #64748b; margin-top: 10px;">Quick UPI ID: <strong>${upiId}</strong></p>`
      : ''
    }
          </div>

          <p style="font-size: 13px; color: #64748b;">
            💡 <em>Tip: You can submit your payment and upload transaction proof directly in your resident app to get instant digital receipts.</em>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} HostTech Solutions. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `Rent Reminder: Rent due for ${rentMonth} - ${pgName}`,
      html: htmlContent,
      text: `Hello ${tenantName},\n\nThis is a rent reminder for ${rentMonth} at ${pgName} (Room ${roomNumber}).\n\nTotal Due: ₹${outstandingBalance}\nDue Date: ${formattedDueDate}\n\nPlease submit your payment at: ${actionPayUrl}`,
    });
    console.log(`[Email] Rent reminder sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email] Failed to send rent reminder to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

export interface TenantPaymentConfirmationEmailParams {
  toEmail: string;
  tenantName: string;
  pgName: string;
  roomNumber: string;
  rentMonth: string;
  amountPaid: number;
  paymentMethod: string;
  transactionId?: string;
  receiptNumber?: string;
  remainingBalance: number;
  receiptDownloadUrl: string;
  pdfBuffer?: Buffer;
}

export async function sendTenantPaymentConfirmationEmail({
  toEmail,
  tenantName,
  pgName,
  roomNumber,
  rentMonth,
  amountPaid,
  paymentMethod,
  transactionId,
  receiptNumber,
  remainingBalance,
  receiptDownloadUrl,
  pdfBuffer,
}: TenantPaymentConfirmationEmailParams) {
  const fromEmail = DEFAULT_FROM_EMAIL;
  const fromName = DEFAULT_FROM_NAME;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payment Received - ${pgName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1b494f 0%, #326D75 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .header p { margin: 8px 0 0; color: #fef08a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; }
        .body-content { padding: 32px 28px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        
        .success-banner { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }
        .success-banner h2 { margin: 0 0 4px; font-size: 24px; color: #15803d; font-weight: 800; }
        .success-banner p { margin: 0; font-size: 13px; color: #166534; font-weight: 600; }
        
        .receipt-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 18px 0; }
        .receipt-table { width: 100%; border-collapse: collapse; }
        .receipt-table tr td { padding: 8px 0; font-size: 14px; color: #475569; }
        .receipt-table tr td.val { text-align: right; font-weight: 700; color: #0f172a; }
        
        .cta-btn { display: inline-block; background-color: #326D75; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 800; font-size: 14px; text-align: center; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; background: #f8fafc; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${pgName}</h1>
          <p>Payment Confirmation & Receipt</p>
        </div>
        <div class="body-content">
          <div class="greeting">Hi ${tenantName}! ✅</div>
          <p style="color: #475569;">
            Your rent payment for <strong>${rentMonth}</strong> at <strong>${pgName}</strong> has been received and verified.
          </p>

          <div class="success-banner">
            <h2>₹${amountPaid.toLocaleString('en-IN')} Paid</h2>
            <p>Receipt No: ${receiptNumber || 'Verified'}</p>
          </div>

          <div class="receipt-card">
            <table class="receipt-table">
              <tr>
                <td>Tenant Name:</td>
                <td class="val">${tenantName} (Room ${roomNumber})</td>
              </tr>
              <tr>
                <td>Billing Month:</td>
                <td class="val">${rentMonth}</td>
              </tr>
              <tr>
                <td>Payment Mode:</td>
                <td class="val">${paymentMethod}</td>
              </tr>
              ${transactionId
      ? `<tr>
                      <td>Transaction Ref / UTR:</td>
                      <td class="val" style="font-family: monospace;">${transactionId}</td>
                    </tr>`
      : ''
    }
              <tr>
                <td>Payment Date:</td>
                <td class="val">${new Date().toLocaleDateString('en-IN')}</td>
              </tr>
              <tr style="border-top: 1px dashed #cbd5e1;">
                <td style="padding-top: 10px;">Remaining Balance:</td>
                <td class="val" style="padding-top: 10px; color: ${remainingBalance > 0 ? '#b91c1c' : '#15803d'};">
                  ₹${remainingBalance.toLocaleString('en-IN')}
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${receiptDownloadUrl}" class="cta-btn" target="_blank">📄 Download Official PDF Receipt</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            📎 An official PDF receipt is also attached to this email for your permanent records.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} HostTech Solutions. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments: any[] = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `Receipt_${receiptNumber || 'Rent'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `Payment Receipt: ₹${amountPaid.toLocaleString('en-IN')} received for ${rentMonth} - ${pgName}`,
      html: htmlContent,
      attachments,
      text: `Hello ${tenantName},\n\nYour payment of ₹${amountPaid} for ${rentMonth} at ${pgName} (Room ${roomNumber}) has been confirmed.\n\nReceipt Number: ${receiptNumber}\nRemaining Balance: ₹${remainingBalance}\n\nDownload Receipt: ${receiptDownloadUrl}`,
    });
    console.log(`[Email] Tenant payment confirmation sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email] Failed to send tenant payment receipt to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

export interface AdminPaymentNotificationEmailParams {
  toEmail: string;
  adminName: string;
  tenantName: string;
  tenantPhone: string;
  pgName: string;
  roomNumber: string;
  rentMonth: string;
  amountPaid: number;
  paymentMethod: string;
  transactionId?: string;
  receiptNumber?: string;
  remainingBalance: number;
  isApprovalAction?: boolean;
}

export async function sendAdminPaymentNotificationEmail({
  toEmail,
  adminName,
  tenantName,
  tenantPhone,
  pgName,
  roomNumber,
  rentMonth,
  amountPaid,
  paymentMethod,
  transactionId,
  receiptNumber,
  remainingBalance,
  isApprovalAction = false,
}: AdminPaymentNotificationEmailParams) {
  const fromEmail = DEFAULT_FROM_EMAIL;
  const fromName = DEFAULT_FROM_NAME;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payment Received Notification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1b494f 0%, #326D75 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .header p { margin: 8px 0 0; color: #fef08a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; }
        .body-content { padding: 32px 28px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        
        .alert-card { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 18px; margin: 18px 0; }
        .amount-big { font-size: 26px; font-weight: 800; color: #15803d; margin: 4px 0; }
        
        .details-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .details-table tr td { padding: 8px 0; font-size: 14px; color: #475569; }
        .details-table tr td.val { text-align: right; font-weight: 700; color: #0f172a; }
        
        .footer { padding: 20px; text-align: center; background: #f8fafc; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${pgName}</h1>
          <p>Admin Payment Alert</p>
        </div>
        <div class="body-content">
          <div class="greeting">Hello ${adminName}, 🔔</div>
          <p style="color: #475569;">
            ${isApprovalAction
      ? `A rent payment of <strong>₹${amountPaid.toLocaleString('en-IN')}</strong> was approved and receipt <strong>${receiptNumber}</strong> generated.`
      : `A new rent payment proof has been submitted by a resident on your portal.`
    }
          </p>

          <div class="alert-card">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;">Paid Amount</span>
            <div class="amount-big">₹${amountPaid.toLocaleString('en-IN')}</div>
            <span style="font-size: 12px; color: #166534; font-weight: 600;">Status: ${isApprovalAction ? 'Approved & Recorded' : 'Verification Required'}</span>
          </div>

          <table class="details-table">
            <tr>
              <td>Tenant Name:</td>
              <td class="val">${tenantName}</td>
            </tr>
            <tr>
              <td>Phone:</td>
              <td class="val">${tenantPhone}</td>
            </tr>
            <tr>
              <td>Room:</td>
              <td class="val">Room ${roomNumber}</td>
            </tr>
            <tr>
              <td>Billing Month:</td>
              <td class="val">${rentMonth}</td>
            </tr>
            <tr>
              <td>Payment Mode:</td>
              <td class="val">${paymentMethod}</td>
            </tr>
            ${transactionId
      ? `<tr>
                    <td>Transaction Ref / UTR:</td>
                    <td class="val" style="font-family: monospace;">${transactionId}</td>
                  </tr>`
      : ''
    }
            ${receiptNumber
      ? `<tr>
                    <td>Receipt Number:</td>
                    <td class="val" style="font-family: monospace;">${receiptNumber}</td>
                  </tr>`
      : ''
    }
            <tr style="border-top: 1px dashed #cbd5e1;">
              <td style="padding-top: 10px;">Tenant Remaining Balance:</td>
              <td class="val" style="padding-top: 10px; color: ${remainingBalance > 0 ? '#b91c1c' : '#15803d'};">
                ₹${remainingBalance.toLocaleString('en-IN')}
              </td>
            </tr>
          </table>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Log in to the Admin Dashboard to review all financial records and audit logs anytime.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} HostTech Solutions. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `[Payment Alert] ₹${amountPaid.toLocaleString('en-IN')} from ${tenantName} (Room ${roomNumber}) - ${pgName}`,
      html: htmlContent,
      text: `Payment Alert: Tenant ${tenantName} (Room ${roomNumber}, Phone: ${tenantPhone}) paid ₹${amountPaid} for ${rentMonth}.\nPayment Mode: ${paymentMethod}\nUTR: ${transactionId || 'N/A'}\nRemaining Balance: ₹${remainingBalance}`,
    });
    console.log(`[Email] Admin payment alert sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email] Failed to send admin payment alert to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}
