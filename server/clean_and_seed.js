const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Student = require('./src/models/Student');
const User = require('./src/models/User');
const DormApplication = require('./src/models/DormApplication');

async function cleanAndSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Clear all dorm applications
    const deleteAppsResult = await DormApplication.deleteMany({});
    console.log(`Cleared ${deleteAppsResult.deletedCount} dorm applications`);

    // 2. Reset all room occupancies
    const Room = require('./src/models/Room');
    const resetRoomsResult = await Room.updateMany({}, { currentOccupants: 0 });
    console.log(`Reset occupancy for ${resetRoomsResult.modifiedCount} rooms`);

    // 3. Remove Nunuyat if exists

    await Student.deleteOne({ fullName: /Nunuyat/i });
    await User.deleteOne({ name: /Nunuyat/i });
    console.log('Removed Nunuyat Getamesy');

    // 3. Seed Ribka Muluye
    let ribkaUser = await User.findOne({ userID: 'UGR/1111/15' });
    if (ribkaUser) {
      ribkaUser.name = 'Ribka Muluye';
      ribkaUser.password = await require('bcryptjs').hash('1234', 12);
      await ribkaUser.save();
    } else {
      const hashedPassword = await require('bcryptjs').hash('1234', 12);
      ribkaUser = await User.create({
        name: 'Ribka Muluye',
        userID: 'UGR/1111/15',
        email: 'ribka@example.com',
        password: hashedPassword,
        role: 'Student'
      });
    }

    let ribkaStudent = await Student.findOne({ studentID: 'UGR/1111/15' });
    if (ribkaStudent) {
      ribkaStudent.fullName = 'Ribka Muluye';
      ribkaStudent.isFreshman = true;
      ribkaStudent.department = 'Freshman';
      ribkaStudent.gender = 'Female';
      ribkaStudent.sponsorship = 'Government';
      await ribkaStudent.save();
    } else {
      ribkaStudent = await Student.create({
        user: ribkaUser._id,
        fullName: 'Ribka Muluye',
        studentID: 'UGR/1111/15',
        year: 1,
        department: 'Freshman',
        isFreshman: true,
        gender: 'Female',
        sponsorship: 'Government',
        city: 'Outside Addis',
        phoneNumber: '0911223344'
      });
    }


    console.log('Seed Success: Ribka Muluye is now a freshman in the system');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error during cleanup/seed:', err);
    process.exit(1);
  }
}

cleanAndSeed();
