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
    { id: 1, title: 'Take out trash', assignedTo: 'You', dueDate: 'Today', dueTime: '8:00 PM', completed: false },
    { id: 2, title: 'Vacuum Floor', assignedTo: 'Sara', dueDate: 'Tomorrow', dueTime: '', completed: false },
    { id: 3, title: 'Clean Bathroom', assignedTo: 'Hanna', dueDate: 'Oct 28', dueTime: '10:00 AM', completed: true },
    { id: 4, title: 'Wipe Windows', assignedTo: 'You', dueDate: 'Oct 29', dueTime: '3:00 PM', completed: false }
  ]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    assignedTo: 'You',
    dueDate: '',
    dueTime: ''
  });

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
      // Don't treat "No room assigned yet" as a hard error UI-wise
      if (err.message === 'No room assigned yet') {
        setRoomData(null);
      } else {
        setError(err.message || 'Failed to load room details');
      }
    } finally {
      setLoading(false);
    }
  };

  const displayedDormmates = showMoreDormmates ? roommates : roommates.slice(0, 4);

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
    name: authApi.getCurrentUser()?.name || 'Student',
    block: roomData.building || 'N/A',
    campus: (roomData.campus || 'Main') + ' Campus',
    room: roomData.roomNumber || 'N/A',
    floor: roomData.floor + getFloorSuffix(roomData.floor) + ' Floor',
    status: roomData.status || 'Active'
  } : {
    block: 'Not Assigned',
    campus: 'Main Campus',
    room: 'TBD',
    floor: 'Pending Assignment',
    status: 'Pending'
  };

  // Calendar generation
  const generateCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const isToday = date.toDateString() === new Date().toDateString();
      const hasTask = [2, 5, 15, 20, 25].includes(i);
      days.push({
        date: i,
        isToday,
        hasTask,
        isSelected: selectedDate === i
      });
    }

    return days;
  };

  const calendarDays = generateCalendar();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleTaskToggle = (taskId) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleEditTask = (taskId) => {
    console.log('Edit task:', taskId);
  };

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      const newTaskObj = {
        id: tasks.length + 1,
        title: newTask.title,
        assignedTo: newTask.assignedTo,
        dueDate: newTask.dueDate || 'Today',
        dueTime: newTask.dueTime || '',
        completed: false
      };
      setTasks([...tasks, newTaskObj]);
      setNewTask({ title: '', assignedTo: 'You', dueDate: '', dueTime: '' });
      setShowTaskForm(false);
    }
  };

  const handleMonthChange = (direction) => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  return (
    <DashboardLayout
      title="Room Details"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: `Room ${userData.room}` }
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center">
          <p className="font-bold mb-2">Error</p>
          <p>{error}</p>
          <button onClick={fetchRoomDetails} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Dorm Assignment */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">My Dorm Assignment</h1>

              {/* Student Residence with Building Image */}
              <div className="relative rounded-lg mb-6 overflow-hidden h-48">
                <img
                  src={building}
                  alt="Student Residence Building"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Block Information */}
              <div className="mb-6">
                <h2 className="text-5xl font-bold text-slate-900 mb-2">{userData.block}</h2>
                <div className="flex items-center gap-2 text-slate-600">
                  <FaMapMarkerAlt className="w-4 h-4" />
                  <span className="text-sm">{userData.campus}, {userData.block}</span>
                </div>
              </div>

              {/* Assigned Room */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Assigned Room</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {userData.room} / {userData.floor}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
                  <FaCheck className="w-4 h-4" />
                  <span className="font-semibold">{userData.status}</span>
                </div>
              </div>
            </div>

            {/* Compact Real Calendar Schedule */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <FaCalendarAlt className="w-4 h-4 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Cleaning Schedule</h2>
              </div>
              <p className="text-xs text-slate-600 mb-3">Collaborative tasks for Room {userData.room}</p>

              {/* Compact Calendar Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <FaChevronLeft className="w-3 h-3 text-slate-600" />
                </button>
                <span className="text-sm font-semibold text-slate-700">
                  {monthNames[currentMonth].substring(0, 3)} {currentYear}
                </span>
                <button
                  onClick={() => handleMonthChange('next')}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <FaChevronRight className="w-3 h-3 text-slate-600" />
                </button>
              </div>

              {/* Compact Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                  <div key={day} className="text-center py-1">
                    <p className="text-xs font-medium text-slate-500 text-[10px]">{day}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`text-center p-1 rounded min-h-8 flex flex-col items-center justify-center cursor-pointer ${day === null
                      ? 'invisible'
                      : day.isSelected
                        ? 'bg-blue-600 text-white'
                        : day.isToday
                          ? 'bg-blue-100 text-blue-600'
                          : 'hover:bg-slate-100'
                      }`}
                    onClick={() => day && handleDateSelect(day.date)}
                  >
                    {day && (
                      <>
                        <p className={`text-xs font-medium ${day.isSelected ? 'text-white' :
                          day.isToday ? 'text-blue-600' :
                            'text-slate-700'
                          }`}>
                          {day.date}
                        </p>
                        {day.hasTask && (
                          <div className="w-1 h-1 mt-0.5 rounded-full bg-blue-500"></div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Compact Calendar Legend */}
              <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <span className="text-[10px] text-slate-600">Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-100"></div>
                  <span className="text-[10px] text-slate-600">Today</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] text-slate-600">Task</span>
                </div>
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Upcoming Tasks</h2>
              </div>

              <div className="space-y-3 mb-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <button
                      onClick={() => handleTaskToggle(task.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${task.completed
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-300'
                        }`}
                    >
                      {task.completed && <FaCheck className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Assigned to {task.assignedTo} • Due {task.dueDate} {task.dueTime && `• ${task.dueTime}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditTask(task.id)}
                        className="p-1 text-blue-600 hover:text-blue-700"
                        title="Edit task"
                      >
                        <FaEdit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Delete task"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Task Form */}
              {showTaskForm ? (
                <div className="mb-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <h3 className="font-medium text-slate-800 mb-3">Add New Task</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Task title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Due date (e.g., Tomorrow)"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Time (optional)"
                        value={newTask.dueTime}
                        onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowTaskForm(false)}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddTask}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                      >
                        Add Task
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Add New Task
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Dormmates */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaVenus className="w-4 h-4 text-pink-600" />
                  <h2 className="text-xl font-bold text-slate-900">Dormmates</h2>
                </div>
                <span className="text-sm text-slate-500">{roommates.filter(m => m.hasProfile).length}/{roommates.length + 1}</span>
              </div>

              <div className="space-y-4 mb-4">
                {displayedDormmates.map((mate) => (
                  <div key={mate.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    {mate.hasProfile ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                          <FaUser className="w-6 h-6 text-pink-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800 truncate">{mate.name}</p>
                            <button className="text-blue-600 hover:text-blue-700 flex-shrink-0">
                              <FaEnvelope className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-slate-600 truncate">{mate.major} • {mate.year}</p>
                          <p className="text-xs text-slate-500">Slot: {mate.slot}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <FaUser className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-500">Slot {mate.slot} is currently empty</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* View More Button */}
              {roommates.length > 4 && (
                <button
                  onClick={() => setShowMoreDormmates(!showMoreDormmates)}
                  className="w-full text-center py-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showMoreDormmates ? 'Show Less' : `View All ${roommates.length + 1} Roommates`}
                </button>
              )}
            </div>

            {/* Assigned Proctor */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaCheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Assigned Proctor</h2>
              </div>

              <div className="text-center mb-4">
                <div className="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-3 flex items-center justify-center">
                  <FaUser className="w-10 h-10 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-800">{proctor?.name || 'No Proctor Assigned'}</p>
                <p className="text-sm text-slate-600">{proctor?.role || 'N/A'} {proctor?.email && `• ${proctor.email}`}</p>
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <FaEnvelope className="w-4 h-4" />
                Send Message
              </button>
            </div>

            {/* Information Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FaLightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  If something in your room is broken, report it directly to facilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}