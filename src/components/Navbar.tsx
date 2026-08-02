import React from 'react';
import { User, UserRole, CustomerView } from '../types';
import NotificationBell from './NotificationBell';
import { 
  Bike, 
  Coins, 
  RefreshCw, 
  LogOut, 
  ShieldAlert, 
  Sparkles, 
  User as UserIcon, 
  LifeBuoy,
  ShieldCheck,
  BadgeCheck,
  Menu,
  X,
  LayoutDashboard,
  CreditCard,
  Settings,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentWalletCredits: number;
  onLogout: () => void;
  onToggleRole: (newRole: UserRole, targetView?: CustomerView) => void;
  onOpenWallet: () => void;
  onOpenTickets: () => void;
  onOpenAdmin: () => void;
  onTriggerAuth: () => void;
  systemLogoUrl?: string;
  onLogoClick?: () => void;
  onNotificationNavigate?: (n: any) => void;
  customerView?: CustomerView;
  onCustomerNavigate?: (v: CustomerView) => void;
  onTriggerSos?: () => void;
}


export default function Navbar({
  currentUser,
  currentWalletCredits,
  onLogout,
  onToggleRole,
  onOpenWallet,
  onOpenTickets,
  onOpenAdmin,
  onTriggerAuth,
  systemLogoUrl,
  onLogoClick,
  onNotificationNavigate,
  customerView,
  onCustomerNavigate,
  onTriggerSos
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close the profile dropdown on outside click / Escape.
  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  // In-app sections shown in the profile dropdown (guests/hosts only).
  const navItems: { id: CustomerView; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'commute', label: currentUser?.role === 'host' ? 'Host Hub' : 'My Commute', icon: Bike },
    { id: 'plans', label: 'Plans', icon: CreditCard },
    { id: 'profile', label: 'Personal Information', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isDarkNavbar = false;

  const getBtnClass = (viewId: CustomerView) => {
    const active = customerView === viewId;
    const base = "p-2 bg-transparent rounded-xl transition-all cursor-pointer relative group flex items-center justify-center";
    if (active) {
      if (isScrolled) return `${base} bg-[#2a2e34]/15 !text-[#2a2e34] font-bold`;
      if (isDarkNavbar) return `${base} bg-[#ffb300]/25 !text-[#ffb300] font-bold`;
      return `${base} bg-[#2a2e34]/10 !text-[#2a2e34] font-bold`;
    } else {
      if (isScrolled) return `${base} !text-[#2a2e34]/70 hover:bg-[#2a2e34]/10 hover:!text-[#2a2e34]`;
      if (isDarkNavbar) return `${base} !text-[#e9eaec]/70 hover:bg-white/10 hover:!text-white`;
      return `${base} !text-[#2a2e34]/70 hover:bg-[#2a2e34]/5 hover:!text-[#2a2e34]`;
    }
  };

  const utilityBtnClass = isScrolled
    ? "p-2 bg-transparent rounded-xl transition-all cursor-pointer relative group flex items-center justify-center !text-[#2a2e34]/70 hover:bg-[#2a2e34]/10 hover:!text-[#2a2e34]"
    : isDarkNavbar
      ? "p-2 bg-transparent rounded-xl transition-all cursor-pointer relative group flex items-center justify-center !text-[#e9eaec]/70 hover:bg-white/10 hover:!text-white"
      : "p-2 bg-transparent rounded-xl transition-all cursor-pointer relative group flex items-center justify-center !text-[#2a2e34]/70 hover:bg-[#2a2e34]/5 hover:!text-[#2a2e34]";

  const logoutBtnClass = isScrolled
    ? "p-2 bg-transparent rounded-xl transition-all cursor-pointer relative group flex items-center justify-center !text-[#2a2e34]/70 hover:bg-[#2a2e34]/10 hover:!text-rose-600"
    : isDarkNavbar
      ? "p-2 bg-transparent rounded-xl transition-all cursor-pointer relative group flex items-center justify-center !text-[#e9eaec]/70 hover:bg-white/10 hover:!text-rose-400"
      : "p-2 bg-transparent rounded-xl transition-all cursor-pointer relative group flex items-center justify-center !text-[#2a2e34]/70 hover:bg-[#2a2e34]/5 hover:!text-rose-600";

  const profileBtnClass = () => {
    const active = customerView === 'profile';
    const base = "p-0.5 rounded-full transition-all cursor-pointer relative group flex items-center justify-center";
    if (active) {
      if (isScrolled) return `${base} ring-2 ring-[#2a2e34] ring-offset-2 ring-offset-[#ffb300]`;
      if (isDarkNavbar) return `${base} ring-2 ring-[#ffb300] ring-offset-2 ring-offset-[#2a2e34]`;
      return `${base} ring-2 ring-[#2a2e34] ring-offset-2 ring-offset-[#e9eaec]`;
    } else {
      return `${base} hover:scale-105`;
    }
  };

  return (
    <nav 
      id="app_navbar" 
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#ffb300] border-b border-black/10 shadow-sm' 
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between font-display">
        
        {/* Dynamic Logo & Name — "go home", never logout (preserves session) */}
        <div
          onClick={onLogoClick}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          {systemLogoUrl ? (
            <img 
              src={systemLogoUrl} 
              className="w-8 h-8 rounded-lg object-cover border border-[#2a2e34]/20" 
              alt="Move Buddy Logo" 
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className={`p-2.5 rounded-xl border shadow-sm transition-colors ${
              isScrolled ? 'bg-white border-black/10' : 'bg-[#ffb300] border-[#2a2e34]/15'
            }`}>
              <Bike className={`w-5 h-5 ${isScrolled ? 'text-[#2a2e34]' : 'text-[#2a2e34]'}`} />
            </div>
          )}
          <div>
            <span className={`font-black tracking-tight text-lg font-display transition-colors duration-300 ${
              isScrolled 
                ? '!text-[#2a2e34]' 
                : (isDarkNavbar ? '!text-[#e9eaec]' : '!text-[#2a2e34]')
            }`}>
              Move Buddy
            </span>
          </div>
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-3">

          {/* Desktop Navigation Items Tray */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <>
                {currentUser.role !== 'admin' ? (
                  <>
                    {/* Mode Switch Toggle Button */}
                    <div className={`flex items-center gap-1 p-1 rounded-full border font-medium ${
                      isScrolled
                        ? 'bg-[#2a2e34]/10 !border-[#2a2e34]/20'
                        : isDarkNavbar 
                          ? 'bg-[#2a2e34]/40 !border-[#ffb300]/15' 
                          : 'bg-[#e9eaec]/55 !border-[#2a2e34]/20'
                    }`}>

                      <button
                        id="toggle_guest_btn"
                        onClick={() => onToggleRole('guest', 'commute')}
                        className={`px-3 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full transition-all cursor-pointer ${
                          currentUser.role === 'guest'
                            ? (isScrolled ? 'bg-white !text-[#2a2e34] shadow-sm' : 'bg-[#ffb300] !text-[#2a2e34] shadow-sm')
                            : isScrolled
                              ? '!text-[#2a2e34]/80 hover:!text-[#2a2e34]'
                              : isDarkNavbar
                                ? '!text-[#e9eaec]/70 hover:!text-[#e9eaec]'
                                : '!text-[#2a2e34]/70 hover:!text-[#2a2e34]'
                        }`}
                      >
                        Guest
                      </button>
                      <button
                        id="toggle_host_btn"
                        onClick={() => onToggleRole('host', 'commute')}
                        className={`px-3 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full transition-all cursor-pointer ${
                          currentUser.role === 'host'
                            ? (isScrolled ? 'bg-white !text-[#2a2e34] shadow-sm' : 'bg-[#ffb300] !text-[#2a2e34] shadow-sm')
                            : isScrolled
                              ? '!text-[#2a2e34]/80 hover:!text-[#2a2e34]'
                              : isDarkNavbar
                                ? '!text-[#e9eaec]/70 hover:!text-[#e9eaec]'
                                : '!text-[#2a2e34]/70 hover:!text-[#2a2e34]'
                        }`}
                      >
                        Host
                      </button>
                    </div>

                    {/* Dashboard Icon */}
                    <button
                      onClick={() => onCustomerNavigate?.('dashboard')}
                      className={getBtnClass('dashboard')}
                    >
                      <LayoutDashboard className="w-4.5 h-4.5" />
                      <span className="absolute top-full mt-2 hidden group-hover:block bg-[#2a2e34] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-50">Dashboard</span>
                    </button>

                    {/* Plans Icon */}
                    <button
                      onClick={() => onCustomerNavigate?.('plans')}
                      className={getBtnClass('plans')}
                    >
                      <CreditCard className="w-4.5 h-4.5" />
                      <span className="absolute top-full mt-2 hidden group-hover:block bg-[#2a2e34] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-50">Plans</span>
                    </button>

                    {/* Support Center Icon */}
                    <button
                      onClick={onOpenTickets}
                      className={utilityBtnClass}
                    >
                      <LifeBuoy className="w-4.5 h-4.5" />
                      <span className="absolute top-full mt-2 hidden group-hover:block bg-[#2a2e34] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-50">Support Center</span>
                    </button>

                    {/* Notification Bell */}
                    <NotificationBell userId={currentUser.id} isScrolled={isScrolled} isDarkNavbar={isDarkNavbar} onNavigate={onNotificationNavigate} />

                    {/* Settings Icon */}
                    <button
                      onClick={() => onCustomerNavigate?.('settings')}
                      className={getBtnClass('settings')}
                    >
                      <Settings className="w-4.5 h-4.5" />
                      <span className="absolute top-full mt-2 hidden group-hover:block bg-[#2a2e34] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-50">Settings</span>
                    </button>

                    {/* Profile Icon */}
                    <button
                      onClick={() => onCustomerNavigate?.('profile')}
                      className={profileBtnClass()}
                    >
                      <img 
                        src={currentUser.avatarUrl} 
                        className="w-8 h-8 rounded-full object-cover border border-[#2a2e34]/20"
                        alt={currentUser.name} 
                      />
                      <span className="absolute top-full mt-2 hidden group-hover:block bg-[#2a2e34] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-50 font-semibold">{currentUser.name}</span>
                    </button>

                    {/* Logout Icon */}
                    <button
                      onClick={onLogout}
                      className={logoutBtnClass}
                    >
                      <LogOut className="w-4.5 h-4.5" />
                      <span className="absolute top-full mt-2 hidden group-hover:block bg-[#2a2e34] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-50">Log Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Admin Panel Quick Link */}
                    <button
                      id="admin_portal_nav_link"
                      onClick={onOpenAdmin}
                      className="bg-[#ffb300] !text-[#2a2e34] hover:bg-[#ffb300]/90 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-[#2a2e34]/25 cursor-pointer flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 !text-[#2a2e34]" />
                      Admin Node
                    </button>
                    {/* Logout Icon */}
                    <button
                      onClick={onLogout}
                      className={logoutBtnClass}
                    >
                      <LogOut className="w-4.5 h-4.5" />
                      <span className="absolute top-full mt-2 hidden group-hover:block bg-[#2a2e34] text-white text-[9px] py-1 px-2 rounded whitespace-nowrap z-50">Log Out</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* Clean Onboard Trigger button */}
                <div className="relative group">
                  <button
                    id="navbar_onboard_btn"
                    onClick={onTriggerAuth}
                    className="bg-[#ffb300] hover:bg-[#ffb300]/90 text-[#2a2e34] p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 border border-[#2a2e34]/15 shadow-sm flex items-center justify-center font-bold"
                  >
                    <ShieldCheck className="w-5 h-5 text-[#2a2e34]" />
                  </button>
                  {/* Tooltip */}
                  <div className="absolute right-0 top-full mt-2.5 hidden group-hover:block bg-[#2a2e34] text-[#e9eaec] text-[10px] py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap z-50 border border-[#ffb300]/15 font-sans font-bold">
                    Profile Verification
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-xl border flex md:hidden items-center justify-center h-10 w-10 transition-all cursor-pointer ${
              isScrolled
                ? '!border-[#2a2e34]/25 !text-[#2a2e34] hover:bg-[#2a2e34]/5'
                : isDarkNavbar
                  ? '!border-[#ffb300]/30 !text-[#ffb300] hover:bg-white/5'
                  : '!border-[#2a2e34]/20 !text-[#2a2e34] hover:bg-[#2a2e34]/5'
            }`}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Navigation Card */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-3 mx-4 p-5 bg-white dark:bg-[#1f2226] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-4 animate-fade-in z-50 relative">
          {currentUser ? (
            <div className="space-y-4 font-sans">
              
              {/* User Bio Badge Card */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <img 
                  src={currentUser.avatarUrl} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#ffb300]" 
                  alt={currentUser.name} 
                />
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      {currentUser.role} Mode
                    </span>
                    {currentUser.isIdVerified && (
                      <span className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-black px-1 rounded">VERIFIED</span>
                    )}
                  </div>
                </div>
                <NotificationBell userId={currentUser.id} onNavigate={onNotificationNavigate} />
              </div>

              {/* Coins / Wallet link inside drawer */}
              <div 
                onClick={() => {
                  onOpenWallet();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-between p-3.5 bg-[#ffb300]/10 dark:bg-slate-900 border border-[#ffb300]/30 rounded-2xl cursor-pointer hover:bg-[#ffb300]/15"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4.5 h-4.5 text-[#ffb300]" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Wallet Credits</span>
                </div>
                <span className="text-xs font-black font-mono text-[#ffb300]">₹{currentWalletCredits}</span>
              </div>

              {/* In-app section navigation */}
              {currentUser.role !== 'admin' && (
                <div className="grid grid-cols-2 gap-1.5">
                  {navItems.map(it => {
                    const Icon = it.icon;
                    const active = customerView === it.id;
                    return (
                      <button
                        key={it.id}
                        onClick={() => { onCustomerNavigate?.(it.id); setIsMobileMenuOpen(false); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${active ? 'bg-[#ffb300] text-[#2a2e34]' : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                      >
                        <Icon className="w-4 h-4 shrink-0" /> {it.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => { onTriggerSos?.(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-transparent border-2 border-rose-500 text-rose-600"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" /> SOS
                  </button>
                </div>
              )}

              {/* Mode Toggle inside drawer */}
              {currentUser.role !== 'admin' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] text-slate-400 block uppercase font-bold tracking-widest">Select Mode</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <button
                      onClick={() => {
                        onToggleRole('guest', 'commute');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        currentUser.role === 'guest'
                          ? 'bg-[#ffb300] text-[#2a2e34] shadow font-black' 
                          : 'text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      Guest Mode
                    </button>
                    <button
                      onClick={() => {
                        onToggleRole('host', 'commute');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        currentUser.role === 'host' 
                          ? 'bg-[#ffb300] text-[#2a2e34] shadow font-black' 
                          : 'text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      Host Mode
                    </button>
                  </div>
                </div>
              )}

              {/* Other Options Grid */}
              <div className="grid grid-cols-1 gap-1.5 pt-2">
                <button
                  onClick={() => {
                    onOpenTickets();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2.5 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl flex items-center gap-2"
                >
                  <LifeBuoy className="w-4 h-4 text-slate-400" />
                  Support Tickets / SOS
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => {
                      onOpenAdmin();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Admin Control Panel
                  </button>
                )}

                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2.5 px-3 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-extrabold text-rose-600 rounded-xl flex items-center gap-2 mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Session
                </button>
              </div>

            </div>
          ) : (
            <div className="p-4 text-center space-y-3 font-sans">
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                Unlock safe coordinate-based commuter matching and locked pricing passes.
              </span>
              <button
                onClick={() => {
                  onTriggerAuth();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] font-black py-2.5 rounded-xl text-xs uppercase font-mono tracking-wider transition-all"
              >
                Profile Verification & Sign In
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
