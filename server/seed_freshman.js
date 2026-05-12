const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Student = require('./src/models/Student');
const User = require('./src/models/User');

async function seedFreshman() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find student by name
    let student = await Student.findOne({ fullName: /Nunuyat/i });
    
    if (!student) {
      console.log('Student Nunuyat not found. Creating a new one...');
      // Create a user first if not exists
      let user = await User.findOne({ name: /Nunuyat/i });
      if (!user) {
        user = await User.create({
          name: 'Nunuyat Getamesy',
          userID: 'FRESHTEST01',
          email: 'nunuyat@example.com',
          password: 'password123',
          role: 'Student'
        });

        console.log('User created:', user.userID);
      }

      student = await Student.create({
        user: user._id,
        fullName: 'Nunuyat Getamesy',
        studentID: user.userID,
        year: 1,
        department: 'Undecided',
        isFreshman: true,
        gender: 'Female',
        sponsorship: 'Government',
        city: 'Outside Addis',
        phoneNumber: '0911223344'
      });
      console.log('Student created as freshman');
    } else {
      student.isFreshman = true;
      student.department = 'Undecided';
      await student.save();
      console.log('Existing student Nunuyat Getamesy updated to Freshman status');
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding:', err);
    process.exit(1);
  }
}

seedFreshman();
