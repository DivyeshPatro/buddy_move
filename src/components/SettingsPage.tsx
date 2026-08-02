import React from 'react';
import { Repeat, Wallet, LifeBuoy, LogOut, ChevronRight, ShieldCheck } from 'lucide-react';
import { User, UserRole } from '../types';

interface SettingsPageProps {
  currentUser: User;
  onToggleRole: (r: UserRole) => void;
  onOpenWallet: () => void;
  onOpenTickets: () => void;
  onLogout: () => void;
}

const Item = ({ icon: Icon, label, sub, onClick, danger }: { icon: React.ComponentType<any>; label: string; sub?: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#2a2e34]/8 last:border-0 hover:bg-[#eef0f3] transition-colors ${danger ? 'text-rose-600' : 'text-[#2a2e34]'}`}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50' : 'bg-[#eef0f3]'}`}>
      <Icon className={`w-4 h-4 ${danger ? 'text-rose-600' : 'text-[#b57e00]'}`} />
    </div>
    <div className="text-left min-w-0 flex-1">
      <p className="text-sm font-bold">{label}</p>
      {sub && <p className="text-[11px] text-[#2a2e34]/50">{sub}</p>}
    </div>
    <ChevronRight className="w-4 h-4 text-[#2a2e34]/30 shrink-0" />
  </button>
);

export default function SettingsPage({ currentUser, onToggleRole, onOpenWallet, onOpenTickets, onLogout }: SettingsPageProps) {
  const isHost = currentUser.role === 'host';
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-[#2a2e34]">Settings</h2>
        <p className="text-sm text-[#2a2e34]/60 mt-0.5">Manage your account and preferences.</p>
      </div>

      <div className="bg-white border border-[#ffb300]/15 rounded-2xl overflow-hidden mb-4">
        <Item
          icon={Repeat}
          label={isHost ? 'Switch to Guest mode' : 'Switch to Host mode'}
          sub={isHost ? 'Find rides as a passenger' : 'Offer rides & earn'}
          onClick={() => onToggleRole(isHost ? 'guest' : 'host')}
        />
        <Item icon={Wallet} label="Wallet" sub="Balance, top-up, redeem voucher" onClick={onOpenWallet} />
        <Item icon={LifeBuoy} label="Support & SOS" sub="Raise a ticket or report an issue" onClick={onOpenTickets} />
      </div>

      <div className="bg-white border border-[#ffb300]/15 rounded-2xl overflow-hidden mb-4">
        <Item icon={LogOut} label="Log out" onClick={onLogout} danger />
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#2a2e34]/40">
        <ShieldCheck className="w-3.5 h-3.5" /> Move Buddy · your account is secured
      </div>
    </div>
  );
}
