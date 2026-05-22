const axios = require('axios');

(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      userId: 'UGR/0001/15',
      password: '0001'
    });
    console.log('login', loginRes.data);
    const token = loginRes.data.token;
    const dash = await axios.get('http://localhost:5000/api/students/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('dashboard', JSON.stringify(dash.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('status', err.response.status, 'data', err.response.data);
    } else {
      console.error('error', err.message);
    }
    process.exit(1);
  }
})();
