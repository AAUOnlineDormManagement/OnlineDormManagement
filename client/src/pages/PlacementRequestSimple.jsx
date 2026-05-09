import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/Students/DashboardLayout';
import { dormApi } from '../api/dormApi';
import studentApi from '../api/studentApi';
import paymentApi from '../api/paymentApi';
import { saveDraft, loadDraft, clearDraft } from '../utils/draftStorage';
import toast from 'react-hot-toast';
import {
  FaBuilding,
  FaIdCard,
  FaMapMarkerAlt,
  FaUpload,
  FaCheckCircle,
  FaCreditCard,
  FaUserGraduate,
  FaUniversity,
  FaCalendarAlt,
  FaVenusMars,
  FaFile,
  FaShieldAlt,
  FaArrowRight,
  FaSpinner,
  FaImage,
  FaCamera,
  FaFilePdf,
  FaInfoCircle,
  FaChevronRight,
  FaTimes,
  FaMobileAlt,
  FaLock,
  FaArrowLeft,
  FaHourglassHalf
} from 'react-icons/fa';

/** Outer Addis sub-cities: no extra letter (aligned with server `fydaAddressMatch`). */
function impliesFarAddisFromCity(city) {
  const v = String(city || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const hints = [
    'akaki',
    'kality',
    'kaliti',
    'nifas',
    'nifsilk',
    'nifassilk',
    'kolfe',
    'keranio',
    'gullele',
    'yeka',
    'burayu',
    'legetafo',
    'legeta',
    'sebeta',
    'sululta',
    'holeta',
    'sendafa',
    'teji',
    'ayertena',
    'kotebe',
    'saris',
    'megenagna',
    'lideta',
    'lafto',
  ];
  return hints.some((k) => v.includes(k));
}

const compressImage = (file, maxWidth = 1000, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return resolve(file);
    
    // Safety timeout: if compression takes more than 15s, use original
    const timeout = setTimeout(() => {
      console.warn("Compression timed out, using original file.");
      resolve(file);
    }, 15000);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            clearTimeout(timeout);
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      }
    };
    reader.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    }
  });
};

export default function PlacementRequestSimple() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [existingApp, setExistingApp] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [isDormOpen, setIsDormOpen] = useState(true);
  const [openedAtDate, setOpenedAtDate] = useState(null);
  const [globalAnnouncement, setGlobalAnnouncement] = useState('');

  const [fydaFront, setFydaFront] = useState(null);
  const [fydaBack, setFydaBack] = useState(null);
  const [addisLetter, setAddisLetter] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [isStaffRelated, setIsStaffRelated] = useState(false);
  const [isSpecialNeed, setIsSpecialNeed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previews, setPreviews] = useState({
    fydaFront: null,
    fydaBack: null,
    addisLetter: null,
    paymentReceipt: null
  });
  const [isPaid, setIsPaid] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'error', 'verifying'
  const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const lastVerifiedTxRef = useRef(null);

  // Detect when student is returning from Chapa payment gateway
  // Note: once paymentStatus is set ('success'/'verifying'/'error'), the overlay
  // is driven by paymentStatus state — not just the URL — so clearing URL params
  // won't close the overlay.
  const returnedFromChapa = useMemo(() => {
    const params = new URLSearchParams(location.search || window.location.search);
    return params.get('payment') === 'success' || !!params.get('tx_ref') || !!params.get('trx_ref');
  }, [location.search]);

  const isAddis = false;
  const isLikelyFarAddis = false;
  const needsCentralAddisLetter = false;

  const studentTypeInfo = useMemo(() => {
    const s = profile?.student || {};
    const rawType = s.studentType || s.sponsorship || '';
    const t = String(rawType).toLowerCase();

    if (t.includes('self')) {
      return { label: 'Self Sponsored', isSelfSponsored: true };
    }
    if (t.includes('government')) {
      return { label: 'Government Sponsorship', isSelfSponsored: false };
    }
    if (t.includes('special')) {
      return { label: 'Special Needs', isSelfSponsored: false };
    }
    if (t.includes('staff')) {
      return { label: 'Staff Relatives', isSelfSponsored: false };
    }
    return { label: rawType || 'Not Set', isSelfSponsored: false };
  }, [profile]);

  // Persistence: Save draft whenever text fields change, BUT ONLY after initial load
  useEffect(() => {
    if (draftLoaded) {
      saveDraft({ isStaffRelated, isSpecialNeed, notes: existingApp?.notes }, {
        fydaFront, fydaBack, addisLetter, paymentReceipt
      });
    }
  }, [isStaffRelated, isSpecialNeed, fydaFront, fydaBack, addisLetter, paymentReceipt, draftLoaded]);

  // Effect 1: Load Profile, Existing Application, and Draft
  useEffect(() => {
    (async () => {
      try {
        // Load Draft first
        const draft = await loadDraft();
        console.log('Loading Draft on Mount:', draft);
        
        if (draft) {
          if (draft.isStaffRelated !== undefined) setIsStaffRelated(draft.isStaffRelated);
          if (draft.isSpecialNeed !== undefined) setIsSpecialNeed(draft.isSpecialNeed);
        }
        
        if (draft.files) {
          const newPreviews = {};
          if (draft.files.fydaFront) {
            setFydaFront(draft.files.fydaFront);
            newPreviews.fydaFront = URL.createObjectURL(draft.files.fydaFront);
          }
          if (draft.files.fydaBack) {
            setFydaBack(draft.files.fydaBack);
            newPreviews.fydaBack = URL.createObjectURL(draft.files.fydaBack);
          }
          if (draft.files.addisLetter) {
            setAddisLetter(draft.files.addisLetter);
            newPreviews.addisLetter = URL.createObjectURL(draft.files.addisLetter);
          }
          if (draft.files.paymentReceipt) {
            setPaymentReceipt(draft.files.paymentReceipt);
            newPreviews.paymentReceipt = URL.createObjectURL(draft.files.paymentReceipt);
          }
          setPreviews(prev => ({ ...prev, ...newPreviews }));
        }

        // Signal that loading is done so we can start saving changes
        setDraftLoaded(true);

        const res = await studentApi.getDashboard();
        if (res?.success) {
          setProfile(res);
          // Only overwrite text fields if not already loaded from draft
          if (res.student && !draft.isStaffRelated && !draft.isSpecialNeed) {
            setIsStaffRelated(!!res.student.isStaffRelated);
            setIsSpecialNeed(!!res.student.isSpecialNeed);
          }
        } else {
          throw new Error(res?.message || 'Failed to load dashboard');
        }
        const app = await dormApi.getMyApplication();
        setExistingApp(app);

        try {
          const configRes = await dormApi.getConfig();
          if (configRes && configRes.success) {
            setIsDormOpen(configRes.data?.isOpen ?? true);
            setGlobalAnnouncement(configRes.data?.announcement || '');
            if (configRes.data?.openedAt) {
              setOpenedAtDate(new Date(configRes.data.openedAt));
            }
          }
        } catch (configErr) {
          console.error('Failed to load global config', configErr);
        }

        if (app?.paymentStatus === 'Verified' || app?.paymentStatus === 'Paid') {
          setIsPaid(true);
        }
      } catch (err) {
        console.error(err);
        if (err?.status === 401 || err?.message?.includes('Unauthorized')) {
          setSubmitError('Your session has expired. Please log out and log in again to load your profile data.');
        } else {
          toast.error('Failed to load student profile');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Effect for Timer Countdown (Addis Wait)
  useEffect(() => {
    if (existingApp?.status === 'Waiting') {
      let refreshInFlight = false;
      // Use server-provided remainingMs if available, else fallback to local date calculation
      let serverRemainingMs = existingApp.remainingMs || 0;
      let startTime = Date.now();
      
      const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        let diff = 0;
        
        if (existingApp.remainingMs) {
          diff = serverRemainingMs - elapsed;
        } else if (existingApp.scheduledReleaseAt) {
          const target = new Date(existingApp.scheduledReleaseAt).getTime();
          diff = target - Date.now();
        }

        if (diff <= 0) {
          setTimeLeft(null);
          if (!refreshInFlight) {
            refreshInFlight = true;
            dormApi.getMyApplication().then(setExistingApp).catch(() => {}).finally(() => { refreshInFlight = false; });
          }
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
          // Poll every 10 seconds for state transitions
          if (secs % 10 === 0 && !refreshInFlight) {
            refreshInFlight = true;
            dormApi.getMyApplication().then(setExistingApp).catch(() => {}).finally(() => { refreshInFlight = false; });
          }
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [existingApp]);
  
  // Effect for Auto-Redirect to Chapa (Wait -> Payment)
  useEffect(() => {
    if (existingApp?.status === 'PaymentPending' && existingApp.chapaPaymentUrl) {
      console.log('🚀 Triggering auto-redirect to Chapa:', existingApp.chapaPaymentUrl);
      const redirectToast = toast.loading('Room found! Redirecting to Chapa Secure Gateway...', { 
        icon: '💰',
        duration: 5000 
      });
      
      const timer = setTimeout(() => {
        toast.dismiss(redirectToast);
        window.location.href = existingApp.chapaPaymentUrl;
      }, 3000);
      
      return () => {
        clearTimeout(timer);
        toast.dismiss(redirectToast);
      };
    }
  }, [existingApp?.status, existingApp?.chapaPaymentUrl]);

  // Effect for Independent Payment Verification
  useEffect(() => {
    // Robust detection: URL Params -> LocalStorage Fallback -> Window Location
    const params = new URLSearchParams(location.search || window.location.search);
    const searchTxRef = params.get('tx_ref') || 
                        params.get('trx_ref') || 
                        params.get('transaction_id') ||
                        params.get('reference') ||
                        localStorage.getItem('pending_chapa_tx_ref');
    
    // Trigger verification if any transaction reference is detected
    if (
      searchTxRef &&
      paymentStatus !== 'verifying' &&
      !isPaid &&
      lastVerifiedTxRef.current !== searchTxRef
    ) {
      console.log('Verification trigger initiated for:', searchTxRef);
      lastVerifiedTxRef.current = searchTxRef;
      // Show immediate feedback even in toast
      const verifToast = toast.loading('Detecting payment. Verifying with Chapa...');
      (async () => {
        setPaymentStatus('verifying');
        try {
          const verifyRes = await paymentApi.verify(searchTxRef);
          if (verifyRes.success) {
            setPaymentStatus('success');
            setIsPaid(true);
            let updatedApp = null;
            
            // Try to refresh application status if authenticated
            try {
              updatedApp = await dormApi.getMyApplication();
              setExistingApp(updatedApp);
            } catch (e) {
              console.log('Could not refresh app after payment (likely 401)');
            }
            
            // Payment is verified — set success state first, THEN clear URL
            // (clearing URL recalculates returnedFromChapa, but overlay stays open via paymentStatus)
            setPaymentStatus('success');
            setIsPaid(true);
            toast.success('Payment verified! Your dorm room is now assigned.', { id: verifToast, duration: 6000 });
            localStorage.removeItem('pending_chapa_tx_ref');
            setSearchParams({}, { replace: true });
          } else {
            toast.error(verifyRes.message || 'Verification failed', { id: verifToast });
            setPaymentStatus('error');
            setPaymentErrorMessage(verifyRes.message || 'Verification failed');
            setSearchParams({}, { replace: true });
            localStorage.removeItem('pending_chapa_tx_ref');
          }
        } catch (vErr) {
          console.error('Verification error:', vErr);
          toast.error('Verification failed', { id: verifToast });
          setPaymentStatus('error');
          setPaymentErrorMessage('Verification failed. If you already paid, please contact support.');
          setSearchParams({}, { replace: true });
          localStorage.removeItem('pending_chapa_tx_ref');
        }
      })();
    }
  }, [location.search, isPaid, paymentStatus, setSearchParams, loading, studentTypeInfo.isSelfSponsored]);

  const generateMockReceipt = async () => {
    // Generate a simple digital receipt image using Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 400, 600);
    
    // Header
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, 400, 80);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('DIGITAL RECEIPT', 90, 50);
    
    // Content
    ctx.fillStyle = '#1e293b';
    ctx.font = '16px Arial';
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 40, 120);
    ctx.fillText(`Student: ${profile?.student?.fullName || 'Student'}`, 40, 150);
    ctx.fillText(`Amount: 3,000.00 ETB`, 40, 180);
    ctx.fillText(`Transaction ID: CHAPA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 40, 210);
    ctx.fillText(`Status: SUCCESSFUL`, 40, 240);
    
    // Mock Seal
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(300, 500, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('VERIFIED', 270, 505);
    
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const file = new File([blob], "digital-receipt.png", { type: "image/png" });
        resolve(file);
      }, 'image/png');
    });
  };

  const handleChapaPayment = async () => {
    try {
      setPaymentLoading(true);
      const res = await paymentApi.initialize({ 
        amount: 3000,
        currency: 'ETB'
      });
      
      if (res.success && res.checkout_url) {
        toast.loading('Redirecting to Chapa...');
        
        // CRITICAL FALLBACK: Save tx_ref to localStorage in case redirect loses parameters
        if (res.tx_ref) {
          localStorage.setItem('pending_chapa_tx_ref', res.tx_ref);
        }
        
        window.location.href = res.checkout_url;
      } else {
        throw new Error('Could not get Chapa checkout URL');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Payment initialization failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      setPaymentLoading(true);
      setPaymentStatus('verifying');
      const res = await paymentApi.checkStatus();
      
      if (res.success) {
        setPaymentStatus('success');
        setIsPaid(true);
        toast.success(res.message || 'Payment successfully verified!');
        // Refresh application data
        const updatedApp = await dormApi.getMyApplication();
        setExistingApp(updatedApp);
      } else {
        throw new Error(res.message || 'No successful payment found');
      }
    } catch (err) {
      console.error(err);
      setPaymentStatus(null);
      toast.error(err.message || 'Could not verify payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFileChange = async (e, setFile, key) => {
    const file = e.target.files[0];
    if (file) {
      setSubmitting(true);
      try {
        const compressed = file.type.startsWith('image/') ? await compressImage(file) : file;
        setFile(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => ({ ...prev, [key]: reader.result }));
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        toast.error('Failed to process image');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const submit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setSubmitError('');
    setSubmitError('');
    if (!fydaFront || !fydaBack) return toast.error('FYDA front and back images are required');
    if (fydaFront && !String(fydaFront.type || '').startsWith('image/')) {
      return toast.error('FYDA front must be an image (JPG/PNG). PDFs are not allowed.');
    }
    if (!fydaBack || !String(fydaBack.type || '').startsWith('image/')) {
      return toast.error('FYDA back must be an image (JPG/PNG). PDFs are not allowed.');
    }

    // Addis letter: server validates after OCR (central Addis vs outskirts on ID text).
    // Note: Letter requirement is bypassed for automated 5-min test on backend too.
    // Payment check removed here because self-sponsored students now pay AFTER submission 
    // when a room is confirmed (or wait 5 mins for Addis).

    setSubmitting(true);
    const loadingToast = toast.loading(isAddis ? 'Preparing your Addis Ababa application...' : 'Submitting placement request...');
    try {
      // === COMPRESSION STEP: Resize and compress images to speed up OCR ===
      let activeFront = fydaFront;
      let activeBack = fydaBack;

      try {
        if (fydaFront && fydaFront.type.startsWith('image/')) {
          activeFront = await compressImage(fydaFront);
          console.log(`Optimized Front: ${(fydaFront.size / 1024).toFixed(1)}KB -> ${(activeFront.size / 1024).toFixed(1)}KB`);
        }
        if (fydaBack && fydaBack.type.startsWith('image/')) {
          activeBack = await compressImage(fydaBack);
          console.log(`Optimized Back: ${(fydaBack.size / 1024).toFixed(1)}KB -> ${(activeBack.size / 1024).toFixed(1)}KB`);
        }
      } catch (compressErr) {
        console.error('Compression failed, using originals:', compressErr);
      }

      const fd = new FormData();
      fd.append('isStaffRelated', isStaffRelated);
      fd.append('isSpecialNeed', isSpecialNeed);
      fd.append('fydaFront', activeFront);
      fd.append('fydaBack', activeBack);
      if (addisLetter) fd.append('addisLetter', addisLetter);
      if (studentTypeInfo.isSelfSponsored && paymentReceipt) fd.append('paymentReceipt', paymentReceipt);

      const res = await dormApi.submitApplication(fd);
      toast.dismiss(loadingToast);

      const status = res?.application?.status;

      if (status === 'Assigned') {
        // Only auto-navigate if we are NOT currently showing the payment success screen
        if (paymentStatus !== 'success') {
          toast.success('Success! You have been assigned a dorm room.');
          await clearDraft();
          navigate('/student-portal');
        }
      } else if (status === 'Waiting') {
        toast.success(res?.message || 'Application submitted! Please wait for automatic room availability check.', { duration: 6000, icon: '⏳' });
        setExistingApp(res.application);
        await clearDraft();
        // Stay on this page to show the countdown timer
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (status === 'PaymentPending') {
        toast.success(res?.message || 'Room found! Please complete payment.', { icon: '💰' });
        setExistingApp(res.application);
        await clearDraft();

        // Automatic redirect to Chapa if URL is provided by server
        if (res.chapaPaymentUrl) {
          toast.loading('Redirecting to Chapa Secure Server...');
          setTimeout(() => {
            window.location.href = res.chapaPaymentUrl;
          }, 1500);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        toast.success(res?.message || 'Submitted successfully.');
        await clearDraft();
        navigate('/student-portal');
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      let msg = 'Failed to submit. Please check your files and try again.';

      try {
        if (typeof err === 'string') {
          msg = err;
        } else if (err?.response?.status === 504) {
          msg = 'Server Timeout: Processing your application exceeded the time limit. Your application might still have been uploaded, but the response was lost. Please check your portal in a moment.';
        } else {
          // Robustly extract message from any object shape
          const rawMessage = 
            err?.response?.data?.message || 
            err?.response?.data?.error || 
            err?.message || 
            err?.error ||
            (err && typeof err === 'object' && !Array.isArray(err) ? (err.message || err.error || JSON.stringify(err)) : null);

          if (rawMessage) {
            msg = typeof rawMessage === 'object' 
              ? (rawMessage.message || rawMessage.error || JSON.stringify(rawMessage))
              : String(rawMessage);
          }
        }
      } catch (innerErr) {
        console.error('Error during error parsing:', innerErr);
      }

      // FINAL SAFETY CHECK: Force to string before passing to React
      const finalMsg = String(msg).slice(0, 500); 
      setSubmitError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Loading your profile...</h3>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const student = profile?.student || {};
  const account = dormApi.getUniversityAccount();
  const amount = 3000;

  return (
    <DashboardLayout>
      {/* ═══════════════════════════════════════════════════════════════════
          PAYMENT RETURN OVERLAY
          Shows when student is redirected back from Chapa gateway.
          Hides the entire form and shows a clear success/verifying screen.
      ═══════════════════════════════════════════════════════════════════ */}
      {(returnedFromChapa || paymentStatus === 'success' || paymentStatus === 'verifying') && (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 flex items-center justify-center">
          {/* Animated background blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-md w-full mx-4">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 text-center shadow-2xl">

              {/* Icon — spinner while verifying, checkmark when done */}
              <div className="flex items-center justify-center mb-6">
                {paymentStatus === 'success' ? (
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-[bounceIn_0.5s_ease]">
                    <FaCheckCircle className="w-12 h-12 text-white" />
                  </div>
                ) : paymentStatus === 'error' ? (
                  <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40">
                    <FaTimes className="w-12 h-12 text-white" />
                  </div>
                ) : (
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaLock className="w-8 h-8 text-white/60" />
                    </div>
                  </div>
                )}
              </div>

              {/* University badge */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <FaUniversity className="text-emerald-400 w-4 h-4" />
                <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Addis Ababa University</span>
              </div>

              {/* Main heading */}
              {paymentStatus === 'success' ? (
                <>
                  <h1 className="text-3xl font-black text-white mb-2">Payment Confirmed! 🎉</h1>
                  <p className="text-emerald-200 text-sm mb-2">Your dorm room has been assigned.</p>
                  <p className="text-white/60 text-xs mb-8">
                    Welcome to your new home at AAU. Check your student portal for room details.
                  </p>
                </>
              ) : paymentStatus === 'error' ? (
                <>
                  <h1 className="text-3xl font-black text-white mb-2">Verification Issue</h1>
                  <p className="text-rose-300 text-sm mb-2">{paymentErrorMessage || 'Could not verify your payment.'}</p>
                  <p className="text-white/60 text-xs mb-8">
                    If you completed the payment, please click "Check Payment Status" below.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-black text-white mb-2">Verifying Payment...</h1>
                  <p className="text-teal-200 text-sm mb-2">Please wait while we confirm your transaction with Chapa.</p>
                  <p className="text-white/60 text-xs mb-8">This usually takes a few seconds.</p>
                </>
              )}

              {/* Transaction detail strip */}
              <div className="bg-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Amount</span>
                  <span className="text-white font-bold">3,000.00 ETB</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Student</span>
                  <span className="text-white font-bold">{profile?.student?.fullName || '...'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Purpose</span>
                  <span className="text-white font-bold">Dormitory Fee</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Status</span>
                  <span className={`font-bold ${paymentStatus === 'success' ? 'text-emerald-400' : paymentStatus === 'error' ? 'text-rose-400' : 'text-yellow-400'}`}>
                    {paymentStatus === 'success' ? '✅ Verified' : paymentStatus === 'error' ? '❌ Failed' : '⏳ Verifying...'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              {paymentStatus === 'success' && (
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/student-portal')}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-base transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                  >
                    Go to Student Portal Dashboard
                    <FaArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSearchParams({}, { replace: true })}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white/80 rounded-2xl font-semibold text-sm transition-all"
                  >
                    View Application Details
                  </button>
                </div>
              )}

              {paymentStatus === 'error' && (
                <div className="space-y-3">
                  <button
                    onClick={handleCheckStatus}
                    disabled={paymentLoading}
                    className="w-full py-4 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2"
                  >
                    {paymentLoading ? <FaSpinner className="animate-spin" /> : null}
                    Check Payment Status
                  </button>
                  <button
                    onClick={() => { setSearchParams({}, { replace: true }); setPaymentStatus(null); }}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white/80 rounded-2xl font-semibold text-sm transition-all"
                  >
                    Back to Application
                  </button>
                </div>
              )}

              {(paymentStatus === 'verifying' || (!paymentStatus && returnedFromChapa)) && (
                <p className="text-white/40 text-xs">
                  Do not close this page...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Left Side - Form */}
        <div className="flex-1 overflow-y-auto px-6 py-8 lg:px-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
              <FaUniversity className="w-4 h-4" />
              <span>Addis Ababa University</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Room Placement Request</h1>
            <p className="text-slate-500">Complete the form below to apply for on-campus housing</p>
          </div>

          {/* Profile Summary Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <FaUserGraduate className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800">Your Information</h2>
                <p className="text-sm text-slate-600 mb-4">Auto-filled from your profile</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                    <p className="text-xs text-blue-600 mb-1">Department</p>
                    <p className="font-semibold text-slate-800 truncate">{student.department || 'N/A'}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                    <p className="text-xs text-blue-600 mb-1">Year</p>
                    <p className="font-semibold text-slate-800">{student.year || 'N/A'}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                    <p className="text-xs text-blue-600 mb-1">Gender</p>
                    <p className="font-semibold text-slate-800 capitalize">{student.gender || 'N/A'}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                    <p className="text-xs text-blue-600 mb-1">Type</p>
                    <p className="font-semibold text-slate-800 truncate">{studentTypeInfo.label}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-blue-100/50">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isStaffRelated ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-200 group-hover:border-blue-400'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isStaffRelated} 
                        onChange={(e) => setIsStaffRelated(e.target.checked)} 
                      />
                      {isStaffRelated && <FaCheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700">Staff Related</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSpecialNeed ? 'bg-rose-600 border-rose-600' : 'bg-white border-blue-200 group-hover:border-blue-400'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isSpecialNeed} 
                        onChange={(e) => setIsSpecialNeed(e.target.checked)} 
                      />
                      {isSpecialNeed && <FaCheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700">Special Need</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Friendly status (if already submitted) */}
          {existingApp && (
            <div className={`rounded-2xl border-2 p-6 mb-6 ${
              existingApp.status === 'Waiting' 
                ? 'bg-blue-50 border-blue-300 shadow-lg shadow-blue-100' 
                : existingApp.status === 'Assigned'
                  ? 'bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-100'
                  : 'bg-white border-gray-200'
            }`}>
              {/* ALREADY APPLIED GENERIC HEADER */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">You have already applied.</h2>
                <p className="text-sm text-slate-500">Track your application status below.</p>
              </div>

              {/* WAITING STATUS — Prominent countdown popup */}
              {existingApp.status === 'Waiting' && (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                    <FaCalendarAlt className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-blue-900">Please Wait — Room Assignment in Progress</h3>
                  <p className="text-sm text-blue-700 max-w-md mx-auto">
                    Based on your FYDA back-side address, your application has a required waiting period before automatic room assignment. 
                    Once confirmed, you will be notified to <strong>pay the fee</strong> and secure your spot.
                  </p>
                  {timeLeft ? (
                    <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-8 py-4 border-2 border-blue-200 shadow-sm">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                      <span className="text-3xl font-black text-blue-700 tabular-nums tracking-wider">{timeLeft}</span>
                      <span className="text-xs font-bold text-blue-500 uppercase">remaining</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-3 bg-emerald-50 rounded-2xl px-8 py-4 border-2 border-emerald-200">
                      <FaSpinner className="w-5 h-5 text-emerald-600 animate-spin" />
                      <span className="text-lg font-black text-emerald-700">Assigning your room now...</span>
                    </div>
                  )}
                  <p className="text-xs text-blue-500 font-medium">
                    This page will automatically refresh when your room is assigned.
                  </p>
                </div>
              )}

              {/* ASSIGNED STATUS — Success */}
              {existingApp.status === 'Assigned' && (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                    <FaCheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-900">Room Assigned!</h3>
                  <p className="text-sm text-emerald-700">
                    You have been assigned a dorm room. Check your room details in the Student Portal.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => navigate('/student-portal')}
                      className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                    >
                      Go to Student Portal Dashboard
                    </button>
                  </div>
                </div>
              )}

              {/* PAYMENT PENDING STATUS — Prominent call to action */}
              {existingApp.status === 'PaymentPending' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                    <FaCreditCard className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Room Confirmed — Payment Required</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    A room has been found on your campus! To secure your spot, please complete the payment below.
                  </p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left text-xs text-slate-500">
                    <p className="font-bold mb-1 uppercase tracking-wider">Note:</p>
                    Once payment is verified, your room will be assigned automatically.
                  </div>
                </div>
              )}

              {/* PLACEMENT FEE SECTION - MOVED HERE TO BE VISIBLE AFTER SUBMISSION */}
              {(existingApp?.status === 'Waiting' || existingApp?.status === 'PaymentPending' || existingApp?.status === 'Pending' || existingApp?.status === 'Assigned' || isPaid) && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <div className="bg-white rounded-2xl border border-blue-50 p-6 shadow-sm">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner">
                        <FaCreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">Placement Fee</h3>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Status:</span>
                              {isPaid ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  <FaCheckCircle className="w-2.5 h-2.5" /> Paid
                                </span>
                              ) : existingApp?.status === 'Waiting' ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shadow-sm animate-pulse">
                                  <FaCalendarAlt className="w-2.5 h-2.5" /> 
                                  {timeLeft ? `Assigning in ${timeLeft}` : 'Assigning now...'}
                                </span>
                              ) : paymentStatus === 'verifying' ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 animate-pulse">
                                  <FaSpinner className="w-2.5 h-2.5 animate-spin" /> Verifying...
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                    <FaSpinner className="w-2.5 h-2.5" /> Pending
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mt-3">
                          {isPaid 
                            ? 'Your payment of 3,000 ETB has been successfully verified via the Chapa Gateway.' 
                            : paymentStatus === 'verifying'
                            ? 'Please wait, we are confirming your payment with the server...'
                            : 'Self-sponsored students are required to pay 3,000 ETB for dorm placement.'}
                        </p>
                      </div>
                    </div>

                    {isPaid ? (
                      <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200 relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-4 mb-4 relative z-10">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <FaCheckCircle className="w-6 h-6 text-emerald-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-emerald-900">Payment Successful!</h4>
                            <p className="text-xs text-emerald-700 font-medium tracking-wide uppercase">Dorm Fee Confirmed</p>
                          </div>
                        </div>
                        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-emerald-100 mb-4 relative z-10">
                          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                            Thank you! Your payment has been verified. 
                            <strong> Please check your room details below and get your room key from the proctor's office in your campus.</strong>
                          </p>
                          <button 
                            onClick={() => navigate('/dashboard')}
                            className="mt-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-emerald-200"
                          >
                            Go to Dashboard <FaArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest relative z-10 bg-white/40 w-fit px-3 py-1 rounded-full border border-emerald-100">
                          <FaLock className="w-2.5 h-2.5" /> ID: {existingApp?.chapaTxRef || 'CHAPA-SUCCESS'}
                        </div>
                      </div>
                    ) : existingApp?.status === 'Waiting' ? (
                      <div className="bg-blue-50 rounded-2xl p-8 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center gap-6">
                        <div className="relative flex items-center justify-center">
                          <FaSpinner className="w-16 h-16 text-blue-500 animate-spin opacity-20" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FaHourglassHalf className="w-6 h-6 text-blue-600 animate-pulse" />
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <h4 className="font-black text-blue-900 text-lg mb-1">Checking Room Availability...</h4>
                          <p className="text-sm text-blue-700 font-medium max-w-xs mx-auto mb-6">
                            We are verifying room slots for your campus. Please wait while we process your priority.
                          </p>
                          
                          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100 shadow-sm inline-block min-w-[200px]">
                            <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-2">Estimated Wait</p>
                            <p className="text-4xl font-black text-blue-600 font-mono tracking-wider tabular-nums">
                              {timeLeft || '--:--'}
                            </p>
                            <div className="mt-4 w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                                style={{ 
                                  width: timeLeft ? `${Math.min(100, (parseInt(timeLeft.split(':')[0]) * 60 + parseInt(timeLeft.split(':')[1])) / 1.8)}%` : '100%' 
                                }}
                              ></div>
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-blue-400 mt-6 uppercase font-bold tracking-widest">
                            The Pay Online button will appear automatically
                          </p>
                        </div>
                      </div>
                    ) : paymentStatus === 'verifying' ? (
                      <div className="bg-blue-50 rounded-2xl p-8 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center gap-4">
                        <FaSpinner className="w-10 h-10 text-blue-500 animate-spin" />
                        <div className="text-center">
                          <h4 className="font-bold text-blue-900">Verifying Payment...</h4>
                          <p className="text-xs text-blue-700">Connecting to Chapa Secure Server</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between group hover:bg-blue-50/30 transition-all">
                          <div>
                            <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Total Amount</p>
                            <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">3,000.00 <span className="text-sm font-bold opacity-50">ETB</span></p>
                          </div>
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                            <FaUniversity className="w-5 h-5 text-blue-500" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={handleChapaPayment}
                            className="group relative overflow-hidden flex items-center justify-center gap-3 py-4 bg-[#01c775] hover:bg-[#01b068] text-white rounded-2xl font-black transition-all shadow-xl shadow-emerald-100 hover:-translate-y-1 active:translate-y-0"
                          >
                            <div className="absolute inset-0 bg-white/10 translate-y-12 group-hover:translate-y-0 transition-transform duration-500"></div>
                            <FaCreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-lg relative z-10">Pay Online</span>
                          </button>
                          
                          <div 
                            onClick={() => document.getElementById('receipt-upload-existing').click()}
                            className="flex flex-col items-center justify-center py-4 bg-white border-2 border-dashed border-slate-200 text-slate-500 rounded-2xl font-bold hover:border-blue-400 hover:bg-blue-50/10 transition-all cursor-pointer group"
                          >
                            <FaUpload className="w-5 h-5 mb-1 group-hover:text-blue-500 transition-colors" />
                            <span className="text-sm">Manual Receipt</span>
                            <input
                              id="receipt-upload-existing"
                              type="file"
                              className="hidden"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileChange(e, setPaymentReceipt, 'paymentReceipt')}
                            />
                          </div>
                        </div>

                        {paymentReceipt && (
                          <div className="mt-4 bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <FaFile className="text-blue-600 w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-blue-800 truncate max-w-[150px]">{paymentReceipt.name}</span>
                            </div>
                            <button type="button" onClick={() => setPaymentReceipt(null)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors">
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!existingApp && !isDormOpen && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
              <FaInfoCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-rose-800 mb-2">Dorm Applications are Closed</h2>
              <p className="text-rose-600 mb-4">
                {globalAnnouncement || 'The administration has currently closed the dormitory application window. You will be notified when it reopens.'}
              </p>
            </div>
          )}

          {!existingApp && isDormOpen && openedAtDate && Date.now() < openedAtDate.getTime() && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center shadow-sm">
              <FaCalendarAlt className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-blue-800 mb-2">Applications Not Yet Open</h2>
              <p className="text-blue-600 mb-2">
                The dorm application window is scheduled to open on:
              </p>
              <div className="inline-block bg-white px-4 py-2 rounded-lg border border-blue-100 font-bold text-blue-700 text-lg mb-4 shadow-sm">
                {openedAtDate.toLocaleString()}
              </div>
              <p className="text-sm text-blue-500">
                Please wait until this exact time to apply.
              </p>
            </div>
          )}

          {!existingApp && isDormOpen && (!openedAtDate || Date.now() >= openedAtDate.getTime()) && (
          <form onSubmit={submit} className="space-y-6">
            {submitError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4">
                <p className="text-sm font-semibold mb-1">We couldn’t submit your request</p>
                <p className="text-sm">{submitError}</p>
              </div>
            )}

            {/* FYDA Documents */}

            {/* FYDA Documents */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FaIdCard className="text-blue-600" />
                FYDA Documents <span className="text-rose-500">*</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Upload clear photos of your FYDA ID (front and back). Only JPG/PNG images are accepted (no PDF).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front */}
                <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">Front Side</p>
                    {fydaFront && <FaCheckCircle className="text-emerald-500 w-4 h-4" />}
                  </div>
                  {!fydaFront ? (
                    <div 
                      onClick={() => document.getElementById('fyda-front').click()}
                      className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
                    >
                      <FaCamera className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Click to upload</p>
                      <input
                        id="fyda-front"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setFydaFront, 'fydaFront')}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {previews.fydaFront ? (
                        <img src={previews.fydaFront} alt="Front" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <FaFilePdf className="w-8 h-8 text-blue-600" />
                      )}
                      <span className="text-sm text-slate-600 truncate flex-1">{fydaFront.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFydaFront(null);
                          setPreviews(prev => ({ ...prev, fydaFront: null }));
                        }}
                        className="text-rose-500 hover:text-rose-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Back */}
                <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">Back Side</p>
                    {fydaBack && <FaCheckCircle className="text-emerald-500 w-4 h-4" />}
                  </div>
                  {!fydaBack ? (
                    <div 
                      onClick={() => document.getElementById('fyda-back').click()}
                      className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
                    >
                      <FaCamera className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Click to upload</p>
                      <input
                        id="fyda-back"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setFydaBack, 'fydaBack')}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {previews.fydaBack ? (
                        <img src={previews.fydaBack} alt="Back" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <FaFilePdf className="w-8 h-8 text-blue-600" />
                      )}
                      <span className="text-sm text-slate-600 truncate flex-1">{fydaBack.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFydaBack(null);
                          setPreviews(prev => ({ ...prev, fydaBack: null }));
                        }}
                        className="text-rose-500 hover:text-rose-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Addis Letter (central only) */}
            {needsCentralAddisLetter && (
              <div className="bg-white rounded-2xl border border-amber-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FaFile className="text-amber-600" />
                    Additional Letter <span className="text-rose-500">*</span>
                  </h3>
                  {addisLetter && <FaCheckCircle className="text-emerald-500 w-4 h-4" />}
                </div>
                
                {!addisLetter ? (
                  <div 
                    onClick={() => document.getElementById('addis-letter').click()}
                    className="border-2 border-dashed border-amber-200 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer"
                  >
                    <FaUpload className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Upload additional letter</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (max 10MB)</p>
                    <input
                      id="addis-letter"
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, setAddisLetter, 'addisLetter')}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-3">
                      {previews.addisLetter ? (
                        <img src={previews.addisLetter} alt="Letter" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <FaFilePdf className="w-8 h-8 text-amber-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-800">{addisLetter.name}</p>
                        <p className="text-xs text-slate-500">{(addisLetter.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddisLetter(null);
                        setPreviews(prev => ({ ...prev, addisLetter: null }));
                      }}
                      className="text-rose-500 hover:text-rose-700 p-2 hover:bg-amber-200 rounded-full transition-colors"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            


            {/* Payment Modal Overlay */}
            {showPaymentModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !paymentLoading && setShowPaymentModal(false)}></div>
                
                <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                  {/* Chapa Header */}
                  <div className="bg-[#01c775] p-6 text-white">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-2xl font-black tracking-tighter">chapa</span>
                      <button onClick={() => !paymentLoading && setShowPaymentModal(false)} className="p-2 hover:bg-black/10 rounded-full transition">
                        <FaTimes />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-emerald-100 text-xs uppercase font-black tracking-widest mb-1">Total to Pay</p>
                      <h3 className="text-4xl font-black">3,000.00 <span className="text-lg opacity-80">ETB</span></h3>
                    </div>
                  </div>

                  {/* Payment Body */}
                  <div className="p-6">
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between text-sm py-2 border-b border-slate-50">
                        <span className="text-slate-500">Student Name</span>
                        <span className="font-bold text-slate-800">{profile?.student?.fullName}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm py-2 border-b border-slate-50">
                        <span className="text-slate-500">Reference</span>
                        <span className="font-bold text-slate-800">DORM-{(Math.random() * 100000).toFixed(0)}</span>
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Redirecting to Chapa</h4>
                    <p className="text-sm text-slate-600 mb-8">
                      You will be redirected to the secure Chapa payment gateway to complete your transaction using mobile money or card.
                    </p>

                    <button
                      type="button"
                      onClick={handleChapaPayment}
                      disabled={paymentLoading}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                    >
                      {paymentLoading ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaLock className="text-xs opacity-50" />
                          Proceed to Payment
                        </>
                      )}
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 mt-4 px-8">
                      By clicking Proceed, you agree to the terms and conditions of AAU Housing and Chapa Financial Technologies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
              <button
                type="button"
                onClick={() => navigate('/student-portal')}
                className="px-6 py-2.5 text-slate-600 hover:text-slate-900 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              
              {(!existingApp || existingApp.status === 'Pending' || existingApp.status === 'Rejected') && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Request
                      <FaChevronRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
          )}
        </div>

        {/* Right Side - Image with Blue Light Overlay */}
        <div className="hidden lg:block w-[45%] relative overflow-hidden bg-gradient-to-br from-blue-900 to-indigo-900">
          {/* Background Image */}
          <img 
            src="https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1786&q=80"
            alt="University Campus"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          
          {/* Blue Light Overlay - Multiple Layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-purple-600/40 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-800/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-transparent"></div>
          
          {/* Animated Light Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-300 rounded-full mix-blend-soft-light filter blur-3xl animate-pulse delay-500"></div>
          </div>

          {/* Content Overlay - Minimal */}
          <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-3 leading-tight">
                Your Home<br />Away From Home
              </h2>
              <p className="text-blue-100 text-lg max-w-md">
                Experience comfortable and secure on-campus living at Addis Ababa University.
              </p>
              
              {/* Decorative Elements */}
              <div className="mt-8 flex gap-4">
                <div className="w-16 h-1 bg-blue-400 rounded-full"></div>
                <div className="w-8 h-1 bg-blue-300 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Subtle Pattern Overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
      </div>

      {/* 5-minute wait modal removed by policy */}
    </DashboardLayout>
  );
}