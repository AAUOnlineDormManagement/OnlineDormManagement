// scripts/seedStudentsEnhanced.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const DormBuilding = require('../src/models/DormBuilding');
const Room = require('../src/models/Room');

dotenv.config();

const seedStudents = async () => {
    try {
        await connectDB();
        console.log('🔌 Connected to MongoDB\n');

        console.log('🗑️  Clearing existing students...');
        await User.deleteMany({ role: 'Student' });
        await Student.deleteMany({});

        const buildings = await DormBuilding.find({});
        if (buildings.length === 0) {
            console.log('⚠️  No buildings found. Please run seedAdminsEnhanced.js first.');
            process.exit(1);
        }

        // Sample student data
        const maleNames = [
            'John Doe', 'Michael Brown', 'David Wilson', 'James Taylor', 'Robert Anderson',
            'William Thomas', 'Richard Jackson', 'Joseph White', 'Charles Harris', 'Daniel Martin',
            'Matthew Thompson', 'Anthony Garcia', 'Mark Martinez', 'Donald Robinson', 'Paul Clark',
            'Steven Rodriguez', 'Andrew Lewis', 'Joshua Lee', 'Kenneth Walker', 'Kevin Hall'
        ];

        const femaleNames = [
            'Sarah Johnson', 'Emily Davis', 'Jessica Miller', 'Ashley Moore', 'Amanda Jackson',
            'Melissa Taylor', 'Stephanie Anderson', 'Rebecca Thomas', 'Laura Martinez', 'Kimberly Garcia',
            'Michelle Wilson', 'Lisa Robinson', 'Nancy Clark', 'Karen Rodriguez', 'Betty Lewis',
            'Helen Lee', 'Sandra Walker', 'Donna Hall', 'Carol Allen', 'Ruth Young'
        ];

        const departments = [
            'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
            'Civil Engineering', 'Business Administration', 'Economics',
            'Biology', 'Chemistry', 'Physics', 'Mathematics'
        ];

        const years = [1, 2, 3, 4];

        const sponsorships = ['Government', 'Self-Sponsored'];

        let studentCount = 0;
        const studentsToCreate = 50; // Create 50 students

        console.log(`\n👨‍🎓 Creating ${studentsToCreate} students...\n`);

        // Create Ribka Muluye first as a specific test freshman
        const ribkaHashedPassword = await bcrypt.hash('1234', 12);
        const ribkaUser = await User.create({
            userID: 'UGR/111/15',
            name: 'Ribka Muluye',
            email: 'ribka@example.com',
            password: ribkaHashedPassword,
            role: 'Student',
            gender: 'Female',
            campus: 'Main Campus'
        });
        await Student.create({
            user: ribkaUser._id,
            studentID: 'UGR/111/15',
            fullName: 'Ribka Muluye',
            gender: 'Female',
            year: 1,
            department: 'Freshman',
            sponsorship: 'Government',
            isFreshman: true,
            phoneNumber: '0911223344'
        });

        console.log('   ✅ Created Test Student: Ribka Muluye (Freshman)');

        // Create Belaynesh Getachew as another specific test student
        const belayneshHashedPassword = await bcrypt.hash('1234', 12);
        const belayneshUser = await User.create({
            userID: 'UGR/0001/15',
            name: 'Belaynesh Getachew',
            email: 'belaynesh@example.com',
            password: belayneshHashedPassword,
            role: 'Student',
            gender: 'Female',
            campus: 'Main Campus'
        });
        await Student.create({
            user: belayneshUser._id,
            studentID: 'UGR/0001/15',
            fullName: 'Belaynesh Getachew',
            gender: 'Female',
            year: 5,
            department: 'Computer Science',
            sponsorship: 'Government',
            isFreshman: false,
            phoneNumber: '0911000001'
        });
        console.log('   ✅ Created Test Student: Belaynesh Getachew (UGR/0001/15)');

        for (let i = 0; i < studentsToCreate; i++) {

            const isMale = i % 2 === 0;
            const names = isMale ? maleNames : femaleNames;
            const name = names[i % names.length];
            const gender = isMale ? 'Male' : 'Female';

            // Find appropriate building based on gender
            const genderBuildings = buildings.filter(b => b.gender === gender);
            if (genderBuildings.length === 0) continue;

            const building = genderBuildings[i % genderBuildings.length];

            const studentID = `STU${String(2024001 + i).padStart(7, '0')}`;
            const email = `${studentID.toLowerCase()}@student.aau.edu.et`;
            const password = 'Student2026!';

            const hashedPassword = await bcrypt.hash(password, 12);

            // Create User
            const user = await User.create({
                userID: studentID,
                name: name,
                email: email,
                password: hashedPassword,
                role: 'Student',
                campus: building.campus || 'Main Campus'
            });

            // Create Student profile
            await Student.create({
                user: user._id,
                studentID: studentID,
                fullName: name,
                gender: gender,
                year: years[Math.floor(Math.random() * years.length)],
                department: departments[Math.floor(Math.random() * departments.length)],
                sponsorship: sponsorships[Math.floor(Math.random() * sponsorships.length)],
                dormBuilding: building._id,
                phoneNumber: `091${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`
            });

            studentCount++;
            if (studentCount % 10 === 0) {
                console.log(`   ✅ Created ${studentCount} students...`);
            }
        }

        console.log(`\n✨ Successfully created ${studentCount} students!`);
        console.log('\n🔑 Student Login Format:');
        console.log('   UserID: STU2024001 to STU2024050');
        console.log('   Password: Student2026!');
        console.log('\n📊 Distribution:');
        console.log(`   Male Students: ${Math.floor(studentCount / 2)}`);
        console.log(`   Female Students: ${Math.ceil(studentCount / 2)}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

seedStudents();
