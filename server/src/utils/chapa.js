// src/utils/chapa.js
const axios = require('axios');

function buildPlacementReturnUrl() {
  const explicit = (process.env.CHAPA_RETURN_URL || '').trim();
  if (explicit) return explicit;

  // IMPORTANT: Chapa's servers redirect the student's browser AFTER payment.
  // The return_url must ALWAYS be a publicly accessible URL (never localhost).
  // localhost:5173 is only reachable from the student's own machine, not from Chapa's servers,
  // which causes Chrome's "Unsafe attempt to load URL" cross-origin error.
  const frontend = (process.env.FRONTEND_URL || 'https://aauonlinedormmanegement.vercel.app').trim().replace(/\/+$/, '');
  return `${frontend}/placement-request?payment=success`;
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

module.exports = { initializeChapaPayment };
