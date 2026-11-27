const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TARGET_URI =
  'mongodb://aneridelxn_db_user:AHO1seq6OHfuYpmr@ac-tbc6s5c-shard-00-02.1onmyll.mongodb.net:27017/pg_management?ssl=true&authSource=admin&directConnection=true';

async function seedData() {
  try {
    console.log('[Seeder] Connecting to target MongoDB Atlas node...');
    await mongoose.connect(TARGET_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log('[Seeder] Connected successfully!');

    // Clean existing collections in this db
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`[Seeder] Cleared collection: ${collection.collectionName}`);
    }

    const adminHashedPassword = await bcrypt.hash('Admin@123', 10);
    const aneriHashedPassword = await bcrypt.hash('Aneri@123', 10);
    const residentHashedPassword = await bcrypt.hash('Resident@123', 10);

    // 1. Users
    // Primary Admin
    const adminUser = await mongoose.connection.db.collection('users').insertOne({
      name: 'System Admin',
      email: 'admin@gmail.com',
      phone: '9800000001',
      password: adminHashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Secondary Admin accounts for convenience
    await mongoose.connection.db.collection('users').insertOne({
      name: 'HostTech Admin',
      email: 'admin@hosttech.com',
      phone: '9876543210',
      password: await bcrypt.hash('AdminPassword123', 10),
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. PG Property
    const property = await mongoose.connection.db.collection('pgproperties').insertOne({
      name: 'HostTech - Emerald Living',
      pgType: 'Coliving',
      address: 'Plot 42, Green Glen Layout, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      contactPerson: 'Ramesh Sharma',
      contactNumber: '9988776655',
      description: 'Premium modern co-living space with 2 Floors and 14 Rooms. Equipped with high-speed Wi-Fi, 3 daily meals, and housekeeping.',
      facilities: ['High Speed Wi-Fi', '3-Time Meals', 'Daily Housekeeping', 'Air Conditioning', 'Power Backup', 'Washing Machine', 'Gym'],
      rules: ['No loud music after 10 PM', 'Guests allowed in common areas until 8 PM', 'Non-smoking building'],
      images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. 2 Floors with 7 Rooms each = 14 Rooms total
    let firstRoomId = null;
    let secondRoomId = null;

    for (let floor = 1; floor <= 2; floor++) {
      for (let roomIdx = 1; roomIdx <= 7; roomIdx++) {
        const roomNumber = `${floor}0${roomIdx}`;
        const isSingleTenantFullRoom = roomIdx <= 2;
        const rentalType = isSingleTenantFullRoom ? 'Full Room (Single Tenant)' : 'Sharing';
        const maxCapacity = isSingleTenantFullRoom ? 1 : (roomIdx <= 5 ? 2 : 3);
        const roomType = roomIdx <= 4 ? 'AC' : 'Non-AC';
        const defaultRent = isSingleTenantFullRoom ? 15000 : (roomType === 'AC' ? 8500 : 6500);

        const roomInsert = await mongoose.connection.db.collection('rooms').insertOne({
          propertyId: property.insertedId,
          roomNumber,
          floor,
          roomType,
          rentalType,
          maxCapacity,
          currentOccupants: 0,
          defaultRent,
          status: 'Available',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (floor === 1 && roomIdx === 1) {
          firstRoomId = roomInsert.insertedId;
        } else if (floor === 1 && roomIdx === 2) {
          secondRoomId = roomInsert.insertedId;
        }
      }
    }

    console.log('[Seeder] 14 Rooms created.');

    // 4. Resident User 1: Aneri Lohakane (lohakaneaneri6@gmail.com / Aneri@123)
    const aneriUser = await mongoose.connection.db.collection('users').insertOne({
      name: 'Aneri Lohakane',
      email: 'lohakaneaneri6@gmail.com',
      phone: '9800000002',
      password: aneriHashedPassword,
      role: 'resident',
      propertyId: property.insertedId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const aneriProfile = await mongoose.connection.db.collection('residentprofiles').insertOne({
      userId: aneriUser.insertedId,
      fullName: 'Aneri Lohakane',
      email: 'lohakaneaneri6@gmail.com',
      phone: '9800000002',
      permanentAddress: 'Pune, Maharashtra',
      occupation: 'Software Engineer',
      emergencyContactName: 'Family Member',
      emergencyContactNumber: '9800000003',
      joiningDate: new Date('2026-10-01'),
      propertyId: property.insertedId,
      roomId: firstRoomId,
      occupancyType: 'Full Room',
      monthlyRent: 8500,
      rentDueDay: 5,
      securityDeposit: 15000,
      securityDepositPaid: 15000,
      advancePayment: 8500,
      noticePeriodDays: 30,
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update Room 101 occupancy
    await mongoose.connection.db.collection('rooms').updateOne(
      { _id: firstRoomId },
      { $set: { currentOccupants: 1, status: 'Occupied' } }
    );

    // 5. Resident User 2: Aditya Verma (resident@pgapp.com / Resident@123)
    const adityaUser = await mongoose.connection.db.collection('users').insertOne({
      name: 'Aditya Verma',
      email: 'resident@pgapp.com',
      phone: '9845123456',
      password: residentHashedPassword,
      role: 'resident',
      propertyId: property.insertedId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const adityaProfile = await mongoose.connection.db.collection('residentprofiles').insertOne({
      userId: adityaUser.insertedId,
      fullName: 'Aditya Verma',
      email: 'resident@pgapp.com',
      phone: '9845123456',
      permanentAddress: '124, Civil Lines, Jaipur, Rajasthan',
      occupation: 'Working Professional',
      joiningDate: new Date('2026-10-01'),
      propertyId: property.insertedId,
      roomId: secondRoomId,
      occupancyType: 'Full Room',
      monthlyRent: 14000,
      rentDueDay: 5,
      securityDeposit: 25000,
      securityDepositPaid: 25000,
      advancePayment: 14000,
      noticePeriodDays: 30,
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update Room 102 occupancy
    await mongoose.connection.db.collection('rooms').updateOne(
      { _id: secondRoomId },
      { $set: { currentOccupants: 1, status: 'Occupied' } }
    );

    // 6. Security Deposits
    await mongoose.connection.db.collection('securitydeposits').insertMany([
      {
        residentId: aneriProfile.insertedId,
        propertyId: property.insertedId,
        depositRequired: 15000,
        depositReceived: 15000,
        depositOutstanding: 0,
        refundStatus: 'Not Applicable',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        residentId: adityaProfile.insertedId,
        propertyId: property.insertedId,
        depositRequired: 25000,
        depositReceived: 25000,
        depositOutstanding: 0,
        refundStatus: 'Not Applicable',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    // 7. Rent Records & Receipts
    // Aneri - October Paid
    const aneriOctRent = await mongoose.connection.db.collection('rentrecords').insertOne({
      residentId: aneriProfile.insertedId,
      propertyId: property.insertedId,
      roomId: firstRoomId,
      rentMonth: '2026-10',
      rentAmount: 8500,
      dueDate: new Date('2026-10-05'),
      previousOutstanding: 0,
      totalPayable: 8500,
      amountPaid: 8500,
      outstandingAmount: 0,
      status: 'Paid',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-03'),
    });

    await mongoose.connection.db.collection('paymentreceipts').insertOne({
      receiptNumber: 'HT-202610-001',
      propertyId: property.insertedId,
      residentId: aneriProfile.insertedId,
      rentRecordId: aneriOctRent.insertedId,
      rentMonth: '2026-10',
      amount: 8500,
      paymentMethod: 'UPI',
      paymentDate: new Date('2026-10-03'),
      transactionReference: 'UPI/338899221144',
      remainingBalance: 0,
      receivedBy: adminUser.insertedId,
      createdAt: new Date('2026-10-03'),
      updatedAt: new Date('2026-10-03'),
    });

    // Aneri - November Due
    const aneriNovRent = await mongoose.connection.db.collection('rentrecords').insertOne({
      residentId: aneriProfile.insertedId,
      propertyId: property.insertedId,
      roomId: firstRoomId,
      rentMonth: '2026-11',
      rentAmount: 8500,
      dueDate: new Date('2026-11-05'),
      previousOutstanding: 0,
      totalPayable: 8500,
      amountPaid: 0,
      outstandingAmount: 8500,
      status: 'Overdue',
      createdAt: new Date('2026-11-01'),
      updatedAt: new Date('2026-11-01'),
    });

    // 8. Notifications
    await mongoose.connection.db.collection('notifications').insertOne({
      recipientId: aneriUser.insertedId,
      title: 'Rent Due for November 2026',
      message: 'Your monthly rent of ₹8,500 for Room 101 is due. Please pay via UPI or Bank Transfer.',
      type: 'Rent',
      referenceId: aneriNovRent.insertedId.toString(),
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 9. AppSettings
    await mongoose.connection.db.collection('appsettings').insertOne({
      rentDueDay: 5,
      gracePeriodDays: 3,
      reminderSchedule: [-5, -1, 0, 3, 7],
      requirePaymentProof: true,
      allowPartialPayment: true,
      allowAdvancePayment: false,
      autoVerifyDocuments: false,
      complaintCategories: ['Water', 'Electricity', 'Wi-Fi', 'Cleaning', 'Food', 'Maintenance', 'Room issues', 'Other'],
      timezone: 'Asia/Kolkata',
      upiId: 'hosttech@okhdfcbank',
      bankDetails: {
        accountName: 'HostTech Living Ltd',
        accountNumber: '50200012345678',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank - Bellandur Branch',
      },
      receiptPrefix: 'HT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('\n=============================================');
    console.log('Target MongoDB Atlas Database Seeded Successfully!');
    console.log('URI:', TARGET_URI.split('@')[1]);
    console.log('Admin Account:    email="admin@gmail.com", password="Admin@123"');
    console.log('Resident Account: email="lohakaneaneri6@gmail.com", password="Aneri@123"');
    console.log('=============================================\n');

    const collectionsAfter = await mongoose.connection.db.collections();
    for (let c of collectionsAfter) {
      console.log(`- ${c.collectionName}: ${await c.countDocuments()} documents`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error on Atlas:', err);
    process.exit(1);
  }
}

seedData();
