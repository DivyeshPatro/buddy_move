import React, { useRef, useState } from 'react';
import { User, UserRole } from '../types';
import { X, Shield, Phone, Mail, User as UserIcon, CheckCircle, ArrowRight, Loader } from 'lucide-react';
import { firebaseAuth, firebaseEnabled } from '../lib/firebase';
import { setTokens } from '../lib/session';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
  defaultRole?: UserRole;
}

export default function AuthModal({ onClose, onSuccess, defaultRole = 'guest' }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [collegeOrCompany, setCollegeOrCompany] = useState('');

  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  // Whether this login is going through real Firebase phone OTP (vs. the
  // backend dev-code path used for email/admin logins or when Firebase is off).
  const [usingFirebase, setUsingFirebase] = useState(false);
  const [devOtpEnabled, setDevOtpEnabled] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const isEmail = (v: string) => v.includes('@');

  // Lazily create an invisible reCAPTCHA verifier (required by Firebase phone auth on web).
  const getRecaptcha = () => {
    if (!firebaseAuth) throw new Error('Firebase not configured');
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });
    }
    return recaptchaRef.current;
  };

  // Send a real OTP SMS via Firebase to the given phone number.
  const sendFirebaseOtp = async (phoneNumber: string) => {
    confirmationRef.current = await signInWithPhoneNumber(firebaseAuth!, phoneNumber, getRecaptcha());
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const contact = phone.trim();
    // Normalise to E.164 for Firebase. Bare 10-digit numbers are assumed Indian (+91).
    const toE164 = (raw: string) => {
      let d = raw.replace(/[^\d+]/g, '');
      if (d.startsWith('+')) return d;
      d = d.replace(/^0+/, '');
      if (d.length === 10) return '+91' + d;
      return '+' + d;
    };
    const phoneE164 = isEmail(contact) ? contact : toE164(contact);
    // Use real Firebase phone OTP when configured and the contact is a phone number.
    const wantFirebase = firebaseEnabled && !isEmail(contact);

    if (isLogin) {
      if (!contact) {
        setError('Please enter your registered Email or Phone number');
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneOrEmail: contact })
        });
        let data;
        try {
          data = await response.json();
        } catch (e) {
          setError('Invalid response from server.');
          return;
        }

        if (data.isNew) {
          setIsLogin(false);
          setIsLoading(false);
          setError('Email/Phone not found. Please complete the instant registration form below!');
          setDevOtpEnabled(!!data.devOtp);
          return;
        }
        setSessionUser(data.user);
        let fb = false;
        if (wantFirebase) {
          try { await sendFirebaseOtp(data.user?.phone || phoneE164); fb = true; }
          catch (e) { console.warn('[auth] Firebase phone OTP unavailable, falling back to dev code:', e); }
        }
        setUsingFirebase(fb);
        setDevOtpEnabled(!!data.devOtp);
        setStep(2);
      } catch (err: any) {
        setError(err?.message || 'Could not send the verification code. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!name || !email || !phone) {
        setError('Please fill in Name, Email, and Phone number');
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone: phoneE164,
            gender,
            companyOrCollege: collegeOrCompany,
            role: defaultRole
          })
        });
        let data;
        try {
          data = await response.json();
        } catch (e) {
          setError('Invalid response from server.');
          return;
        }
        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }
        setSessionUser(data.user);
        let fb = false;
        if (wantFirebase) {
          try { await sendFirebaseOtp(phoneE164); fb = true; }
          catch (e) { console.warn('[auth] Firebase phone OTP unavailable, falling back to dev code:', e); }
        }
        setUsingFirebase(fb);
        setDevOtpEnabled(!!data.devOtp);
        setStep(2);
      } catch (err: any) {
        setError(err?.message || 'Registration failed. Please check your details and try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const fullCode = otp.join('');

    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      setIsLoading(false);
      return;
    }

    if (!usingFirebase && !devOtpEnabled) {
      setError('Dev OTP not enabled on server. Please use phone/email verification or contact admin.');
      setIsLoading(false);
      return;
    }

    try {
      let body: Record<string, unknown> = { userId: sessionUser?.id };

      if (usingFirebase) {
        // Confirm the SMS code with Firebase, then send its ID token to the backend.
        if (!confirmationRef.current) throw new Error('Verification session expired. Please resend the code.');
        const cred = await confirmationRef.current.confirm(fullCode);
        const idToken = await cred.user.getIdToken();
        body = { userId: sessionUser?.id, firebaseIdToken: idToken };
      } else {
        // Dev / email path: backend validates the code (123456 in dev mode).
        body = { userId: sessionUser?.id, code: fullCode };
      }

      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      // Safely parse JSON response; handle empty or malformed bodies gracefully.
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // If parsing fails (e.g., empty response), keep data as empty object.
        data = {};
      }
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid code. Please try again.');
        setIsLoading(false);
        return;
      }

      // Store the real JWT for authenticated requests.
      setTokens(data.token, data.refreshToken);
      setIsLoading(false);
      onSuccess(data.user || sessionUser);
    } catch (err: any) {
      const msg = err?.code === 'auth/invalid-verification-code'
        ? 'Incorrect code. Please check and try again.'
        : (err?.message || 'Verification failed. Please try again.');
      setError(msg);
      setIsLoading(false);
    }
  };

  const handleTruecallerLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/truecaller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone || '+919876543210',
          name: name || (isLogin ? 'Saurav Sharma' : 'MoveBuddy Commuter'),
          email: email || undefined
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }
      if (data.token && data.user) {
        setTokens(data.token, data.refreshToken);
        setIsLoading(false);
        onSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Truecaller authentication failed');
      setIsLoading(false);
    }
  };
  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const nextOtp = [...otp];
    nextOtp[index] = val;
    setOtp(nextOtp);

    // Auto focus next input
    if (val && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (el) el.focus();
    }
  };

  return (
    <div id="auth_portal" className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div id="auth_container" className="relative w-full max-w-md my-auto max-h-[96vh] overflow-y-auto !bg-[#2a2e34] !text-[#e9eaec] rounded-2xl shadow-2xl transition-all border !border-[#ffb300]/30">
        
        {/* Banner with style */}
        <div className="!bg-[#ffb300] !text-[#2a2e34] p-6 relative border-b !border-[#2a2e34]/15">
          <button 
            id="close_auth_btn"
            onClick={onClose} 
            className="absolute top-4 right-4 !bg-[#2a2e34]/10 hover:!bg-[#2a2e34]/20 rounded-full p-1.5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 !text-[#2a2e34]" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 !text-[#2a2e34]" />
            <span className="font-display font-black tracking-wider text-xs uppercase !text-[#2a2e34]">Security Gate</span>
          </div>
          <h2 className="font-display text-2xl font-bold !text-[#2a2e34]">Welcome to Move Buddy</h2>
          <p className="text-sm !text-[#2a2e34]/85 mt-1 font-medium">Connecting reliable campus & office commute circles.</p>
        </div>

        <div className="p-6">
          {error && (
            <div id="auth_error" className="!bg-rose-950/80 border-l-4 border-rose-500 !text-rose-200 text-sm p-3 rounded mb-4 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="!text-rose-400 hover:!text-rose-200 font-bold ml-1 cursor-pointer">×</button>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div id="auth_mode_selector" className="flex !bg-[#1c1f22] p-1 rounded-xl mb-4 border !border-[#ffb300]/10">
                <button
                  type="button"
                  id="tab_login"
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-1.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    isLogin 
                      ? '!bg-[#ffb300] !text-[#2a2e34] shadow-sm' 
                      : '!bg-transparent !text-[#e9eaec]/60 hover:!text-[#e9eaec]'
                  }`}
                >
                  Verify Access
                </button>
                <button
                  type="button"
                  id="tab_signup"
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-1.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    !isLogin 
                      ? '!bg-[#ffb300] !text-[#2a2e34] shadow-sm' 
                      : '!bg-transparent !text-[#e9eaec]/60 hover:!text-[#e9eaec]'
                  }`}
                >
                  New Account
                </button>
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-semibold !text-[#ffb300] uppercase tracking-wider mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 w-4 h-4 !text-[#e9eaec]/40 z-10" />
                      <input
                        type="text"
                        required
                        id="reg_name_input"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                        className="w-full !bg-[#1c1f22] border !border-[#ffb300]/25 rounded-xl py-2.5 !pl-10 pr-4 !text-[#e9eaec] placeholder-[#e9eaec]/30 text-sm focus:outline-none focus:!border-[#ffb300]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold !text-[#ffb300] uppercase tracking-wider mb-1">Email ID</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 !text-[#e9eaec]/40 z-10" />
                        <input
                          type="email"
                          required
                          id="reg_email_input"
                          placeholder="john@work.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          style={{ paddingLeft: '2.5rem' }}
                          className="w-full !bg-[#1c1f22] border !border-[#ffb300]/25 rounded-xl py-2.5 !pl-10 pr-4 !text-[#e9eaec] placeholder-[#e9eaec]/30 text-sm focus:outline-none focus:!border-[#ffb300]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold !text-[#ffb300] uppercase tracking-wider mb-1">Gender</label>
                      <select
                        value={gender}
                        id="reg_gender_select"
                        onChange={(e: any) => setGender(e.target.value)}
                        className="w-full !bg-[#1c1f22] border !border-[#ffb300]/25 rounded-xl py-2.5 px-3 !text-[#e9eaec] text-sm focus:outline-none focus:!border-[#ffb300]"
                      >
                        <option value="male" className="!bg-[#2a2e34] !text-[#e9eaec]">Male</option>
                        <option value="female" className="!bg-[#2a2e34] !text-[#e9eaec]">Female</option>
                        <option value="other" className="!bg-[#2a2e34] !text-[#e9eaec]">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold !text-[#ffb300] uppercase tracking-wider mb-1">Office / College Affiliation</label>
                    <input
                      type="text"
                      id="reg_org_input"
                      placeholder="e.g. St. Xavier College, TechCorp"
                      value={collegeOrCompany}
                      onChange={(e) => setCollegeOrCompany(e.target.value)}
                      className="w-full !bg-[#1c1f22] border !border-[#ffb300]/25 rounded-xl py-2.5 px-4 !text-[#e9eaec] placeholder-[#e9eaec]/30 text-sm focus:outline-none focus:!border-[#ffb300]"
                    />
                    <p className="text-[11px] !text-[#e9eaec]/50 mt-1">Unlocks company/college verified system badge automatically.</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold !text-[#ffb300] uppercase tracking-wider mb-1">
                  {isLogin ? 'Registered Email or Phone Contact' : 'Security Phone Number (for OTP)'}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 !text-[#e9eaec]/40 z-10" />
                  <input
                    type="text"
                    required
                    id="auth_contact_input"
                    placeholder={isLogin ? 'saurav.sharma@techcorp.com or +919876543210' : '+91 99999 88888'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    className="w-full !bg-[#1c1f22] border !border-[#ffb300]/25 rounded-xl py-2.5 !pl-10 pr-4 !text-[#e9eaec] placeholder-[#e9eaec]/30 text-sm focus:outline-none focus:!border-[#ffb300]"
                  />
                </div>
                {isLogin && (
                  <div className="mt-3.5 text-xs !bg-[#1c1f22] p-3 rounded-xl border !border-[#ffb300]/15 flex flex-col gap-2">
                    <span className="font-bold !text-[#e9eaec]">Review Testing Accounts (Click to load):</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      <button 
                        type="button" 
                        onClick={() => { setPhone('+919876543210'); setIsLogin(true); }}
                        className="!bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] px-2.5 py-1 rounded-lg text-[10px] transition-all font-mono font-bold border border-[#2a2e34]/15 cursor-pointer"
                      >
                        Saurav (Host)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setPhone('+919876543211'); setIsLogin(true); }}
                        className="!bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] px-2.5 py-1 rounded-lg text-[10px] transition-all font-mono font-bold border border-[#2a2e34]/15 cursor-pointer"
                      >
                        Ananya (Host)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setPhone('+919111222333'); setIsLogin(true); }}
                        className="!bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] px-2.5 py-1 rounded-lg text-[10px] transition-all font-mono font-bold border border-[#2a2e34]/15 cursor-pointer"
                      >
                        Rahul (Guest)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setPhone('admin@movebuddy.com'); setIsLogin(true); }}
                        className="!bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] px-2.5 py-1 rounded-lg text-[10px] transition-all font-mono font-bold border border-[#2a2e34]/15 cursor-pointer"
                      >
                        Admin Portal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                id="sumbit_send_otp_btn"
                disabled={isLoading}
                className="w-full !bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-display border !border-[#2a2e34]/15 shadow-sm"
              >
                {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Request 6-Digit Code'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="pt-3 border-t border-[#ffb300]/15 space-y-2">
                <div className="text-center text-[10px] font-bold uppercase tracking-wider !text-[#e9eaec]/50">
                  Instant Verification Options
                </div>
                <button
                  type="button"
                  id="btn_truecaller_auth"
                  onClick={handleTruecallerLogin}
                  disabled={isLoading}
                  className="w-full !bg-[#0087FF] hover:!bg-[#0073DA] !text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm shadow-md border border-white/10"
                >
                  <Shield className="w-4 h-4" />
                  <span>Continue with Truecaller</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-[#ffb300] mx-auto mb-2" />
                <p className="text-sm !text-[#e9eaec]">Verification code pushed to your device.</p>
                <p className="text-xs !text-[#e9eaec]/60 mt-0.5">Please check email or Messages list.</p>
              </div>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-12 h-12 text-center text-xl font-bold border !border-[#ffb300]/30 rounded-xl !bg-[#1c1f22] focus:outline-none focus:!border-[#ffb300] !text-[#ffb300] focus:!bg-[#2a2e34]"
                  />
                ))}
              </div>

              {!usingFirebase && devOtpEnabled ? (
                <div className="!bg-[#1c1f22] p-3 rounded-xl border !border-[#ffb300]/15 text-center text-xs !text-[#e9eaec]/85">
                  🔑 <strong className="!text-[#e09d00]">Dev Code:</strong> Enter <span className="font-mono !bg-[#2a2e34] !text-[#ffb300] px-2 py-0.5 rounded-lg font-bold border !border-[#ffb300]/20 mx-1">123456</span> to access.
                </div>
              ) : (
                <div className="!bg-[#1c1f22] p-3 rounded-xl border !border-[#ffb300]/15 text-center text-xs !text-[#e9eaec]/85">
                  📲 A 6-digit code was sent via SMS to <strong className="!text-[#e09d00]">{phone}</strong>.
                </div>
              )}

              <button
                type="submit"
                id="submit_verify_otp_btn"
                className="w-full !bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] font-bold py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-display border !border-[#2a2e34]/15"
              >
                {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : 'Verify & Enter Move Buddy'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs font-bold !text-[#e9eaec]/60 hover:!text-[#ffb300] uppercase tracking-wider block transition-colors mt-2 cursor-pointer"
              >
                Change Contact Number
              </button>
            </form>
          )}
        </div>

        {/* Invisible reCAPTCHA mount point required by Firebase phone auth */}
        <div id="recaptcha-container" />

      </div>
    </div>
  );
}
