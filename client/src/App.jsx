import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Settings from './pages/Settings';
import PlacementRequestSimple from './pages/PlacementRequestSimple';
import AdminDashboard from './pages/AdminDashboard';
import StudentPortal from './pages/StudentPortal';
import ManageStudents from './pages/ManageStudents';
import StudentDetail from './pages/StudentDetail';
import Reports from './pages/Reports';
import OperationalReports from './pages/OperationalReports';
import ApplicationControl from './pages/ApplicationControl';
import ProctorePortal from './pages/Proctor/ProctoreDashboard';
import StudentMaintenance from './pages/Proctor/StudentMaintenance';
import StudentComplaints from './pages/Proctor/StudentComplaints';
import StudentList from './pages/Proctor/StudentList';
import StudentExitClearance from './pages/Proctor/StudentExitClearance';
import ProctorProfile from './pages/Proctor/ProctorProfile';

import ProctorSettings from './pages/Proctor/ProctorSettings';
import PublicScanner from './pages/PublicScanner';
import AssignBlocks from './pages/AssignBlocks';
import RoomDetails from './pages/RoomDetails';
import MaintenanceRequest from './pages/MaintenanceRequest';
import Complaints from './pages/Complaints';
import Profile from './pages/Profile';
import Notices from './pages/Notices';
import Events from './pages/Events';
import LostFound from './pages/LostFound';
import MarketPlace from './pages/MarketPlace';
import EventPostDashboard from './pages/EventPostDashboard';
import MarketplacePostDashboard from './pages/MarketplacePostDashboard';
import VendorDashboard from './pages/VendorDashboard';
import PublicEvents from './pages/PublicEvents';
import PublicLostFound from './pages/PublicLostFound';
import PublicMarketPlace from './pages/PublicMarketPlace';
import About from './pages/About';
import Help from './pages/Help';
import ExitClearance from './pages/ExitClearance';
import VerifyClearance from './pages/VerifyClearance';
import ReportLostItem from './pages/ReportLostItem';

import StaffManagement from './pages/StaffManagement';
import BuildingManagement from './pages/BuildingManagement';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Logout from './pages/Logout';
import SellerDashboard from './pages/SellerDashboard';
import EventPosterRequest from './pages/EventPosterRequest';
import VendorRegistration from './pages/VendorRegistration';
import AccessRequests from './pages/AccessRequests';

// Layout Components
import ProctorLayout from './components/layout/ProctorLayout';
import AdminLayout from './components/layout/AdminLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import SiteFooter from './components/common/SiteFooter';
import ThemeToggle from './components/common/ThemeToggle';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';

import './App.css';

function App() {
  useEffect(() => {
    if (window.top !== window) {
      window.top.location.href = window.location.href;
    }
  }, []);

  return (
    <ThemeProvider>
      <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Admin Routes with Layout */}
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/students" element={<ManageStudents />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/assign-blocks" element={<AssignBlocks />} />
          <Route path="/staff-management" element={<StaffManagement />} />
          <Route path="/building-management" element={<BuildingManagement />} />
          <Route path="/operational-reports" element={<OperationalReports />} />
          <Route path="/access-requests" element={<AccessRequests />} />
          <Route path="/application-control" element={<ApplicationControl />} />
          <Route path="/admin/profile" element={<Profile />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>

        {/* Super Admin Routes with Layout */}
        <Route element={<SuperAdminLayout />}>
          <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} /> {/* Fallback for older links */}
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/students" element={<ManageStudents />} />
          <Route path="/super-admin/students/:id" element={<StudentDetail />} />
          <Route path="/super-admin/proctors" element={<StaffManagement />} />
          <Route path="/super-admin/buildings" element={<BuildingManagement />} />
          <Route path="/super-admin/assign-blocks" element={<AssignBlocks />} />
          <Route path="/super-admin/reports" element={<Reports />} />
          <Route path="/super-admin/operational-reports" element={<OperationalReports />} />
          <Route path="/super-admin/access-requests" element={<AccessRequests />} />
          <Route path="/super-admin/application-control" element={<ApplicationControl />} />
          <Route path="/super-admin/profile" element={<Profile />} />
          <Route path="/super-admin/settings" element={<Settings />} />
        </Route>
        
        {/* Proctor Routes with Layout */}
        <Route path="/proctor" element={<ProctorLayout />}>
          <Route path="dashboard" element={<ProctorePortal />} />
          <Route path="student-list" element={<StudentList />} />
          <Route path="maintenance" element={<StudentMaintenance />} />
          <Route path="complaints" element={<StudentComplaints />} />
          <Route path="exit-clearance" element={<StudentExitClearance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="operational-reports" element={<OperationalReports />} />

          <Route path="profile" element={<ProctorProfile />} />
          <Route path="settings" element={<ProctorSettings />} />
        </Route>
        
        {/* Public Scanning Route (For Gate Security) */}
        <Route path="/v" element={<PublicScanner />} />
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="/apply-event-poster" element={<EventPosterRequest />} />
        <Route path="/register-vendor" element={<VendorRegistration />} />
        <Route path="/student-portal/exit-history" element={<ExitClearance />} />
        
        {/* Other Admin/Management Routes */}
        <Route path="/room-details" element={<RoomDetails />} />
        <Route path="/placement-request" element={<PlacementRequestSimple />} />
        
        {/* Public navbar routes */}
        <Route path="/events" element={<PublicEvents />} />
        <Route path="/marketplace" element={<PublicMarketPlace />} />
        <Route path="/lost-found" element={<PublicLostFound />} />

        {/* Dashboard / sidebar routes */}
        <Route path="/notices" element={<Notices />} />
        <Route path="/events-dashboard" element={<Events />} />
        <Route path="/events-post" element={<EventPostDashboard />} />
        <Route path="/marketplace-post" element={<MarketplacePostDashboard />} />
        <Route path="/vendor-dashboard" element={<VendorDashboard />} />
        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />
        <Route path="/maintenance" element={<MaintenanceRequest />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/exit-clearance" element={<ExitClearance />} />
        <Route path="/verify-clearance/:id" element={<VerifyClearance />} />
        <Route path="/lost-found-dashboard" element={<LostFound />} />

        <Route path="/report-lost-item" element={<ReportLostItem />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
      </Routes>
      <Toaster position="top-right" />
      <ThemeToggle />
      <SiteFooter />
      </Router>
    </ThemeProvider>
  );
}

export default App;