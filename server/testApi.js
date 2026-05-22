const mongoose = require('mongoose');
const { getProfilePicture } = require('./src/controllers/authController');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const req = {
    query: { userId: 'UGR/1111/15' },
    params: {}
  };
  const res = {
    status: (code) => ({
      json: (data) => {
        console.log('Status:', code, 'Data:', data);
      }
    }),
    json: (data) => {
      console.log('Data:', data);
    }
  };
  
  await getProfilePicture(req, res);
  process.exit(0);
}).catch(console.error);
