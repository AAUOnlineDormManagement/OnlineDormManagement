// src/utils/chapa.js
const axios = require('axios');

function buildPlacementReturnUrl() {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const prodUrl = 'https://aauonlinedormmanegement.vercel.app';
  const explicit = (process.env.CHAPA_RETURN_URL || '').trim();
  
  // CRITICAL: If we are in production, we MUST use the production domain.
  // This prevents redirects to localhost which browsers block as "Unsafe".
  if (isProduction) {
    // If explicit is set and is NOT localhost, we can use it, otherwise force prodUrl
    if (explicit && !explicit.includes('localhost') && explicit.startsWith('https')) {
      return explicit;
    }
    return `${prodUrl}/placement-request?payment=success`;
  }

  // If not production, use explicit or fallback to FRONTEND_URL
  if (explicit) return explicit;

  const frontend = (process.env.FRONTEND_URL || prodUrl).trim().replace(/\/+$/, '');
  
  // Ensure the URL has a protocol
  const finalFrontend = frontend.startsWith('http') ? frontend : `https://${frontend}`;
  
  return `${finalFrontend}/placement-request?payment=success`;
}

function buildCallbackUrl() {
  const explicit = (process.env.CHAPA_CALLBACK_URL || '').trim();
  if (explicit) return explicit;

  const backend = (process.env.BACKEND_URL || '').trim().replace(/\/+$/, '');
  if (!backend) return '';
  return `${backend}/api/payment/webhook`;
}

const initializeChapaPayment = async (student, amount = 3000) => {
  const tx_ref = `dorm_${Date.now()}`;

  const payload = {
    amount: amount.toString(),
    currency: "ETB",
    email: student.user?.email || student.email || "student@aau.edu.et",
    first_name: (student.user?.name || student.fullName || "Student").split(' ')[0],
    last_name: (student.user?.name || student.fullName || "User").split(' ').slice(-1)[0] || "Student",
    tx_ref: tx_ref,
    title: "AAU Dormitory Fee",
    description: `Dorm fee for ${student.user?.name || student.fullName || 'Student'}`,
    callback_url: buildCallbackUrl(),
    return_url: buildPlacementReturnUrl(),
  };

  const response = await axios.post(
    'https://api.chapa.co/v1/transaction/initialize',
    payload,
    { 
      headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
      timeout: 10000 // 10 second timeout for Chapa
    }
  );

  return {
    tx_ref,
    checkout_url: response.data.data.checkout_url
  };
};

module.exports = { 
  initializeChapaPayment,
  buildPlacementReturnUrl 
};

