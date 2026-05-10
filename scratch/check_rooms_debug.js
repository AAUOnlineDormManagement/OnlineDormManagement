const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env from server directory
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function checkRooms() {
  try {
    const Room = require('./server/src/models/Room');
    const Student = require('./server/src/models/Student');
    const DormApplication = require('./server/src/models/DormApplication');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const availableRooms = await Room.find({ 
      capacity: { $gt: 0 }, 
      $expr: { $lt: ["$currentOccupants", "$capacity"] } 
    });
    console.log('Available rooms count:', availableRooms.length);

    const pendingApps = await DormApplication.find({ status: 'Pending' }).populate('student');
    console.log('Pending applications count:', pendingApps.length);
    
    if (pendingApps.length > 0) {
        console.log('--- Sample Pending Application ---');
        const app = pendingApps[0];
        console.log('ID:', app._id);
        console.log('Student:', app.student?.fullName || 'N/A');
        console.log('Gender:', app.student?.gender || 'N/A');
        console.log('Department:', app.student?.department || 'N/A');
        console.log('Staff Related:', app.isStaffRelated);
        console.log('Special Need:', app.isSpecialNeed);
        console.log('Verification Note:', app.originVerificationNote);
    }

    if (availableRooms.length > 0) {
        console.log('--- Sample Available Room ---');
        console.log(JSON.stringify(availableRooms[0], null, 2));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkRooms();
