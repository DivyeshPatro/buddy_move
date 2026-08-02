import React from 'react';
import { Mail, Phone, User as UserIcon, Building2, BadgeCheck, ShieldAlert, Star, Award, CalendarDays } from 'lucide-react';
import { User } from '../types';

interface PersonalInfoPageProps {
  currentUser: User;
}

const Row = ({ icon: Icon, label, value }: { icon: React.ComponentType<any>; label: string; value?: string | number }) => (
  <div className="flex items-center gap-3 py-3 border-b border-[#2a2e34]/8 last:border-0">
    <div className="w-9 h-9 rounded-xl bg-[#eef0f3] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#b57e00]" /></div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider font-bold text-[#2a2e34]/45">{label}</p>
      <p className="text-sm font-semibold text-[#2a2e34] break-words">{value || '—'}</p>
    </div>
  </div>
);

export default function PersonalInfoPage({ currentUser: u }: PersonalInfoPageProps) {
  const verified = u.isIdVerified;
  const status = u.verificationStatus || (verified ? 'verified' : 'none');
  const memberSince = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-[#2a2e34]">Personal Information</h2>
        <p className="text-sm text-[#2a2e34]/60 mt-0.5">Your profile and verification status.</p>
      </div>

      {/* Profile header */}
      <div className="bg-white border border-[#ffb300]/25 rounded-2xl p-5 flex items-center gap-4 mb-4">
        <img src={u.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-[#ffb300]/50 shrink-0" />
        <div className="min-w-0">
          <p className="text-lg font-black text-[#2a2e34] truncate">{u.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#eef0f3] text-[#2a2e34]/70 px-2 py-0.5 rounded-full">{u.role}</span>
            {verified ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-700 px-2 py-0.5 rounded-full"><BadgeCheck className="w-3 h-3" /> Verified</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/15 text-amber-700 px-2 py-0.5 rounded-full"><ShieldAlert className="w-3 h-3" /> {status === 'pending' ? 'Verification pending' : 'Not verified'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border border-[#ffb300]/15 rounded-2xl px-5 py-1 mb-4">
        <Row icon={Mail} label="Email" value={u.email} />
        <Row icon={Phone} label="Phone" value={u.phone} />
        <Row icon={UserIcon} label="Gender" value={u.gender} />
        <Row icon={Building2} label="Office / College" value={u.companyOrCollege} />
        {memberSince && <Row icon={CalendarDays} label="Member since" value={memberSince} />}
      </div>

      {/* Trust metrics (real) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#ffb300]/15 rounded-2xl p-4 flex items-center gap-3">
          <Award className="w-5 h-5 text-[#b57e00]" />
          <div><p className="text-[10px] uppercase tracking-wider font-bold text-[#2a2e34]/45">Buddy Score</p><p className="text-xl font-black text-[#2a2e34]">{u.buddyScore ?? '—'}</p></div>
        </div>
        <div className="bg-white border border-[#ffb300]/15 rounded-2xl p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-[#b57e00]" />
          <div><p className="text-[10px] uppercase tracking-wider font-bold text-[#2a2e34]/45">Rating</p><p className="text-xl font-black text-[#2a2e34]">{u.rating ? `${u.rating} ★` : 'New'}</p></div>
        </div>
      </div>

      <p className="text-[11px] text-[#2a2e34]/45 mt-4 text-center">To update your name, email or phone, please contact support.</p>
    </div>
  );
}
