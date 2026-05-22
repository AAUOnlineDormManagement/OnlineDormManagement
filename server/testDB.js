const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find({ profilePicture: { $exists: true, $ne: null } }).select('userID profilePicture faceDescriptor');
  console.log('Users with profile pictures:');
  users.forEach(u => {
    console.log(`- ID: ${u.userID}, Pic: ${u.profilePicture}, FaceReg: ${!!(u.faceDescriptor && u.faceDescriptor.length === 128)}`);
  });
  process.exit(0);
}).catch(console.error);
