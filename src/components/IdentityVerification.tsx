import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  Camera, 
  Check, 
  FileText, 
  AlertTriangle, 
  Loader, 
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ToggleLeft
} from 'lucide-react';
import { User } from '../types';

interface IdentityVerificationProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onCancel: () => void;
}

export default function IdentityVerification({
  currentUser,
  onUpdateUser,
  onCancel
}: IdentityVerificationProps) {
  // Navigation internal state
  const [stepStatus, setStepStatus] = useState<'form' | 'submitting' | 'submitted'>('form');

  // Input States
  const [licenceNumber, setLicenceNumber] = useState(currentUser.licenceNumber || '');
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [licenceFileName, setLicenceFileName] = useState(currentUser.licenceNumber ? 'driving_licence.pdf' : '');
  const [licenceDragOver, setLicenceDragOver] = useState(false);

  const [aadhaarNumber, setAadhaarNumber] = useState(currentUser.aadhaarNumber || '');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarFileName, setAadhaarFileName] = useState(currentUser.aadhaarNumber ? 'aadhaar_card.pdf' : '');
  const [aadhaarDragOver, setAadhaarDragOver] = useState(false);

  // Vehicle registration (RC) document
  const [vehicleRcNumber, setVehicleRcNumber] = useState(currentUser.vehicleRcNumber || '');
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [vehicleFileName, setVehicleFileName] = useState(currentUser.vehicleRcImageUrl ? 'vehicle_rc.pdf' : '');
  const [vehicleDragOver, setVehicleDragOver] = useState(false);

  // Selfie / Camera States
  const [selfieImage, setSelfieImage] = useState<string | null>(currentUser.selfieImage || null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // held in a ref so StrictMode/re-renders don't stop it

  // Errors / Loading
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Interactive drop zone handlers
  const handleLicenceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setLicenceDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setLicenceFile(file);
      setLicenceFileName(file.name);
    }
  };

  const handleAadhaarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setAadhaarDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setAadhaarFile(file);
      setAadhaarFileName(file.name);
    }
  };

  const handleLicenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLicenceFile(e.target.files[0]);
      setLicenceFileName(e.target.files[0].name);
    }
  };

  const handleAadhaarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAadhaarFile(e.target.files[0]);
      setAadhaarFileName(e.target.files[0].name);
    }
  };

  const handleVehicleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setVehicleDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setVehicleFile(file);
      setVehicleFileName(file.name);
    }
  };

  const handleVehicleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVehicleFile(e.target.files[0]);
      setVehicleFileName(e.target.files[0].name);
    }
  };

  // Read a File as a base64 data URL.
  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

  // Upload a document scan and return its stored URL.
  const uploadDoc = async (file: File, kind: 'licence' | 'aadhaar' | 'vehicle') => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} is larger than 5MB. Please upload a smaller file.`);
    }
    const imageData = await fileToDataUrl(file);
    const res = await fetch('/api/auth/upload-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, kind }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Document upload failed');
    return data.url as string;
  };

  // Webcam stream handlers
  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setCameraActive(true); // a useEffect (below) attaches the stream once the <video> mounts
    } catch (err: any) {
      console.warn('[camera] getUserMedia failed:', err?.name || err);
      setCameraActive(false);
      setError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in your browser and tap "Open Live Webcam Camera" again.'
          : 'No camera found or it is in use by another app. Please check and try again.'
      );
    }
  };

  // Attach the live stream to the <video> and start playback once it's on screen.
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { /* muted+playsInline allows autoplay */ });
    }
  }, [cameraActive]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError('Camera still warming up — wait a second and tap capture again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setSelfieImage(canvas.toDataURL('image/jpeg', 0.9));
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Stop the camera only on real unmount (empty deps) — not on every re-render.
  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  // Main submission 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Sanitize and Validate Licence
    const cleanLicence = licenceNumber.trim().toUpperCase();
    if (!cleanLicence) {
      setError('Please provide your Driving Licence Identification Number.');
      return;
    }
    if (!licenceFileName) {
      setError('Please drag-drop or upload your Driving Licence document.');
      return;
    }

    // Sanitize and Validate Aadhaar 12-digit
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      setError('Please provide a valid 12-digit Aadhaar Card number.');
      return;
    }
    if (!aadhaarFileName) {
      setError('Please upload your Aadhaar Card document copy.');
      return;
    }

    // Vehicle registration (RC) validation
    const cleanRc = vehicleRcNumber.trim().toUpperCase();
    if (!cleanRc) {
      setError('Please provide your Vehicle Registration (RC) number.');
      return;
    }
    if (!vehicleFileName) {
      setError('Please upload your Vehicle Registration Certificate (RC) document.');
      return;
    }

    // Selfie validation
    if (!selfieImage) {
      setError('Please take a clear front face selfie to lock your identification profile.');
      return;
    }

    setLoading(true);
    try {
      // Upload any freshly-selected scans; reuse existing URLs on a re-submit.
      const licenceImageUrl = licenceFile ? await uploadDoc(licenceFile, 'licence') : currentUser.licenceImageUrl;
      const aadhaarImageUrl = aadhaarFile ? await uploadDoc(aadhaarFile, 'aadhaar') : currentUser.aadhaarImageUrl;
      const vehicleRcImageUrl = vehicleFile ? await uploadDoc(vehicleFile, 'vehicle') : currentUser.vehicleRcImageUrl;

      const res = await fetch('/api/auth/verify-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          licenceNumber: cleanLicence,
          aadhaarNumber: cleanAadhaar,
          selfieImage: selfieImage,
          licenceImageUrl,
          aadhaarImageUrl,
          vehicleRcNumber: cleanRc,
          vehicleRcImageUrl,
        })
      });

      const data = await res.json();
      if (data.success && data.user) {
        onUpdateUser(data.user);
        setStepStatus('submitted');
      } else {
        setError(data.error || 'Failed to submit documents for auditing.');
      }
    } catch (e: any) {
      setError(e?.message || 'Network communication failure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Immediate Admin override simulator for rapid turn-around testing
  const handleSimulateStatus = async (status: 'verified' | 'rejected' | 'pending' | 'none') => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/simulate-verification-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          status: status
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        onUpdateUser(data.user);
        if (status === 'verified') {
          // close gate
          onCancel();
        }
      } else {
        setError(data.error || 'Failed to trigger developer simulated state.');
      }
    } catch {
      setError('Failed to reach developer simulation nodes.');
    } finally {
      setLoading(false);
    }
  };

  // Determine current verification cycle
  const currentStatus = currentUser.verificationStatus || (currentUser.isIdVerified ? 'verified' : 'none');

  if (currentStatus === 'pending' || stepStatus === 'submitted') {
    return (
      <div id="verification_flow_pending" className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12 animate-fadeIn bg-slate-950/40 rounded-3xl">
        <div id="pending_glass_card" className="w-full max-w-lg bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-2xl p-8 space-y-6 text-center text-slate-100">
          
          {/* Animated Green / Orange Check-Circle */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative w-20 h-20 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-pulse">
              <span className="absolute inset-x-0 inset-y-0 rounded-full bg-emerald-500/5 animate-ping duration-1000" />
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight text-white">Submitted!</h2>
            <p className="text-sm text-slate-350">Your identity documents have been logged successfully.</p>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-5 border border-white/5 space-y-4 text-left">
            <span className="text-[10px] font-black uppercase text-[#ff8000] tracking-widest block">⏳ VERIFICATION IN PROGRESS</span>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              We are currently auditing your Driving Licence <strong className="font-mono text-white text-[11px]">{licenceNumber || currentUser.licenceNumber || 'KA0120230001234'}</strong> and Aadhaar background data. 
            </p>
            <div className="flex items-center gap-3 py-2 border-t border-b border-white/5">
              {selfieImage && (
                <img 
                  src={selfieImage} 
                  alt="Captured Selfie Profile" 
                  className="w-12 h-12 rounded-lg object-cover border border-[#ff8000]/60 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Estimated Time Remaining</span>
                <span className="text-sm text-[#ff8000] font-mono font-black animate-pulse">23 hours 59 minutes</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              You will be notified immediately upon compilation. Once verified, you can immediately begin offering ride shares to other pool buddies!
            </p>
          </div>

          {/* Verification is reviewed by the MoveBuddy admin team. */}
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] text-left">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Our team is reviewing your documents. You'll get a notification the moment your account is verified, and hosting unlocks automatically — no action needed.
            </p>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={onCancel}
              className="w-full bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition duration-150 shadow"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (currentStatus === 'rejected') {
    return (
      <div id="verification_flow_rejected" className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12 animate-fadeIn bg-slate-950/40 rounded-3xl">
        <div id="rejected_glass_card" className="w-full max-w-lg bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-2xl p-8 space-y-6 text-center text-slate-100">
          
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative w-20 h-20 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 rounded-full">
              <AlertTriangle className="w-10 h-10 text-rose-400 animate-bounce" />
            </div>
            <h2 className="text-2xl font-display font-black tracking-tight text-white">Verification Declined</h2>
            <p className="text-xs text-rose-300 font-semibold tracking-wide uppercase">The human compliance compliance team identified matching conflicts.</p>
          </div>

          <div className="bg-rose-950/20 rounded-xl p-5 border border-rose-900/30 text-left space-y-3.5">
            <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest block font-mono">⚠️ AUDIT FEEDBACK RESPONSE:</span>
            <p className="text-xs text-rose-250 leading-relaxed font-semibold">
              "Your uploaded Aadhaar card document scan failed our automated optical character recognition matching. The name listed on the Government Document does not explicitly correlate with your profile name '{currentUser.name}'."
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              Please click below to clean resubmit your valid documentation values to instantly restart the evaluation protocol.
            </p>
          </div>

          {/* SIMULATOR QUICK RESET */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[9px] text-[#ff8000] font-black uppercase tracking-wider block">Simulator Override Tool</span>
              <span className="text-[10px] text-slate-400 font-medium">Reset state instantly here:</span>
            </div>
            <button
              onClick={() => handleSimulateStatus('none')}
              className="bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" /> Reset to Blank Form
            </button>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              onClick={() => handleSimulateStatus('none')}
              className="w-full bg-[#ff8000] hover:bg-[#e07000] text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition shadow border border-[#ff8000]/20"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" /> Re-submit Documents Form
            </button>
          </div>

        </div>
      </div>
    );
  }

  // STANDARD UPLOAD FORM SCREEN (docGate === 'upload')
  return (
    <div id="verification_flow_upload" className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-8 animate-fadeIn">
      
      {/* Centered card (max-w-lg) with dark glass background */}
      <div id="doc_verification_card" className="w-full max-w-lg backdrop-blur-xl border border-white/[0.08] shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6 text-[#F8FAFC]" style={{ backgroundColor: '#767676' }}>
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-white/5">
          {/* Pulsing Animated Orange Shield Icon */}
          <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-[#ff8000]/10 border border-[#ff8000]/20">
            {/* Glowing Rings Loop */}
            <span className="absolute inset-0 rounded-full bg-[#ff8000]/5 animate-ping duration-[3000ms] opacity-60" />
            <span className="absolute inset-1.5 rounded-full animate-pulse duration-[2000ms]" style={{ backgroundColor: '#aba2a2' }} />
            <Shield className="w-8 h-8 text-[#ff8000]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white select-none">Verify Your Identity</h2>
            <p className="text-xs mt-1 font-medium select-none" style={{ color: '#a9bcd8' }}>Submit your documents to start offering rides</p>
          </div>
        </div>

        {/* Global error feedback with expand/collapse feel */}
        {error && (
          <div className="p-3.5 bg-rose-950/40 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/20 flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: Driving Licence */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-sm select-none" style={{ backgroundColor: '#ffb300' }}>1</span>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ffffff' }}>Driving Licence Verification</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: '#a8bcd5' }}>Licence Number</label>
              <input
                type="text"
                required
                maxLength={18}
                value={licenceNumber}
                onChange={(e) => setLicenceNumber(e.target.value.toUpperCase())}
                placeholder="KA0120230001234"
                className="w-full bg-[#0F172A]/80 border border-white/10 rounded-xl py-3 px-4 text-xs font-mono font-bold tracking-widest text-[#ff8000] placeholder-slate-600 focus:outline-none focus:border-[#ff8000] focus:ring-1 focus:ring-[#ff8000] uppercase transition"
              />
            </div>

            {/* Drag & Drop File Upload Zone */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: '#afc0dd' }}>Scan Upload (PDF or Image)</label>
              <div 
                onDragOver={(e) => { e.preventDefault(); setLicenceDragOver(true); }}
                onDragLeave={() => setLicenceDragOver(false)}
                onDrop={handleLicenceDrop}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer select-none transition-all duration-200 ${
                  licenceFileName 
                    ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10' 
                    : licenceDragOver
                      ? 'border-[#ff8000] bg-[#ff8000]/5 shadow-[0_0_15px_rgba(255,128,0,0.15)]'
                      : 'border-white/10 bg-slate-900/30 hover:border-[#ff8000]/50 hover:bg-slate-900/50'
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleLicenceSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {licenceFileName ? (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <FileText className="w-7 h-7 text-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-200 font-bold font-mono line-clamp-1">{licenceFileName}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Click or drag or choose another to change</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#ff8000] transition" />
                    <span className="text-xs text-slate-300 font-bold">Drag and drop file here</span>
                    <span className="text-[10px] text-slate-500">PDF, JPG or PNG up to 5MB</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <hr className="border-white/5" />

          {/* STEP 2: Aadhaar Card */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-sm select-none" style={{ backgroundColor: '#ffb300' }}>2</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffffff]">Aadhaar Card Verification</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: '#afc2e1' }}>12-Digit Aadhaar Number</label>
              <input
                type="text"
                required
                maxLength={14} // to allow formatting spaces
                value={aadhaarNumber}
                onChange={(e) => {
                  // Format input as XXXX XXXX XXXX dynamically
                  const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                  const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                  setAadhaarNumber(formatted);
                }}
                placeholder="0000 0000 0000"
                className="w-full bg-[#0F172A]/80 border border-white/10 rounded-xl py-3 px-4 text-xs font-mono font-bold tracking-[0.25em] text-[#ff8000] placeholder-slate-600 focus:outline-none focus:border-[#ff8000] focus:ring-1 focus:ring-[#ff8000] transition text-center"
              />
            </div>

            {/* Same Drag & Drop zone pattern */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b8c7ef' }}>Scan Upload (PDF or Image)</label>
              <div 
                onDragOver={(e) => { e.preventDefault(); setAadhaarDragOver(true); }}
                onDragLeave={() => setAadhaarDragOver(false)}
                onDrop={handleAadhaarDrop}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer select-none transition-all duration-200 ${
                  aadhaarFileName 
                    ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10' 
                    : aadhaarDragOver
                      ? 'border-[#ff8000] bg-[#ff8000]/5 shadow-[0_0_15px_rgba(255,128,0,0.15)]'
                      : 'border-white/10 bg-slate-900/30 hover:border-[#ff8000]/50 hover:bg-slate-900/50'
                }`}
              >
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleAadhaarSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {aadhaarFileName ? (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <FileText className="w-7 h-7 text-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-200 font-bold font-mono line-clamp-1">{aadhaarFileName}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Click or drag or choose another to change</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#ff8000] transition" />
                    <span className="text-xs text-slate-300 font-bold">Drag and drop file here</span>
                    <span className="text-[10px] text-slate-500">PDF, JPG or PNG up to 5MB</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <hr className="border-white/5" />

          {/* STEP 3: Vehicle Registration (RC) */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-sm select-none" style={{ backgroundColor: '#ffb300' }}>3</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffffff]">Vehicle Registration (RC)</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: '#a8bcd5' }}>Vehicle RC Number</label>
              <input
                type="text"
                required
                maxLength={20}
                value={vehicleRcNumber}
                onChange={(e) => setVehicleRcNumber(e.target.value.toUpperCase())}
                placeholder="WB-02-AL-5544"
                className="w-full bg-[#0F172A]/80 border border-white/10 rounded-xl py-3 px-4 text-xs font-mono font-bold tracking-widest text-[#ff8000] placeholder-slate-600 focus:outline-none focus:border-[#ff8000] focus:ring-1 focus:ring-[#ff8000] uppercase transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: '#afc0dd' }}>RC Scan Upload (PDF or Image)</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setVehicleDragOver(true); }}
                onDragLeave={() => setVehicleDragOver(false)}
                onDrop={handleVehicleDrop}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer select-none transition-all duration-200 ${
                  vehicleFileName
                    ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : vehicleDragOver
                      ? 'border-[#ff8000] bg-[#ff8000]/5 shadow-[0_0_15px_rgba(255,128,0,0.15)]'
                      : 'border-white/10 bg-slate-900/30 hover:border-[#ff8000]/50 hover:bg-slate-900/50'
                }`}
              >
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleVehicleSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {vehicleFileName ? (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <FileText className="w-7 h-7 text-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-200 font-bold font-mono line-clamp-1">{vehicleFileName}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Click or drag or choose another to change</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#ff8000] transition" />
                    <span className="text-xs text-slate-300 font-bold">Drag and drop file here</span>
                    <span className="text-[10px] text-slate-500">PDF, JPG or PNG up to 5MB</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <hr className="border-white/5" />

          {/* STEP 4: Selfie Feature */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-sm select-none" style={{ backgroundColor: '#ffb300' }}>4</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffffff]">Live Selfie Capture</h3>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
              {cameraActive ? (
                <div className="relative w-full max-w-[240px] aspect-[4/3] bg-black rounded-lg overflow-hidden border border-white/10">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover -scale-x-100"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="absolute bottom-2 inset-x-0 flex justify-center">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="bg-[#ff8000] hover:bg-[#e07000] text-slate-950 font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider shadow"
                    >
                      📸 Capture Pic
                    </button>
                  </div>
                </div>
              ) : selfieImage ? (
                <div className="relative flex flex-col items-center space-y-2">
                  <img 
                    src={selfieImage} 
                    alt="Captured Selfie" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#ff8000]/60 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700 font-bold py-1 px-3 rounded-lg text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                    >
                      <Camera className="w-3" /> Take New Selfie
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2.5">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto animate-pulse" />
                  <p className="text-[11px] text-slate-300 font-medium">Capture a clear face photo to verify with document biometric integrity.</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-[#ff8000]/10 hover:bg-[#ff8000]/20 border border-[#ff8000]/30 font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition"
                    style={{ color: '#ffb300' }}
                  >
                    Open Live Webcam Camera
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DEV OVERRIDES NOTICES FROM BLANK STATE */}
          <div className="bg-[#ffb300]/5 border border-[#ffb300]/15 p-3 rounded-lg flex items-start gap-2.5">
            <span className="text-[11px] leading-normal font-bold text-slate-350">
              💡 **QA Prompt / Developer Override:** Skip full document filling? Click to instantly simulate:
            </span>
            <button
              type="button"
              onClick={() => handleSimulateStatus('verified')}
              className="bg-[#ffb300]/90 text-slate-950 font-bold px-2 py-1 rounded text-[8px] uppercase tracking-widest hover:bg-[#ffb300]"
            >
              Simulate Verified
            </button>
          </div>

          {/* Submit Button */}
          <div className="space-y-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full hover:brightness-110 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-widest font-display cursor-pointer flex items-center justify-center gap-2 shadow transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
              style={{ backgroundColor: '#ffb300' }}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Uploading documents…
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Submit for Verification
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-transparent hover:text-white font-bold text-xs uppercase tracking-wider py-2 select-none cursor-pointer"
              style={{ color: '#bac3e5' }}
            >
              Cancel & go back
            </button>

            {/* Footer encryption note */}
            <p className="text-[9px] text-slate-500 text-center leading-relaxed">
              Your documents are encrypted and used only for identity verification. Move Buddy stores all scanned inputs using secure bank-grade vaults.
            </p>
          </div>

        </form>

      </div>
    </div>
  );
}
