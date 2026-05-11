import { useState, useEffect } from 'react';
import building from '../assets/Student_Dashboard/building.png';
import studentApi from '../api/studentApi';
import {
  FaCalendarAlt,
  FaPlus,
  FaEnvelope,
  FaLightbulb,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkerAlt,
  FaCheck,
  FaCircle,
  FaTrash,
  FaEdit,
  FaVenus,
  FaUser,
  FaCheckCircle
} from 'react-icons/fa';
import DashboardLayout from '../components/dashboard/Students/DashboardLayout';
import authApi from '../api/authApi';

export default function RoomDetails() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [proctor, setProctor] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMoreDormmates, setShowMoreDormmates] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Waste Management', assignedTo: 'You', dueDate: 'Today', dueTime: '8:00 PM', completed: false, category: 'Sanitation' },
    { id: 2, title: 'Floor Sanitation', assignedTo: 'Sara', dueDate: 'Tomorrow', dueTime: '', completed: false, category: 'Cleaning' },
    { id: 3, title: 'Lavatory Care', assignedTo: 'Hanna', dueDate: 'Oct 28', dueTime: '10:00 AM', completed: true, category: 'Sanitation' }
  ]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: 'You', dueDate: '', dueTime: '' });

  useEffect(() => {
    fetchRoomDetails();
  }, []);

  const fetchRoomDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await studentApi.getRoomDetails();
      if (res.success) {
        setRoomData(res.roomData);
        setRoommates(res.roommates);
        setProctor(res.proctor);
      }
    } catch (err) {
      if (err.message === 'No room assigned yet') {
        setRoomData(null);
      } else {
        setError(err.message || 'Failed to load room details');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFloorSuffix = (floor) => {
    const f = parseInt(floor);
    if (isNaN(f)) return '';
    const j = f % 10, k = f % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const userData = roomData ? {
    block: roomData.building || 'N/A',
    campus: (roomData.campus || 'Main') + ' Campus',
    room: roomData.roomNumber || 'N/A',
    floor: roomData.floor + getFloorSuffix(roomData.floor) + ' Floor',
    status: roomData.status || 'Active'
  } : {
    block: 'Not Assigned',
    campus: 'Main Campus',
    room: 'TBD',
    floor: 'Pending',
    status: 'Inactive'
  };

  const handleTaskToggle = (taskId) => {
    setTasks(tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Syncing Residency Data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Residency"
      breadcrumbs={[{ label: 'Portal', path: '/student-portal' }, { label: 'Room Intelligence' }]}
    >
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        {/* Room Identity Hero */}
        <section className="relative overflow-hidden rounded-[3rem] bg-slate-900 min-h-[350px] flex items-center p-8 sm:p-16 shadow-2xl">
          <div className="absolute inset-0 opacity-40">
            <img src={building} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
          </div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 backdrop-blur-md border border-white/10 rounded-full">
                <FaCheckCircle className="text-emerald-400 w-3 h-3" />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Verified Residency</span>
              </div>
              <div>
                <h1 className="text-6xl sm:text-8xl font-black text-white tracking-tighter mb-2">
                  {userData.room}
                </h1>
                <p className="text-xl text-blue-200 font-bold tracking-tight">{userData.floor}</p>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <FaBuilding className="text-white/40 w-5 h-5" />
                  <span className="text-white font-bold">{userData.block}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-white/40 w-5 h-5" />
                  <span className="text-white font-bold">{userData.campus}</span>
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex justify-end">
              <div className="glass-effect rounded-3xl p-8 border border-white/10 backdrop-blur-3xl w-full max-w-sm">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6">Occupancy Map</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm font-bold">Total Capacity</span>
                    <span className="text-white font-black">4 Slots</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-premium-gradient w-[75%] rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-blue-300">
                    <span>3 Residents</span>
                    <span>1 Vacant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content: Roommates & Tasks */}
          <div className="lg:col-span-8 space-y-10">
            {/* Roommates Grid */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Roommate Collective</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{roommates.length + 1} Members</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roommates.map((mate, idx) => (
                  <div key={idx} className="glass-effect rounded-3xl p-6 border border-slate-100 hover:shadow-xl hover-lift transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-premium-gradient flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                        {mate.hasProfile ? mate.name.charAt(0) : <FaUser className="w-6 h-6 opacity-40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-base font-black text-slate-900 truncate">{mate.name || "Vacant Slot"}</h4>
                          {mate.hasProfile && <FaCheckCircle className="text-emerald-500 w-3 h-3" />}
                        </div>
                        <p className="text-xs text-slate-500 font-bold truncate">{mate.major || "Educational Track"} • {mate.year || "Year"}</p>
                        <div className="mt-3 flex items-center gap-2">
                           <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded-md text-slate-500">Slot {mate.slot}</span>
                           {mate.hasProfile && (
                             <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                               <FaEnvelope className="w-3 h-3" />
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Tasks & Sanitation */}
            <section className="glass-effect rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/40">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <FaLightbulb className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Task Protocol</h3>
                    <p className="text-xs font-bold text-slate-400">Collaboration for Room {userData.room}</p>
                  </div>
                </div>
                <button onClick={() => setShowTaskForm(!showTaskForm)} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                  <FaPlus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${task.completed ? 'bg-slate-50/50 border-slate-100 grayscale opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
                    <button 
                      onClick={() => handleTaskToggle(task.id)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-transparent border-2 border-slate-200 hover:border-blue-400'}`}
                    >
                      <FaCheck className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{task.category}</span>
                         <span className="text-[10px] font-bold text-slate-400">Due {task.dueDate}</span>
                      </div>
                      <h4 className={`text-sm font-black ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned</p>
                       <div className="flex items-center gap-2 justify-end">
                         <span className="text-xs font-bold text-slate-700">{task.assignedTo}</span>
                         <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">
                           {task.assignedTo.charAt(0)}
                         </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Content */}
          <div className="lg:col-span-4 space-y-10">
            {/* Proctor Profile */}
            <section className="glass-effect rounded-[2.5rem] p-8 border border-white shadow-2xl shadow-blue-500/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10 text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full text-white text-[9px] font-black uppercase tracking-widest">
                  Authority Figure
                </div>
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 mx-auto border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                    <FaUser className="w-12 h-12 text-slate-300" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                    <FaCheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{proctor?.name || "No Supervisor"}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Campus Proctor</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-2">
                  <div className="flex justify-between text-[10px] font-black">
                    <span className="text-slate-400 uppercase">Verification</span>
                    <span className="text-emerald-600">CERTIFIED</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black">
                    <span className="text-slate-400 uppercase">Availability</span>
                    <span className="text-slate-800">8AM - 6PM</span>
                  </div>
                </div>
                <button className="w-full py-4 bg-premium-gradient text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-3">
                  <FaEnvelope className="w-4 h-4" />
                  Direct Message
                </button>
              </div>
            </section>

            {/* Quick Support Link */}
            <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
               <div className="absolute inset-0 bg-premium-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
               <div className="relative z-10">
                 <h3 className="text-lg font-black mb-2 flex items-center gap-3">
                   <FaWrench className="w-5 h-5 text-blue-400" />
                   Infrastructure Report
                 </h3>
                 <p className="text-xs text-white/60 font-medium leading-relaxed mb-6">
                   Something malfunctioning in your unit? Report it immediately to the facilities team.
                 </p>
                 <Link to="/maintenance" className="inline-flex items-center gap-2 text-sm font-black text-blue-400 hover:text-white transition-colors">
                   Open Maintenance Ticket <FaArrowRight className="w-3 h-3" />
                 </Link>
               </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}