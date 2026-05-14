// server/scripts/seedStudentsFromCSV.js
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const Student = require('../src/models/Student');
const connectDB = require('../src/config/db');

dotenv.config({ path: path.join(__dirname, '../.env') });

const results = [];

fs.createReadStream(path.join(__dirname, 'students.csv'))
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    try {
      await connectDB();

      // Clear all students
      await User.deleteMany({ role: 'Student' });
      await Student.deleteMany({});
      console.log('Cleared existing student data');

      let successCount = 0;
      for (const s of results) {
        try {
          const ugr = String(s.ugr || '').trim();
          if (!ugr) continue;

          const year = parseInt(String(s.year || '').trim(), 10);
          const sponsorship = String(s.sponsorship || 'Government').trim();
          const department = String(s.department || '').trim();
          const isFreshman = department.toLowerCase().includes('freshman') || department === 'Undecided';

          // Set password to 1234 for testing as requested in recent contexts
          const hashedPassword = await bcrypt.hash('1234', 12);

          const user = await User.create({
            userID: ugr,
            name: String(s.fullName || '').trim(),
            email: String(s.email || '').trim().toLowerCase(),
            password: hashedPassword,
            role: 'Student',
            isFirstLogin: true,
          });

          await Student.create({
            user: user._id,
            studentID: ugr,
            fullName: String(s.fullName || '').trim(),
            year: Number.isNaN(year) ? 1 : year,
            department,
            gender: s.gender === 'Female' ? 'Female' : 'Male',
            sponsorship,
            isFreshman
          });

          successCount++;
          console.log(`Seeded: ${s.fullName} (${ugr})`);
        } catch (err) {
          console.log(`Skipped row for ${s.ugr}: ${err.message}`);
        }
      }

      console.log(`\nSuccessfully seeded ${successCount} students!`);
      console.log('Login Password for all students: 1234');
      process.exit(0);
    } catch (err) {
      console.error('Seeding failed:', err);
      process.exit(1);
    }
  });
