import { useState, useEffect, useRef, useCallback } from 'react';
import { FaTimes, FaCamera, FaSpinner, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

export default function FaceScannerModal({ isOpen, onClose, onScanComplete, title = "Face Recognition Scanner" }) {
  const [status, setStatus] = useState("loading"); // loading, scanning, success, error
  const [message, setMessage] = useState("Loading AI Face Recognition Models...");
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const faceApiLoadedRef = useRef(false);
  // Refs to avoid stale closures inside the rAF detection loop
  const statusRef = useRef("loading");
  const isOpenRef = useRef(isOpen);
  const doneRef = useRef(false); // prevent onScanComplete firing twice

  // Keep refs in sync with state/props
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  const setStatusSynced = (s) => { statusRef.current = s; setStatus(s); };

  useEffect(() => {
    if (!isOpen) return;

    doneRef.current = false;
    setStatusSynced("loading");
    setMessage("Loading AI Face Recognition Models...");
    setErrorMsg("");

    const loadFaceApi = async () => {
      try {
        if (window.faceapi) {
          faceApiLoadedRef.current = true;
          startCameraAndAI();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js";
        script.async = true;
        script.onload = () => { faceApiLoadedRef.current = true; startCameraAndAI(); };
        script.onerror = () => {
          setStatusSynced("error");
          setErrorMsg("Failed to load face recognition script. Check your internet connection.");
        };
        document.body.appendChild(script);
      } catch (err) {
        console.error(err);
        setStatusSynced("error");
        setErrorMsg("Error initializing scanner components.");
      }
    };

    loadFaceApi();
    return () => stopAll();
  }, [isOpen]);

  const stopAll = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCameraAndAI = async () => {
    try {
      setMessage("Starting Web Camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      setStatusSynced("scanning");
      setMessage("Initializing AI Face Detection...");

      const MODEL_URL = "https://cdn.jsdelivr.net/gh/cydni/face-api.js-models@master/";
      await Promise.all([
        window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      setMessage("Align your face in the camera circle...");
      detectFaceLoop();
    } catch (err) {
      console.error(err);
      setStatusSynced("error");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera access denied. Please allow camera permissions in your browser.");
      } else {
        setErrorMsg("Could not load camera or AI models. Please try again.");
      }
    }
  };

  const detectFaceLoop = async () => {
    // Use refs — not closed-over state — to avoid stale values
    if (!videoRef.current || !isOpenRef.current || doneRef.current) return;
    if (statusRef.current === "error" || statusRef.current === "success") return;

    try {
      const faceapi = window.faceapi;
      if (videoRef.current.paused || videoRef.current.ended) {
        animationFrameRef.current = requestAnimationFrame(detectFaceLoop);
        return;
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && !doneRef.current) {
        doneRef.current = true;
        setMessage("Analyzing facial features...");
        setStatusSynced("success");
        setMessage("Face Scan Successful!");

        setTimeout(() => {
          stopAll();
          onScanComplete(Array.from(detection.descriptor));
        }, 1200);
        return;
      } else {
        setMessage("Position your face in the center of the camera...");
      }
    } catch (err) {
      console.error("Face detection loop error:", err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaceLoop);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md transition-all duration-300 p-4">
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 text-white">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800/80 transition-colors text-slate-400 hover:text-white"
        >
          <FaTimes className="w-4 h-4" />
        </button>

        {/* Title */}
        <h3 className="text-xl font-bold tracking-tight mb-1 mt-2 text-center text-blue-400">{title}</h3>
        <p className="text-xs text-slate-400 text-center mb-6">Advanced Biometric Verification System</p>

        {/* Camera Container */}
        <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.3)] bg-slate-900 mb-6 flex items-center justify-center">

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transform -scale-x-100 ${status === 'scanning' || status === 'success' ? 'block' : 'hidden'}`}
          />

          {/* Scanning laser line */}
          {status === 'scanning' && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse shadow-[0_0_8px_#3b82f6]"
              style={{ animation: 'scan 2.5s infinite ease-in-out', top: '10%' }}
            />
          )}

          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <FaSpinner className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-300">Initializing AI Models...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-950/20">
              <FaExclamationTriangle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
              <p className="text-sm font-semibold text-red-400 mb-2">Scan Failed</p>
              <p className="text-xs text-slate-400">{errorMsg}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-emerald-950/40 backdrop-blur-sm z-10">
              <FaCheckCircle className="w-16 h-16 text-emerald-400 mb-3 animate-ping" style={{ animationDuration: '1.5s' }} />
              <p className="text-lg font-bold text-emerald-400">Match Found</p>
              <p className="text-xs text-slate-300">Biometrics Authenticated</p>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="w-full text-center px-4 mb-2">
          <p className={`text-sm font-semibold transition-all ${
            status === 'error' ? 'text-red-400' :
            status === 'success' ? 'text-emerald-400 animate-pulse' :
            'text-blue-200'
          }`}>{message}</p>
        </div>

        {/* Help text / Retry */}
        <div className="text-xs text-slate-500 text-center px-6 mt-2">
          {status === 'scanning' && "Make sure your face is well-lit and directly facing the camera."}
          {status === 'error' && (
            <button
              onClick={startCameraAndAI}
              className="mt-2 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-blue-400 text-xs font-semibold transition-all"
            >
              Retry Scan
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0.3; }
          50% { top: 90%; opacity: 1; }
        }
      `}} />
    </div>
  );
}
