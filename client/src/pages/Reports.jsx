import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaDownload,
  FaUser,
  FaWrench,
  FaExclamationTriangle,
  FaCalendar,
  FaBuilding,
  FaChartPie,
  FaChartBar,
  FaPrint,
  FaFileCsv,
  FaMoneyBillWave,
  FaFilter,
  FaClock,
  FaChevronRight,
  FaSpinner,
  FaDatabase,
  FaFolder,
  FaSearch,
  FaCheckCircle,
  FaShieldAlt,
  FaUserGraduate
} from 'react-icons/fa';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import adminApi from '../api/adminApi';
import proctorApi from '../api/proctorApi';
import authApi from '../api/authApi';
import toast from 'react-hot-toast';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Data States
  const [overview, setOverview] = useState(null);
  const [trendSeries, setTrendSeries] = useState([]);
  const [students, setStudents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [proctorReports, setProctorReports] = useState([]);

  // Multivariable Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('All');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [selectedYearFilter, setSelectedYearFilter] = useState('All');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState('All');
  const [chartDays, setChartDays] = useState(30);

  // Print Mode State
  const [isPrintMode, setIsPrintMode] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const user = authApi.getCurrentUser();
        if (!user) return;
        setCurrentUser(user);
        setRole(user.role);

        const isSuperAdmin = user.role === 'SuperAdmin';
        const isAdmin = user.role === 'Admin' || user.role === 'CampusAdmin' || isSuperAdmin;
        const apiSource = isAdmin ? adminApi : proctorApi;

        // Fetch fundamental stats & series
        const [overviewData, seriesData] = await Promise.all([
          apiSource.overview ? apiSource.overview() : apiSource.getOverview(),
          apiSource.reports ? apiSource.reports(chartDays) : apiSource.getReports(chartDays)
        ]);

        if (!alive) return;
        setOverview(overviewData);
        setTrendSeries(seriesData?.data || []);

        // Context-specific advanced details for exports & custom lists
        if (isAdmin) {
          const [studentsRes, buildingsRes, proctorReportsRes] = await Promise.all([
            adminApi.students().catch(() => ({ data: [] })),
            adminApi.buildings().catch(() => ({ data: [] })),
            adminApi.getProctorReports().catch(() => ({ reports: [] }))
          ]);
          if (!alive) return;
          setStudents(studentsRes?.data || []);
          setBuildings(buildingsRes?.data || []);
          setProctorReports(proctorReportsRes?.reports || []);
        } else if (user.role === 'Proctor') {
          const proctorStudentsRes = await proctorApi.getStudents().catch(() => ({ data: [] }));
          if (!alive) return;
          setStudents(proctorStudentsRes?.data || []);
        }
      } catch (err) {
        console.error('Failed to load reporting suite data:', err);
        toast.error('Failed to sync intelligence dashboards');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [chartDays]);

  // Extract unique departments for multivariable filtering drop-down
  const departments = useMemo(() => {
    const depts = new Set();
    students.forEach((s) => {
      if (s.department) depts.add(s.department);
    });
    return Array.from(depts).sort();
  }, [students]);

  // Extract unique campuses
  const campuses = useMemo(() => {
    const camps = new Set();
    students.forEach((s) => {
      if (s.campus) camps.add(s.campus);
      else if (s.user?.campus) camps.add(s.user.campus);
    });
    // add default fallbacks if empty
    if (camps.size === 0) {
      return ['5 Kilo', '6 Kilo', 'Lideta', 'Main Campus'];
    }
    return Array.from(camps).sort();
  }, [students]);

  // Extract unique buildings
  const buildingFilterOptions = useMemo(() => {
    if (role === 'Proctor') {
      return []; // Proctors only see their assigned building anyway
    }
    const bOptions = new Set();
    buildings.forEach((b) => {
      if (b.name) bOptions.add(b.name);
    });
    students.forEach((s) => {
      if (s.building) bOptions.add(s.building);
    });
    return Array.from(bOptions).sort();
  }, [buildings, students, role]);

  // Apply Multivariable Filter & Search logic to Student database
  const filteredStudentsList = useMemo(() => {
    return students.filter((s) => {
      const name = s.fullName || s.user?.name || '';
      const sid = s.studentID || s.user?.userID || '';
      const dept = s.department || '';
      
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.toLowerCase().includes(searchTerm.toLowerCase());

      const sBuilding = s.building || s.assignedBuilding?.name || '';
      const matchesBuilding =
        selectedBuildingFilter === 'All' || sBuilding === selectedBuildingFilter;

      const sGender = s.gender || s.user?.gender || '';
      const matchesGender =
        selectedGenderFilter === 'All' || sGender.toLowerCase() === selectedGenderFilter.toLowerCase();

      const matchesDept =
        selectedDeptFilter === 'All' || dept === selectedDeptFilter;

      const matchesYear =
        selectedYearFilter === 'All' || String(s.year) === selectedYearFilter;

      const sCampus = s.campus || s.user?.campus || '';
      const matchesCampus =
        selectedCampusFilter === 'All' || sCampus === selectedCampusFilter;

      return matchesSearch && matchesBuilding && matchesGender && matchesDept && matchesYear && matchesCampus;
    });
  }, [students, searchTerm, selectedBuildingFilter, selectedGenderFilter, selectedDeptFilter, selectedYearFilter, selectedCampusFilter]);

  // Dynamic Chart Calculations based on active database
  const chartsData = useMemo(() => {
    // 1. Gender distribution in active student list
    let maleCount = 0;
    let femaleCount = 0;
    filteredStudentsList.forEach((s) => {
      const g = s.gender || s.user?.gender || '';
      if (g.toLowerCase() === 'female') femaleCount++;
      else maleCount++;
    });

    const genderComposition = [
      { name: 'Male Students', value: maleCount, color: '#4f46e5' },
      { name: 'Female Students', value: femaleCount, color: '#ec4899' }
    ];

    // 2. Department-wise count distribution
    const deptMap = {};
    filteredStudentsList.forEach((s) => {
      const d = s.department || 'Undecided';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });
    const departmentDistribution = Object.keys(deptMap).map((d) => ({
      name: d,
      students: deptMap[d]
    })).sort((a, b) => b.students - a.students).slice(0, 8); // Top 8 departments

    // 3. Building occupancies for Admin Bar Chart
    const buildingOccupancyData = (overview?.buildings || []).map((b) => ({
      name: b.name || `Building ${b.buildingID}`,
      'Occupancy Rate (%)': b.occupancy || 0
    }));

    return {
      genderComposition,
      departmentDistribution,
      buildingOccupancyData
    };
  }, [filteredStudentsList, overview]);

  // CSV EXPORTER TOOL IMPLEMENTATION
  const exportToCSV = (dataType) => {
    let csvContent = '';
    let filename = '';

    if (dataType === 'occupancy') {
      const headers = ['Full Name', 'Student ID', 'Gender', 'Department', 'Year', 'Building', 'Room No', 'Campus'];
      const rows = filteredStudentsList.map((s) => [
        s.fullName || s.user?.name || 'N/A',
        s.studentID || s.user?.userID || 'N/A',
        s.gender || s.user?.gender || 'N/A',
        s.department || 'Undecided',
        s.year || 'N/A',
        s.building || 'N/A',
        s.roomNumber || 'N/A',
        s.campus || s.user?.campus || 'Main Campus'
      ]);
      
      csvContent = [headers, ...rows].map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      filename = `odms_occupancy_report_${new Date().toISOString().slice(0, 10)}.csv`;
    } 
    else if (dataType === 'maintenance') {
      // Create summary logs from recent activity or global lists
      const headers = ['Action/Title', 'Description', 'Campus/Building', 'Date Logged', 'Status'];
      const rows = (overview?.recentActivity || [])
        .filter(act => act.action?.toLowerCase().includes('maintenance') || act.description?.toLowerCase().includes('maintenance'))
        .map(act => [
          act.action || 'N/A',
          act.description || 'N/A',
          act.campus || 'Global',
          new Date(act.createdAt).toLocaleDateString(),
          'Logged'
        ]);

      csvContent = [headers, ...rows].map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      filename = `odms_maintenance_report_${new Date().toISOString().slice(0, 10)}.csv`;
    }
    else if (dataType === 'financials' && role === 'SuperAdmin') {
      const headers = ['Transaction Reference', 'Student Name', 'Student ID', 'Fee Amount (ETB)', 'Currency', 'Payment Status', 'Timestamp'];
      const rows = (overview?.recentTransactionsList || []).map((t) => [
        t.tx_ref || 'N/A',
        t.studentName || 'N/A',
        t.studentID || 'N/A',
        t.amount || 0,
        t.currency || 'ETB',
        t.status || 'Pending',
        new Date(t.createdAt).toLocaleString()
      ]);

      csvContent = [headers, ...rows].map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      filename = `odms_financial_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    if (!csvContent) {
      toast.error('No record logs to compile into spreadsheet');
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename} successfully!`);
  };

  // PRINT / PDF REPORT GENERATOR TOOL
  const triggerPrintMode = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  // Define tailored view properties by role
  const roleDisplay = useMemo(() => {
    if (role === 'SuperAdmin') {
      return {
        title: 'Executive System Analytics',
        badge: 'Super Admin Command HQ',
        subtitle: 'Global cross-campus intelligence summaries, payment transaction metrics, and full student directories.'
      };
    } else if (role === 'Admin' || role === 'CampusAdmin') {
      return {
        title: 'Campus Operational Performance',
        badge: 'Campus Admin HQ',
        subtitle: 'Detailed occupancy logs, building analytics, local maintenance, and student statistics for this regional sector.'
      };
    } else if (role === 'Proctor') {
      return {
        title: 'Block Logistics & Dormitory Audit',
        badge: 'Proctor Terminal',
        subtitle: 'Building-specific statistics, resident registers, room occupancies, and recent activity trackers.'
      };
    }
    return {
      title: 'Dormitory System Audit',
      badge: 'Secure Log',
      subtitle: 'Official operational data reports.'
    };
  }, [role]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] bg-slate-50 dark:bg-slate-900 transition-colors">
        <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-wider text-xs animate-pulse">Assembling Intelligence Module...</p>
      </div>
    );
  }

  return (
    <main className={`flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 transition-all bg-[#f8fafc] dark:bg-slate-950 ${isPrintMode ? 'p-0 bg-white dark:bg-white text-black' : ''}`}>
      
      {/* 4. PRINT REPORT CARD (ONLY VISIBLE ON PRINT MODAL VIEWS) */}
      {isPrintMode && (
        <div className="hidden print:block w-full border-b border-double border-slate-300 pb-6 mb-8 text-black bg-white">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">Addis Ababa University</h1>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Online Dormitory Management System (ODMS)</p>
              <p className="text-xs text-slate-500 font-medium">Official Administrative Performance & Audit Statement</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-black bg-slate-900 text-white px-3 py-1 rounded uppercase tracking-wider">{roleDisplay.badge}</span>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">Date Compiled: {new Date().toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 font-mono">Operator ID: {currentUser?.userID || 'N/A'}</p>
            </div>
          </div>
          <div className="bg-slate-100 border border-slate-200 p-4 rounded-lg flex items-center justify-between text-xs font-bold text-slate-700">
            <div>Sector Campus: <span className="text-slate-950">{currentUser?.campus || 'Global Campus'}</span></div>
            <div>Occupancy Rate: <span className="text-slate-950">{overview?.stats?.occupancyRate || 0}%</span></div>
            <div>Total Residents Tracked: <span className="text-slate-950">{filteredStudentsList.length}</span></div>
          </div>
        </div>
      )}

      {/* Main UI Header */}
      {!isPrintMode && (
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {roleDisplay.badge}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Intel Feed</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">{roleDisplay.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-medium">{roleDisplay.subtitle}</p>
          </div>
          
          {/* Action buttons (Print and Back) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={triggerPrintMode}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-sm"
            >
              <FaPrint className="w-3.5 h-3.5 text-indigo-500" />
              Print PDF Report
            </button>
            <Link 
              to={role === 'Proctor' ? '/proctor/dashboard' : role === 'SuperAdmin' ? '/super-admin/dashboard' : '/dashboard'} 
              className="px-5 py-3 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-md shadow-slate-200 dark:shadow-none"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${isPrintMode ? 'grid-cols-4 gap-2 mb-4' : ''}`}>
        
        {/* KPI: Residents / Occupants */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-all group duration-300">
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Occupants</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {role === 'Proctor' ? overview?.stats?.students || 0 : overview?.stats?.students || 0}
            </h3>
            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider mt-1.5 inline-block">Registered in Directory</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FaUser className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        {/* KPI: Global/Block Occupancy Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-all group duration-300">
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Dorm Occupancy Rate</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.stats?.occupancyRate || 0}%
            </h3>
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider mt-1.5 inline-block">Capacity Utilization</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FaBuilding className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* KPI: Active Infrastructure Maintenance */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-all group duration-300">
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Active Maintenance</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {overview?.stats?.activeMaintenance || 0}
            </h3>
            <span className="text-[10px] text-orange-500 dark:text-orange-400 font-bold uppercase tracking-wider mt-1.5 inline-block">Pending Review</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FaWrench className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        {/* KPI: Pending Complaints OR SuperAdmin Financial Revenue */}
        {role === 'SuperAdmin' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-all group duration-300">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Fee Receipts Collection</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.financialStats?.totalRevenue ? `${overview.financialStats.totalRevenue.toLocaleString()} ETB` : '0 ETB'}
              </h3>
              <span className="text-[10px] text-violet-500 dark:text-violet-400 font-bold uppercase tracking-wider mt-1.5 inline-block">
                {overview?.financialStats?.countSuccess || 0} Success Transactions
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaMoneyBillWave className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-all group duration-300">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Active Complaints</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.stats?.openComplaints || 0}
              </h3>
              <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider mt-1.5 inline-block">Unresolved Student Issues</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaExclamationTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        )}
      </div>

      {/* 2. INTERACTIVE CHARTING SUITE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Trend Series Analysis Over Time */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaClock className="text-indigo-500" /> System Activity Trends
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Timeline analysis of incoming applications, maintenance, and student concerns</p>
            </div>
            
            {!isPrintMode && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setChartDays(days)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                      chartDays === days 
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '15px' }} />
                <Line name="Placements" type="monotone" dataKey="applications" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line name="Maintenance" type="monotone" dataKey="maintenance" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line name="Complaints" type="monotone" dataKey="complaints" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line name="Clearances" type="monotone" dataKey="exitClearance" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Demographics and Sector Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <FaChartPie className="text-pink-500" /> Resident Composition
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Gender balance in the filtered student directory</p>
          </div>

          <div className="h-48 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={chartsData.genderComposition}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartsData.genderComposition.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Centered label */}
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{filteredStudentsList.length}</span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Residents</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {chartsData.genderComposition.map((g, idx) => (
              <div key={idx} className="flex justify-between items-center px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{g.name}</span>
                </div>
                <span className="text-slate-900 dark:text-white">{g.value} ({filteredStudentsList.length > 0 ? Math.round((g.value / filteredStudentsList.length) * 100) : 0}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Building-wise Occupancy comparison (Only shown to Admin & SuperAdmin) */}
      {(role === 'Admin' || role === 'CampusAdmin' || role === 'SuperAdmin') && chartsData.buildingOccupancyData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm mb-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <FaChartBar className="text-indigo-500" /> Building Capacity Comparison
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Percentage occupancy utilization across active dormitory blocks</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartsData.buildingOccupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis unit="%" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="Occupancy Rate (%)" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40}>
                  {(overview?.buildings || []).map((entry, index) => {
                    const color = entry.occupancy > 90 ? '#ef4444' : entry.occupancy > 70 ? '#f59e0b' : '#10b981';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 1. MULTIVARIABLE FILTER & SEARCH ENGINE */}
      {!isPrintMode && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FaFilter className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Multivariable Operational Filter Suite</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Refine search entries and exports across multiple indices simultaneously</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Search input */}
            <div className="relative lg:col-span-1">
              <FaSearch className="w-3.5 h-3.5 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, ID, dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 border border-slate-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Building filter */}
            {role !== 'Proctor' && (
              <div className="relative">
                <select
                  value={selectedBuildingFilter}
                  onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All">All Buildings</option>
                  {buildingFilterOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Campus filter (SuperAdmin only) */}
            {role === 'SuperAdmin' && (
              <div className="relative">
                <select
                  value={selectedCampusFilter}
                  onChange={(e) => setSelectedCampusFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All">All Campuses</option>
                  {campuses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender filter */}
            <div className="relative">
              <select
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Department filter */}
            <div className="relative">
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Year filter */}
            <div className="relative">
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Years</option>
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      )}

      {/* 3. CSV EXPORTS TOOL PANEL */}
      {!isPrintMode && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaFileCsv className="text-emerald-500 w-5 h-5" /> Spreadsheets & Data Exports Toolkit
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Download standard CSV tables optimized for Excel/Google Sheets processing</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => exportToCSV('occupancy')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <FaDownload className="w-3" />
              Export Resident Log (CSV)
            </button>
            <button
              onClick={() => exportToCSV('maintenance')}
              className="inline-flex items-center gap-2 px-5 py-3 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <FaDownload className="w-3" />
              Export Maintenance Log (CSV)
            </button>
            {role === 'SuperAdmin' && (
              <button
                onClick={() => exportToCSV('financials')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <FaDownload className="w-3" />
                Export Payments Log (CSV)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Student Directory Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-8">
        
        {/* Table header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaUserGraduate className="text-indigo-500" /> Active Student Database Log
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-505">
              Showing {filteredStudentsList.length} of {students.length} recorded entries matching active filters.
            </p>
          </div>
        </div>

        {/* Scrollable table viewport */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Student Info</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Department & Year</th>
                <th className="px-6 py-4">Building & Room</th>
                <th className="px-6 py-4">Sponsorship</th>
                <th className="px-6 py-4">Campus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudentsList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <FaFolder className="w-8 h-8 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                    <p className="font-bold text-xs uppercase tracking-widest">No resident directories compiled</p>
                    <p className="text-[10px] text-slate-400 mt-1">Try adjusting the filter configurations above</p>
                  </td>
                </tr>
              ) : (
                filteredStudentsList.map((s, idx) => {
                  const sBuilding = s.building || s.assignedBuilding?.name || 'Unassigned';
                  const sRoom = s.roomNumber || 'N/A';
                  const sCampus = s.campus || s.user?.campus || 'Main Campus';
                  
                  return (
                    <tr key={s._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 dark:text-white">{s.fullName || s.user?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.studentID || s.user?.userID || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          (s.gender || s.user?.gender || '').toLowerCase() === 'female' 
                            ? 'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400' 
                            : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {s.gender || s.user?.gender || 'Male'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 dark:text-slate-300">{s.department || 'Undecided'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Year {s.year || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-300">
                        {sBuilding} <span className="text-slate-400 text-xs font-mono ml-1">#Room {sRoom}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          s.sponsorship === 'Self-Sponsored'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}>
                          {s.sponsorship || 'Government'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">
                        {sCampus}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Transactions Registry (Only visible to SuperAdmin) */}
      {role === 'SuperAdmin' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-8">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaMoneyBillWave className="text-violet-500" /> Recent Chapa Payment Statements
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-505">
                Audit transactions compiled through online portals.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Transaction Ref</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(overview?.recentTransactionsList || []).length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                      No financial logs generated yet.
                    </td>
                  </tr>
                ) : (
                  (overview?.recentTransactionsList || []).map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-black font-mono text-slate-800 dark:text-slate-200">
                        {tx.tx_ref}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white">{tx.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.studentID}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                        {tx.amount?.toLocaleString()} {tx.currency || 'ETB'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          tx.status === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : tx.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                        }`}>
                          {tx.status === 'success' && <FaCheckCircle className="w-2.5 h-2.5" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Operational Activity Logs (Accountability Tracker) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaShieldAlt className="text-indigo-500" /> Operational Accountability Logs
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-505">
              Live audit of administrative actions and status adjustments.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Logged Event</th>
                <th className="px-6 py-4">Action Summary</th>
                <th className="px-6 py-4">Campus Sector</th>
                <th className="px-6 py-4">Date Time</th>
                <th className="px-6 py-4">Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(overview?.recentActivity || []).length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    No active operations logged.
                  </td>
                </tr>
              ) : (
                (overview?.recentActivity || []).map((activity) => (
                  <tr key={activity._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800 dark:text-slate-200">
                      {activity.action}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">
                      {activity.description || 'Log entry compiled'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {activity.campus || 'Global HQ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">
                      {new Date(activity.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-500 font-mono">
                      [Verified]
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}
