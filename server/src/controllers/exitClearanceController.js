const ExitClearance = require('../models/ExitClearance');
const Student = require('../models/Student');
const QRCode = require('qrcode');
const Proctor = require('../models/Proctor');
const Room = require('../models/Room');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

const requestExit = async (req, res) => {
    try {
        const { items, studentId } = req.body;
        let student;

        if (req.user.role === 'Proctor' || req.user.role === 'Admin') {
            if (!studentId) return res.status(400).json({ message: 'Student ID is required for administrative requests' });
            student = await Student.findById(studentId).populate('user');
        } else {
            student = await Student.findOne({ user: req.user._id }).populate('user');
        }

        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const clearance = new ExitClearance({
            student: student._id,
            items,
            status: 'Pending'
        });

        await clearance.save();

        // Notify proctors in the same building and of the same gender
        try {
            const studentRoom = await Room.findOne({ assignedStudents: student._id }).populate('building');
            if (studentRoom && studentRoom.building) {
                // Find all proctors in this building
                const proctorDocs = await Proctor.find({ assignedBuilding: studentRoom.building._id }).populate('user');

                // Filter proctors by the student's gender (based on their User profile)
                const targetProctors = proctorDocs.filter(p => p.user && p.user.gender === (student.user?.gender || student.gender));

                for (const proctorDoc of targetProctors) {
                    await createNotification({
                        user: proctorDoc.user._id,
                        type: 'ExitClearance',
                        title: 'New Exit Clearance Request',
                        message: `${student.user?.name || student.fullName} has requested exit clearance for Block ${studentRoom.building.name}, Room ${studentRoom.roomNumber}.`,
                        data: { clearanceId: clearance._id.toString(), studentId: student.user?.userID || student.studentID }
                    });
                }
            }
        } catch (notifErr) {
            console.error('Failed to notify proctor of exit request:', notifErr);
        }

        res.status(201).json({ message: 'Exit clearance requested successfully', clearance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getMyRequests = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const requests = await ExitClearance.find({ student: student._id }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getPendingRequests = async (req, res) => {
    try {
        // Check if user is a proctor
        const Proctor = require('../models/Proctor');
        const Room = require('../models/Room');
        const proctor = await Proctor.findOne({ user: req.user._id }).populate('assignedBuilding');

        let buildingId = proctor?.assignedBuilding?._id || proctor?.assignedBuilding;
        if (!buildingId && req.user.assignedBuilding) {
            buildingId = req.user.assignedBuilding;
        }

        let requests;

        if (buildingId) {
            // Filter by building and proctor gender
            const proctorUser = await User.findById(req.user._id);
            const proctorGender = proctorUser.gender;

            const allRequests = await ExitClearance.find({ status: 'Pending' })
                .populate({
                    path: 'student',
                    populate: { path: 'user', select: 'name userID gender' }
                })
                .sort({ createdAt: 1 });

            // Filter requests for students in proctor's building with same gender
            const authRequests = [];
            for (const clearance of allRequests) {
                const sGender = clearance.student?.user?.gender || clearance.student?.gender;
                if (clearance.student && sGender === proctorGender) {
                    const studentRoom = await Room.findOne({ assignedStudents: clearance.student._id })
                        .populate('building');
                    if (studentRoom && studentRoom.building &&
                        studentRoom.building._id.toString() === buildingId.toString()) {

                        // Add virtual fields for frontend convenience
                        const clearanceObj = clearance.toObject();
                        clearanceObj.roomNumber = studentRoom.roomNumber;
                        clearanceObj.buildingName = studentRoom.building.name;
                        clearanceObj.blockName = studentRoom.building.name;

                        authRequests.push(clearanceObj);
                    }
                }
            }
            requests = authRequests;
        } else {
            // Not a proctor or no building assigned - return all (for admin)
            requests = await ExitClearance.find({ status: 'Pending' })
                .populate({
                    path: 'student',
                    populate: { path: 'user', select: 'name userID gender' }
                })
                .sort({ createdAt: 1 });
        }

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const clearance = await ExitClearance.findById(id);

        if (!clearance) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (clearance.status !== 'Pending') {
            return res.status(400).json({ message: 'Request is already processed' });
        }

        // Check if user is a proctor
        let proctor = await Proctor.findOne({ user: req.user._id });
        let proctorBuilding = proctor?.assignedBuilding || req.user.assignedBuilding;

        if (!proctorBuilding) {
            return res.status(403).json({ message: 'Access denied. Proctor building not found.' });
        }

        // Find student's building
        const studentRoom = await Room.findOne({ assignedStudents: clearance.student });
        if (!studentRoom) {
            return res.status(404).json({ message: 'Student room assignment not found.' });
        }

        // Check if proctor is assigned to the student's building
        if (proctorBuilding.toString() !== studentRoom.building.toString()) {
            return res.status(403).json({ message: 'You can only approve requests for your assigned building.' });
        }

        // Find student's building (already declared studentRoom above, just update it with populate)
        const student = await Student.findById(clearance.student).populate('user');
        const studentRoomWithBuilding = await Room.findOne({ assignedStudents: student?._id }).populate('building');

        const itemList = clearance.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
        const campus = studentRoomWithBuilding?.building?.campus || 'Main';
        const department = student?.department || 'N/A';

        // USE STRICT JSON FORMAT AS REQUESTED (for scanning directly into card)
        const qrData = {
            name: student.user?.name || 'N/A',
            ugr: student.user?.userID || 'N/A',
            block: studentRoomWithBuilding?.building?.name || 'N/A',
            room: studentRoomWithBuilding?.roomNumber || 'N/A',
            items: clearance.items.map(item => `${item.name} (x${item.quantity})`),
            approved_date: new Date().toISOString().split('T')[0],
            id: clearance._id.toString() // Kept for server verification
        };

        // Debug step: Log the QR value before generating it
        console.log('--- GENERATING QR CODE PAYLOAD ---');
        console.log(qrData);
        console.log('----------------------------------');

        const qrText = JSON.stringify(qrData);

        const qrCodeUrl = await QRCode.toDataURL(qrText);
        clearance.qrPayload = qrText;
        clearance.status = 'Approved';
        clearance.qrCode = qrCodeUrl;
        clearance.approvalDate = new Date();
        clearance.proctor = req.user._id;

        await clearance.save();

        // Notify student with "stamp" (QR)
        if (student?.user) {
            await createNotification({
                user: student.user._id,
                type: 'ExitClearance',
                title: 'Exit clearance approved (Stamped)',
                message: 'Your exit clearance has been approved with the official AAU stamp. Use the QR code when exiting.',
                data: { clearanceId: clearance._id.toString(), qrCode: clearance.qrCode }
            });
        }

        const clearanceObj = clearance.toObject();
        clearanceObj.roomNumber = studentRoomWithBuilding.roomNumber;
        clearanceObj.buildingName = studentRoomWithBuilding.building.name;
        clearanceObj.blockName = studentRoomWithBuilding.building.name;

        res.json({ message: 'Request approved', clearance: clearanceObj });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const clearance = await ExitClearance.findById(id);

        if (!clearance) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (clearance.status !== 'Pending') {
            return res.status(400).json({ message: 'Request is already processed' });
        }

        clearance.status = 'Rejected';
        clearance.rejectionReason = rejectionReason;
        clearance.proctor = req.user._id;

        await clearance.save();

        const student = await Student.findById(clearance.student).populate('user');
        if (student?.user) {
            await createNotification({
                user: student.user,
                type: 'ExitClearance',
                title: 'Exit clearance rejected',
                message: `Your exit clearance request was rejected. ${rejectionReason || ''}`.trim(),
                data: { clearanceId: clearance._id.toString(), rejectionReason: rejectionReason || '' }
            });
        }

        res.json({ message: 'Request rejected', clearance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const verifyQR = async (req, res) => {
    try {
        let { qrPayload } = req.body;
        let id;

        // Debug: log incoming payload
        console.log('--- VERIFYING QR PAYLOAD ---');
        console.log('Payload type:', typeof qrPayload);
        console.log('Payload start:', qrPayload.substring(0, 50));
        console.log('---------------------------');

        // Primary: JSON format (Internal Scanner usage)
        if (qrPayload.startsWith('{')) {
            try {
                const parsedData = JSON.parse(qrPayload);
                id = parsedData.id || parsedData.ref;
            } catch (e) {
                console.error('JSON Parse Error in verifyQR:', e);
            }
        }

        // Fallback: Formatted Text format
        if (!id && qrPayload.includes('[AAU')) {
            const lines = qrPayload.split('\n');
            const refLine = lines.find(l => l.includes('REF: '));
            id = refLine ? refLine.split('REF: ')[1].trim() : null;
        }

        if (!id) return res.status(400).json({ message: 'Could not decode QR payload. Invalid format.' });

        const clearance = await ExitClearance.findById(id)
            .populate({ path: 'student', populate: { path: 'user', select: 'name userID gender year department' } })
            .populate({ path: 'proctor', select: 'name userID' });

        if (!clearance) {
            return res.status(404).json({ message: 'Clearance record not found' });
        }

        if (clearance.status !== 'Approved') {
            return res.status(400).json({ message: 'Clearance is not approved', valid: false });
        }

        // Fetch room/building details for display
        const student = clearance.student;
        const studentUser = student?.user || {};
        const studentRoom = await Room.findOne({ assignedStudents: student._id }).populate('building');

        const buildingName = studentRoom?.building?.name || 'N/A';
        const roomNumber = studentRoom?.roomNumber || 'N/A';
        const blockName = studentRoom?.building?.name || 'N/A';
        const department = student.department || studentUser.department || 'N/A';
        const year = student.year || 'N/A';
        const proctorName = (clearance.proctor && (clearance.proctor.name || clearance.proctor.userID)) || 'N/A';
        const approvalDate = clearance.approvalDate ? clearance.approvalDate.toLocaleString() : 'N/A';

        // Determine if client prefers HTML (scanner UI) or JSON (API)
        const wantsHtml = (req.headers.accept && req.headers.accept.includes('text/html')) || req.query.view === 'html' || req.body.format === 'html';

        if (wantsHtml) {
            // Basic XSS escaping
            const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            // Logo URL (can be configured via env var UNIVERSITY_LOGO_URL)
            const logoUrl = process.env.UNIVERSITY_LOGO_URL || '/uploads/logo.png';

            const itemsList = (clearance.items || []).map(it => `<li>${escapeHtml(it.name)} <span style="font-weight:600">x${escapeHtml(it.quantity)}</span></li>`).join('');

            const html = `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Exit Clearance</title>
    <style>
        body{font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;background:#f6f8fb;color:#0f172a;margin:0;padding:20px}
        .card{max-width:720px;margin:20px auto;padding:24px;background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(2,6,23,0.08)}
        .header{display:flex;align-items:center;gap:12px}
        .logo{width:56px;height:56px;border-radius:8px;background:#0ea5a9;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
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
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" class="logo-img" alt="logo"/>` : '<div class="logo">AAU</div>'}
            <div>
                <h1>Exit Clearance — ${escapeHtml(studentUser.name || student.fullName || 'Student')}</h1>
                <div class="meta">UGR: ${escapeHtml(studentUser.userID || student.studentID || 'N/A')} • ${escapeHtml(department)} • Year ${escapeHtml(year)}</div>
            </div>
        </div>

        <div class="grid">
            <div class="section">
                <strong>Accommodation</strong>
                <div>Block: ${escapeHtml(blockName)}</div>
                <div>Room: ${escapeHtml(roomNumber)}</div>
            </div>
            <div class="section">
                <strong>Approved By</strong>
                <div>${escapeHtml(proctorName)}</div>
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
            Show this screen to security when exiting. Clearance ID: ${escapeHtml(clearance._id.toString())}
        </div>
    </div>
</body>
</html>`;

            res.set('Content-Type', 'text/html').send(html);
            return;
        }

        // Default: JSON for API clients
        res.json({
            message: 'Valid Clearance',
            valid: true,
            student: clearance.student,
            items: clearance.items,
            approvalDate: clearance.approvalDate,
            proctor: clearance.proctor
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const clearance = await ExitClearance.findById(id);

        if (!clearance) {
            return res.status(404).json({ message: 'Request not found' });
        }

        res.json({ status: clearance.status, clearance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { items } = req.body;
        const student = await Student.findOne({ user: req.user._id });

        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const clearance = await ExitClearance.findOne({ _id: id, student: student._id });

        if (!clearance) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (clearance.status !== 'Pending') {
            return res.status(400).json({ message: 'Only pending requests can be updated' });
        }

        clearance.items = items;
        await clearance.save();

        res.json({ message: 'Request updated successfully', clearance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findOne({ user: req.user._id });

        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const clearance = await ExitClearance.findOneAndDelete({ _id: id, student: student._id, status: 'Pending' });

        if (!clearance) {
            return res.status(404).json({ message: 'Pending request not found or unauthorized' });
        }

        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    requestExit,
    getMyRequests,
    getPendingRequests,
    approveRequest,
    rejectRequest,
    verifyQR,
    getStatus,
    updateRequest,
    deleteRequest
};
