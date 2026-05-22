import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaChevronRight,
  FaUserGraduate,
  FaUserShield,
  FaRegEnvelope,
  FaRegBuilding,
  FaRegCalendarCheck,
  FaRegBell,
  FaRegClock,
  FaHome,
  FaTimes
} from 'react-icons/fa';
import { MdAdminPanelSettings, MdPrivacyTip, MdOutlineSecurity, MdFace } from 'react-icons/md';
import { FaFileContract } from 'react-icons/fa';
import authApi from '../api/authApi';
import logoImg from '../assets/logo/logo.png';
import FaceScannerModal from '../components/auth/FaceScannerModal';
import { getUploadBaseUrl } from '../utils/apiConfig';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ userId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  // Biometrics and UGR scanning states
  const [showUgrPrompt, setShowUgrPrompt] = useState(false);
  const [ugrInput, setUgrInput] = useState('');
  const [checkingUgr, setCheckingUgr] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [userIdForLogin, setUserIdForLogin] = useState('');
  const [promptError, setPromptError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.userId.trim()) {
      setError('Please enter your User ID / Student ID');
      return;
    }
    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.login(formData.userId.trim(), formData.password);
      const role = response.role || '';
      
      // Check for redirect parameter in URL
      const searchParams = new URLSearchParams(window.location.search);
      const customRedirect = searchParams.get('redirect');
      
      let redirectPath = customRedirect || '/';
      const roleDefaultRoute = (() => {
        switch (role) {
          case 'Student': return '/student-portal';
          case 'Proctor': return '/proctor/dashboard';
          case 'CampusAdmin': return '/dashboard';
          case 'SuperAdmin': return '/super-admin-dashboard';
          case 'EventPoster': return '/events-post';
          case 'Vendor': return '/vendor-dashboard';
          case 'MarketPlaceModerator': return '/marketplace-post';
          default: return '/';
        }
      })();

      const roleCanAccessRedirect = (targetPath) => {
        if (!targetPath) return false;
        if (targetPath.startsWith('/proctor')) return role === 'Proctor';
        if (targetPath.startsWith('/super-admin')) return role === 'SuperAdmin';
        if (targetPath.startsWith('/dashboard') || targetPath.startsWith('/students') || targetPath.startsWith('/reports')) {
          return role === 'CampusAdmin' || role === 'SuperAdmin';
        }
        if (targetPath.startsWith('/student-portal') || targetPath.startsWith('/placement-request')) return role === 'Student';
        return true;
      };
      
      if (!customRedirect) {

      switch (role) {
        case 'Student':
          redirectPath = '/student-portal';
          break;
        case 'Proctor':
          redirectPath = '/proctor/dashboard';
          break;
        case 'CampusAdmin':
          redirectPath = '/dashboard';
          break;
        case 'SuperAdmin':
          redirectPath = '/super-admin-dashboard';
          break;
        case 'EventPoster':
          redirectPath = '/events-post';
          break;
        case 'Vendor':
          redirectPath = '/vendor-dashboard';
          break;
        case 'MarketPlaceModerator':
          redirectPath = '/marketplace-post';
          break;
        default:
          if (formData.userId.toLowerCase().includes('ugr')) {
            redirectPath = '/student-portal';
          } else if (formData.userId.toLowerCase().includes('admin')) {
            redirectPath = '/dashboard';
          }
      }
    }

      // Prevent stale/foreign redirects (e.g. SuperAdmin redirected to /proctor/dashboard)
      if (customRedirect && !roleCanAccessRedirect(customRedirect)) {
        redirectPath = roleDefaultRoute;
      }

         // Force full page reload to ensure axios and all contexts pickup the new token properly
      window.location.href = redirectPath;
    } catch (err) {
      let errorMessage = 'Invalid User ID or Password. Please try again.';
      if (err.message?.includes('No response from server')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Face Recognition Login ──────────────────────────────────────────────────
  const handleFaceLoginStart = () => {
    setUgrInput(formData.userId || '');
    setPromptError('');
    setError('');
    setShowUgrPrompt(true);
  };

  const handleUgrSubmit = async (e) => {
    e.preventDefault();
    if (!ugrInput.trim()) {
      setPromptError('Please enter your User ID / Student ID.');
      return;
    }

    setCheckingUgr(true);
    setPromptError('');
    try {
      const response = await authApi.getProfilePicture(ugrInput.trim());
      if (response.success) {
        if (!response.faceRegistered && !response.profilePicture) {
          setPromptError('No profile picture or face biometrics registered. Please upload a profile picture in your settings first.');
          setCheckingUgr(false);
          return;
        }

        setUserIdForLogin(response.userID);

        if (response.profilePicture) {
          const uploadBase = getUploadBaseUrl();
          const profilePicPath = response.profilePicture;
          const fullUrl = `${uploadBase}/${profilePicPath.replace(/^\//, '')}`;
          setProfilePictureUrl(fullUrl);
        } else {
          setProfilePictureUrl(null);
        }

        setShowUgrPrompt(false);
        setShowFaceScanner(true);
      } else {
        setPromptError(response.message || 'User not found. Please check your User ID.');
      }
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message || err.message || 'User not found. Please check your User ID.';
      setPromptError(serverMsg);
    } finally {
      setCheckingUgr(false);
    }
  };

  const handleFaceScanComplete = async (descriptor) => {
    setShowFaceScanner(false);
    setFaceLoading(true);
    setError('');
    try {
      const response = await authApi.faceLogin(descriptor, userIdForLogin);
      const role = response.role || '';

      const searchParams = new URLSearchParams(window.location.search);
      const customRedirect = searchParams.get('redirect');
      let redirectPath = customRedirect || '/';

      if (!customRedirect) {
        switch (role) {
          case 'Student': redirectPath = '/student-portal'; break;
          case 'Proctor': redirectPath = '/proctor/dashboard'; break;
          case 'CampusAdmin': redirectPath = '/dashboard'; break;
          case 'SuperAdmin': redirectPath = '/super-admin-dashboard'; break;
          case 'EventPoster': redirectPath = '/events-post'; break;
          case 'Vendor': redirectPath = '/vendor-dashboard'; break;
          case 'MarketPlaceModerator': redirectPath = '/marketplace-post'; break;
          default: redirectPath = '/'; break;
        }
      }
      window.location.href = redirectPath;
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Face not recognized. Please try again or use password.';
      setError(serverMsg);
    } finally {
      setFaceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      {/* Simple Header */}
      <header className="w-full px-2 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo and Title - Left Side */}
          <div className="flex items-center gap-0">
            <img src={logoImg} alt="AAU Logo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Addis Ababa University
              </h1>
              <p className="text-xs text-slate-500">Online dormitory system</p>
            </div>
          </div>
          
          {/* Right Side - Home Button and Security Badge */}
          <div className="flex items-center gap-4">
            {/* Home Button with Blue Background */}
            <Link
              to="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 text-black font-medium shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-200"
            >
              <FaHome className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </Link>

            {/* Security Badge - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
              <MdOutlineSecurity className="w-4 h-4 text-blue-500" />
              <span>Secure Login</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Hero Section */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 leading-tight">
                Your Digital<br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Dormitory Experience
                </span>
              </h2>
              <p className="text-lg text-slate-600 max-w-md">
                Everything you need to manage your dorm life in one beautiful, 
                intuitive platform.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg shadow-blue-100/50 border border-white">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <FaRegCalendarCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800">Room Management</h3>
                <p className="text-sm text-slate-500 mt-1">View assignments & requests</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg shadow-indigo-100/50 border border-white">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                  <FaRegBell className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800">Real-time Updates</h3>
                <p className="text-sm text-slate-500 mt-1">Stay informed instantly</p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg shadow-purple-100/50 border border-white">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                  <FaRegClock className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-800">24/7 Support</h3>
                <p className="text-sm text-slate-500 mt-1">Always here to help</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <div className="bg-white rounded-3xl shadow-2xl shadow-blue-200/50 p-8 space-y-6 border border-white/50">
              {/* Welcome Header */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
                <p className="text-sm text-slate-500">
                  Please enter your credentials to access your account.
                </p>
              </div>

              {/* Role Indicators */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {[
                  { icon: FaUserGraduate, label: 'Student', color: 'blue' },
                  { icon: FaUserShield, label: 'Proctor', color: 'indigo' },
                  { icon: MdAdminPanelSettings, label: 'Admin', color: 'purple' }
                ].map((role, idx) => (
                  <div
                    key={idx}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <role.icon className={`w-3.5 h-3.5 text-${role.color}-500`} />
                    <span className="hidden sm:inline">{role.label}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* User ID Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="userId"
                    className="block text-sm font-medium text-slate-700"
                  >
                    User ID / Student ID
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <FaUserGraduate className="w-4 h-4" />
                    </div>
                    <input
                      id="userId"
                      name="userId"
                      type="text"
                      value={formData.userId}
                      onChange={handleInputChange}
                      autoComplete="username"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm bg-slate-50 focus:bg-white"
                      placeholder="e.g., UGR/0000/00"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <FaLock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="current-password"
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm bg-slate-50 focus:bg-white"
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <FaEyeSlash className="w-4 h-4" />
                      ) : (
                        <FaEye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-slate-600">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || faceLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to Dashboard</span>
                      <FaChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-xs text-slate-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                {/* Face Recognition Login Button */}
                <button
                  type="button"
                  onClick={handleFaceLoginStart}
                  disabled={isLoading || faceLoading}
                  className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-slate-300 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {faceLoading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying face...</span>
                    </>
                  ) : (
                    <>
                      <MdFace className="w-5 h-5" />
                      <span>Login with Face Recognition</span>
                    </>
                  )}
                </button>

                {/* Help Text */}
                <p className="text-center text-xs text-slate-400">
                  By signing in, you agree to our{' '}
                  <Link to="/terms" className="text-blue-600 hover:underline">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                </p>
              </form>

              {/* Face Scanner Modal */}
              <FaceScannerModal
                isOpen={showFaceScanner}
                onClose={() => {
                  setShowFaceScanner(false);
                  setUserIdForLogin('');
                  setProfilePictureUrl(null);
                }}
                onScanComplete={handleFaceScanComplete}
                title="Face Recognition Login"
                profilePictureUrl={profilePictureUrl}
              />

              {/* User ID / UGR Prompt Modal */}
              {showUgrPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md transition-all duration-300 p-4">
                  <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl flex flex-col">
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUgrPrompt(false);
                        setPromptError('');
                      }}
                      className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800/80 transition-colors text-slate-400 hover:text-white"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>

                    {/* Title */}
                    <h3 className="text-xl font-bold tracking-tight mb-1 mt-2 text-center text-blue-400">
                      Face Scan Login
                    </h3>
                    <p className="text-xs text-slate-400 text-center mb-6">
                      Enter your User ID to verify and load biometrics
                    </p>

                    <form onSubmit={handleUgrSubmit} className="space-y-4">
                      {/* Input Field */}
                      <div className="space-y-2">
                        <label htmlFor="promptUgr" className="block text-sm font-medium text-slate-300">
                          User ID / Student ID
                        </label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <FaUserGraduate className="w-4 h-4" />
                          </div>
                          <input
                            id="promptUgr"
                            type="text"
                            value={ugrInput}
                            onChange={(e) => {
                              setUgrInput(e.target.value);
                              if (promptError) setPromptError('');
                            }}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-950 transition-all text-sm bg-slate-900 text-white placeholder-slate-500"
                            placeholder="e.g., UGR/0000/00"
                            disabled={checkingUgr}
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Error Msg */}
                      {promptError && (
                        <div className="bg-red-950/40 border border-red-900/50 text-red-200 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></span>
                          <span>{promptError}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUgrPrompt(false);
                            setPromptError('');
                          }}
                          disabled={checkingUgr}
                          className="flex-1 py-3 px-4 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold transition-all text-sm text-center disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={checkingUgr}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-900/50 disabled:opacity-50"
                        >
                          {checkingUgr ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <span>Verify & Scan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Help Text */}
            <p className="text-center text-sm text-slate-500 mt-6 lg:hidden">
              Need help? Contact your campus IT support
            </p>
          </div>
        </div>
      </main>

    </div>
  );
}