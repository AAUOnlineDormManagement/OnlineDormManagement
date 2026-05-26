const fs = require('fs');
const path = require('path');

// Sample data matching the clearance structure
const sample = {
    student: {
        user: { name: 'Belaynesh Getachew', userID: 'UGR/0001/15' },
        fullName: 'Belaynesh Getachew',
        studentID: 'UGR/0001/15',
        year: 3,
        department: 'Computer Science'
    },
    items: [
        { name: 'Laptop', quantity: 1 },
        { name: 'Backpack', quantity: 1 },
        { name: 'Textbooks', quantity: 3 }
    ],
    proctor: { name: 'Proctor A' },
    approvalDate: new Date(),
    _id: '642bfae1c8a3c9b1f0a12345'
};

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}

const itemsList = (sample.items || []).map(it => `<li>${escapeHtml(it.name)} <span style="font-weight:600">x${escapeHtml(it.quantity)}</span></li>`).join('');

const studentUser = sample.student.user || {};
const department = sample.student.department || studentUser.department || 'N/A';
const year = sample.student.year || 'N/A';
const approvalDate = sample.approvalDate ? sample.approvalDate.toLocaleString() : 'N/A';

// Try to find a logo in common locations and embed as data URI
const possibleLogos = [
    path.join(__dirname, '..', 'client', 'assets', 'logo', 'logo.png'),
    path.join(__dirname, '..', 'client', 'assets', 'logo', 'logo.jpg'),
    path.join(__dirname, '..', 'server', 'public', 'logo.png'),
    path.join(__dirname, 'logo.png'),
    path.join(__dirname, '..', 'public', 'logo.png')
];

let logoDataUri = null;
for (const p of possibleLogos) {
    try {
        if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            const ext = path.extname(p).slice(1).toLowerCase();
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext || 'png'}`;
            logoDataUri = `data:${mime};base64,${buf.toString('base64')}`;
            console.log('Using logo from', p);
            break;
        }
    } catch (e) { }
}

const logoHtml = logoDataUri ? `<img src="${logoDataUri}" class="logo-img" alt="logo"/>` : '<div class="logo">AAU</div>';

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Exit Clearance Preview</title>
  <style>
    body{font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;background:#f6f8fb;color:#0f172a;margin:0;padding:20px}
    .card{max-width:720px;margin:20px auto;padding:24px;background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(2,6,23,0.08)}
    .header{display:flex;align-items:center;gap:12px}
    .logo{width:56px;height:56px;border-radius:8px;background:#0ea5a9;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
    .logo-img{width:56px;height:56px;object-fit:cover;border-radius:8px}
    h1{margin:0;font-size:20px}
    .meta{color:#475569;margin-top:6px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
    .section{background:#f8fafc;padding:12px;border-radius:8px}
    ul{margin:0;padding-left:18px}
    .footer{margin-top:18px;color:#334155;font-size:13px}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${logoHtml}
      <div>
        <h1>Exit Clearance — ${escapeHtml(studentUser.name || sample.student.fullName || 'Student')}</h1>
        <div class="meta">UGR: ${escapeHtml(studentUser.userID || sample.student.studentID || 'N/A')} • ${escapeHtml(department)} • Year ${escapeHtml(year)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="section">
        <strong>Accommodation</strong>
        <div>Block: ${escapeHtml('Main Block')}</div>
        <div>Room: ${escapeHtml('101')}</div>
      </div>
      <div class="section">
        <strong>Approved By</strong>
        <div>${escapeHtml(sample.proctor.name)}</div>
        <div class="meta">Date: ${escapeHtml(approvalDate)}</div>
      </div>
    </div>

    <div style="margin-top:16px">
      <strong>Items</strong>
      <ul>
        ${itemsList || '<li>No items listed</li>'}
      </ul>
    </div>

    <div class="footer">
      Show this screen to security when exiting. Clearance ID: ${escapeHtml(sample._id)}
    </div>
  </div>
</body>
</html>`;

const outPath = path.join(__dirname, 'preview_exit_clearance.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Preview generated at', outPath);
