const DormApplication = require('../models/DormApplication');
const Student = require('../models/Student');
const User = require('../models/User');
const Room = require('../models/Room');
const DormBuilding = require('../models/DormBuilding');
const Complaint = require('../models/Complaint');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const ExitClearance = require('../models/ExitClearance');
const Log = require('../models/Log');
const Transaction = require('../models/Transaction');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

exports.getOverview = async (req, res) => {
  try {
    const campusQuery = {};
    if (req.user && req.user.role === 'CampusAdmin') {
      campusQuery.campus = req.user.campus;
    }

    // Building table - Fetch buildings first so we can filter rooms by these buildings
    const buildings = await DormBuilding.find(campusQuery).sort({ name: 1 });
    const buildingIds = buildings.map(b => b._id);

    const [studentCount, roomCount, pendingApplicationsCount, openComplaints, activeMaintenance, pendingExit, pendingList] =
      await Promise.all([
        Student.countDocuments(),
        Room.countDocuments(req.user?.role === 'CampusAdmin' ? { building: { $in: buildingIds } } : {}),
        DormApplication.countDocuments({
          status: { $in: ['Pending', 'Under Review', 'Approved', 'PaymentPending'] },
        }),
        Complaint.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
        MaintenanceRequest.countDocuments({ status: { $in: ['Pending', 'In Progress'] } }),
        ExitClearance.countDocuments({ status: 'Pending' }),
        DormApplication.find({ status: { $in: ['Pending', 'Under Review'] } })
          .populate('student', 'fullName studentID department')
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

    // Occupancy = total current occupants / total capacity
    const roomQuery = req.user?.role === 'CampusAdmin' ? { building: { $in: buildingIds } } : {};
    const rooms = await Room.find(roomQuery).select('capacity currentOccupants building');
    const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const totalOccupants = rooms.reduce((sum, r) => sum + (r.currentOccupants || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;
    const buildingRows = buildings.map((b) => {
      const buildingRooms = rooms.filter((r) => r.building?.toString() === b._id.toString());
      const cap = buildingRooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
      const occ = buildingRooms.reduce((sum, r) => sum + (r.currentOccupants || 0), 0);
      const percent = cap > 0 ? Math.round((occ / cap) * 100) : 0;
      return {
        id: b._id.toString(),
        buildingID: b.buildingID,
        name: b.name,
        gender: b.gender,
        occupancy: percent
      };
    });

    const recent = await Log.find({}).sort({ createdAt: -1 }).limit(10);

    // SuperAdmin financial statistics calculation
    let financialStats = null;
    let recentTransactionsList = [];
    if (req.user && req.user.role === 'SuperAdmin') {
      const txs = await Transaction.find({}).populate({
        path: 'student',
        populate: { path: 'user', select: 'name userID' }
      }).sort({ createdAt: -1 });

      let totalRevenue = 0;
      let countSuccess = 0;
      let countPending = 0;
      let countFailed = 0;

      txs.forEach(tx => {
        if (tx.status === 'success') {
          totalRevenue += tx.amount;
          countSuccess++;
        } else if (tx.status === 'pending') {
          countPending++;
        } else if (tx.status === 'failed') {
          countFailed++;
        }
      });

      financialStats = {
        totalRevenue,
        countSuccess,
        countPending,
        countFailed,
        countTotal: txs.length
      };
      
      // limit to recent 10 transactions
      recentTransactionsList = txs.slice(0, 10).map(t => ({
        _id: t._id,
        studentName: t.student?.fullName || t.student?.user?.name || 'Unknown Student',
        studentID: t.student?.studentID || t.student?.user?.userID || 'N/A',
        amount: t.amount,
        currency: t.currency,
        tx_ref: t.tx_ref,
        status: t.status,
        createdAt: t.createdAt
      }));
    }

    return res.json({
      success: true,
      stats: {
        students: studentCount,
        rooms: roomCount,
        occupancyRate,
        pendingApplications: pendingApplicationsCount,
        openComplaints,
        activeMaintenance,
        pendingExit
      },
      buildings: buildingRows,
      recentActivity: recent,
      pendingApplicationsList: pendingList,
      financialStats,
      recentTransactionsList
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.listStudents = async (req, res) => {
  try {
    const students = await Student.find({})
      .populate('user', 'userID email name role')
      .sort({ createdAt: -1 })
      .limit(500);

    return res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    console.error('Admin students error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.listBuildings = async (req, res) => {
  try {
    const query = {};
    if (req.user && req.user.role === 'CampusAdmin') {
      query.campus = req.user.campus;
    }
    const buildings = await DormBuilding.find(query).sort({ name: 1 });
    return res.json({ success: true, count: buildings.length, data: buildings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.listProctors = async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'SuperAdmin') {
      // SuperAdmins only manage CampusAdmins across all campuses
      query = { role: 'CampusAdmin' };
    } else if (req.user.role === 'CampusAdmin') {
      // CampusAdmins manage local staff for their specific campus
      query = { 
        role: { $in: ['Proctor', 'EventPoster', 'Vendor'] },
        campus: req.user.campus 
      };
    } else {
      // Other roles shouldn't be listing staff (or see nothing)
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const proctors = await User.find(query).select('userID name email role campus gender assignedBuilding');
    return res.json({ success: true, count: proctors.length, data: proctors });
  } catch (err) {
    console.error('List proctors error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getReportSeries = async (req, res) => {
  try {
    const days = Math.max(7, Math.min(parseInt(req.query.days || '30', 10), 365));
    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const [apps, complaints, maintenance, exits] = await Promise.all([
      DormApplication.find({ createdAt: { $gte: start } }).select('createdAt'),
      Complaint.find({ createdAt: { $gte: start } }).select('createdAt'),
      MaintenanceRequest.find({ createdAt: { $gte: start } }).select('createdAt'),
      ExitClearance.find({ createdAt: { $gte: start } }).select('createdAt')
    ]);

    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, applications: 0, complaints: 0, maintenance: 0, exitClearance: 0 };
    }

    for (const x of apps) buckets[x.createdAt.toISOString().slice(0, 10)] && (buckets[x.createdAt.toISOString().slice(0, 10)].applications += 1);
    for (const x of complaints) buckets[x.createdAt.toISOString().slice(0, 10)] && (buckets[x.createdAt.toISOString().slice(0, 10)].complaints += 1);
    for (const x of maintenance) buckets[x.createdAt.toISOString().slice(0, 10)] && (buckets[x.createdAt.toISOString().slice(0, 10)].maintenance += 1);
    for (const x of exits) buckets[x.createdAt.toISOString().slice(0, 10)] && (buckets[x.createdAt.toISOString().slice(0, 10)].exitClearance += 1);

    return res.json({ success: true, days, data: Object.values(buckets) });
  } catch (err) {
    console.error('Admin report error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

