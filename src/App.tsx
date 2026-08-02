import React, { useState, useEffect } from 'react';
import { User, Wallet, UserRole, CustomerView } from './types';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import WalletModal from './components/WalletModal';
import GuestDashboard from './components/GuestDashboard';
import HostDashboard from './components/HostDashboard';
import AdminDashboard from './components/AdminDashboard';
import SupportModal from './components/SupportModal';
import ChatModal from './components/ChatModal';
import AiCompanionWidget from './components/AiCompanionWidget';
import { clearTokens } from './lib/session';

export default function App() {
  // Session states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<UserRole>('guest');
  // When true AND the user is logged in, show the landing/home page WITHOUT
  // dropping the session (so "Back to Home" and the logo never force re-auth).
  const [showHome, setShowHome] = useState(true);
  // Active in-app section (driven from the top navbar menu).
  const [customerView, setCustomerView] = useState<CustomerView>('dashboard');
  const [sosMsg, setSosMsg] = useState('');
  
  // Load branding on startup and apply the configured logo/title.
  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then((brandingConfig) => {
        if (brandingConfig?.logoUrl) {
          setLogoUrl(brandingConfig.logoUrl);
        }
        if (brandingConfig?.appName) {
          document.title = brandingConfig.appName;
        }
      })
      .catch(() => null);
  }, []);
  
  // App view toggle modals
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Chat context state
  const [activeChat, setActiveChat] = useState<{
    receiverId: string;
    receiverName: string;
    rideId: string;
  } | null>(null);

  // Wallet info
  const [wallet, setWallet] = useState<Wallet | null>(null);
  
  // Admin-supplied logo & alerts configuration states
  const [logoUrl, setLogoUrl] = useState('');

  // When a session expires (token refresh failed on a 401), return to login.
  useEffect(() => {
    const onExpired = () => handleLogout();
    window.addEventListener('mb:session-expired', onExpired);
    return () => window.removeEventListener('mb:session-expired', onExpired);
  }, []);

  // Persist sessions nicely. Restore the cached snapshot for an instant render,
  // then revalidate against the server so an already-registered user always lands
  // with their CURRENT profile (role, verification status, etc.) — never a stale
  // copy that wrongly bounces a verified host back into ID/profile setup.
  useEffect(() => {
    const saved = localStorage.getItem('movebuddy_user_session');
    if (!saved) return;
    let cached: User | null = null;
    try {
      cached = JSON.parse(saved);
      setCurrentUser(cached);
    } catch (e) {
      console.error("Session parse failed", e);
      localStorage.removeItem('movebuddy_user_session');
      return;
    }
    if (!cached?.id) return;

    const verifySession = async () => {
      try {
        const res = await fetch(`/api/auth/me/${cached.id}`);
        if (res.ok) {
          const fresh: User = await res.json();
          if (fresh?.id) {
            setCurrentUser(fresh);
            localStorage.setItem('movebuddy_user_session', JSON.stringify(fresh));
          }
          return;
        }
        clearTokens();
        localStorage.removeItem('movebuddy_user_session');
        setCurrentUser(null);
      } catch (error) {
        // offline — keep cached snapshot until the user interacts again.
      }
    };

    verifySession();
  }, []);

  const refreshWalletBalance = async (userId: string) => {
    try {
      const res = await fetch(`/api/wallet/${userId}`);
      const data = await res.json();
      setWallet(data);
    } catch (e) {
      console.error("Failed fetching wallet indices", e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshWalletBalance(currentUser.id);
      
      // Fetch logo settings too
      fetch('/api/admin/metrics')
        .then(res => res.json())
        .then(data => {
          if (data.systemSettings?.logoUrl) {
            setLogoUrl(data.systemSettings.logoUrl);
          }
        })
        .catch(err => console.debug("Offline admin state"));
    }
  }, [currentUser]);

  const handleStartAuth = (role: UserRole) => {
    // Already authenticated (e.g. landed on the home page via "Back to Home")?
    // Enter the app in the requested role on the ride page — never re-prompt.
    // "Find a Ride"/"Offer a Ride" go straight to the commute (ride) page; the
    // Dashboard is reached only via its own navbar icon.
    if (currentUser) {
      setShowHome(false);
      if (currentUser.role !== 'admin' && currentUser.role !== role) {
        handleToggleRole(role, 'commute');     // switch role AND open the ride page
      } else if (currentUser.role !== 'admin') {
        setCustomerView('commute');            // same role → straight to the ride page
      }
      return;
    }
    setAuthDefaultRole(role);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (user: User) => {
    // If login returned admin, automatically route to admin
    const resolvedUser = { ...user };
    if (user.email.toLowerCase() === 'admin@movebuddy.com') {
      resolvedUser.role = 'admin';
    }

    setCurrentUser(resolvedUser);
    localStorage.setItem('movebuddy_user_session', JSON.stringify(resolvedUser));
    setShowAuthModal(false);
    setShowHome(false);
    // Auth is triggered from the "Find a Ride"/"Offer a Ride" CTAs, so land the
    // user on the ride (commute) page, not the Dashboard. Admins route to the
    // admin panel regardless of this view.
    setCustomerView('commute');
  };

  // Navbar menu → switch in-app section (and leave the home view if on it).
  const handleCustomerNavigate = (v: CustomerView) => {
    setShowHome(false);
    setCustomerView(v);
  };

  // Emergency SOS from the navbar — files a real SOS ticket + brief confirmation.
  const triggerSos = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/support/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, senderName: currentUser.name, ticketType: 'sos', category: 'CRITICAL EMERGENCY', description: `SOS triggered by ${currentUser.name}.` }),
      });
      setSosMsg('🚨 SOS sent — support & emergency contacts notified.');
    } catch { setSosMsg('Could not send SOS. Please call your local emergency number.'); }
    setTimeout(() => setSosMsg(''), 6000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setWallet(null);
    clearTokens();
    localStorage.removeItem('movebuddy_user_session');
    // close all modals
    setIsWalletOpen(false);
    setIsTicketsOpen(false);
    setIsAdminOpen(false);
    setActiveChat(null);
    setShowHome(false);
    setCustomerView('dashboard');
  };

  // "Go home" — used by the logo and the verification "Back to Home" button.
  // Shows the landing/home page but KEEPS the user signed in (no re-registration).
  const handleGoHome = () => {
    setIsWalletOpen(false);
    setIsTicketsOpen(false);
    setIsAdminOpen(false);
    setActiveChat(null);
    if (currentUser) setShowHome(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When a session expires (token refresh failed on a 401), return to login.
  useEffect(() => {
    const onExpired = () => handleLogout();
    window.addEventListener('mb:session-expired', onExpired);
    return () => window.removeEventListener('mb:session-expired', onExpired);
  }, []);

  const handleToggleRole = async (newRole: UserRole, targetView: CustomerView = 'dashboard') => {
    if (!currentUser) return;
    setShowHome(false); // switching role enters the app
    setCustomerView(targetView);

    try {
      const res = await fetch('/api/auth/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, mode: newRole })
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...currentUser, role: newRole };
        setCurrentUser(updatedUser);
        localStorage.setItem('movebuddy_user_session', JSON.stringify(updatedUser));
      }
    } catch {
      // offline fallback
      const updatedUser = { ...currentUser, role: newRole };
      setCurrentUser(updatedUser);
      localStorage.setItem('movebuddy_user_session', JSON.stringify(updatedUser));
    }
  };

  const handleOpenChat = (receiverId: string, receiverName: string, rideId: string) => {
    setActiveChat({ receiverId, receiverName, rideId });
  };

  // Route a tapped notification to the most relevant view. Wallet, promo and
  // voucher notifications open the wallet (where funds + code redemption live);
  // match/subscription/verification updates surface on the dashboard the user
  // is already on, so no extra navigation is needed.
  const handleNotificationNavigate = (n: { type?: string }) => {
    if (!currentUser) return;
    switch (n.type) {
      case 'wallet':
      case 'promo':
      case 'voucher':
        setIsWalletOpen(true);
        break;
      default:
        break;
    }
  };

  const handleSettingsSaved = (settings: any) => {
    if (settings?.logoUrl) {
      setLogoUrl(settings.logoUrl);
    }
  };

  return (
    <div id="main_app_workspace" className="min-h-screen bg-[#e9eaec] dark:bg-[#2a2e34] text-[#2a2e34] dark:text-[#e9eaec] selection:bg-[#ffb300] selection:text-[#2a2e34] flex flex-col justify-between transition-colors duration-300">
      
      {/* Navbar segment */}
      <Navbar
        currentUser={currentUser}
        currentWalletCredits={wallet?.credits || 0}
        onLogout={handleLogout}
        onToggleRole={handleToggleRole}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenTickets={() => setIsTicketsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onTriggerAuth={() => handleStartAuth('guest')}
        systemLogoUrl={logoUrl}
        onLogoClick={handleGoHome}
        onNotificationNavigate={handleNotificationNavigate}
        customerView={customerView}
        onCustomerNavigate={handleCustomerNavigate}
        onTriggerSos={triggerSos}
      />

      {/* Global SOS confirmation toast */}
      {sosMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[92%]">
          <div className="bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold p-3 rounded-xl text-center shadow-lg">{sosMsg}</div>
        </div>
      )}

      {/* Main Container screen routing */}
      <main className={`flex-1 ${currentUser && !showHome ? 'pt-20' : ''}`}>
        {currentUser && !showHome ? (
          <>
            {/* Admin panel — only accessible when role is strictly 'admin' */}
            {currentUser.role === 'admin' ? (
              <AdminDashboard
                key={currentUser.id}
                currentUser={currentUser}
                onSettingsSaved={handleSettingsSaved}
                onRefreshWallet={() => refreshWalletBalance(currentUser.id)}
              />
            ) : currentUser.role === 'host' ? (
              <HostDashboard
                key={currentUser.id}
                currentUser={currentUser}
                onRefreshWallet={() => refreshWalletBalance(currentUser.id)}
                onUpdateUser={(updatedUser) => {
                  setCurrentUser(updatedUser);
                  localStorage.setItem('movebuddy_user_session', JSON.stringify(updatedUser));
                }}
                onExit={handleGoHome}
                onToggleRole={handleToggleRole}
                onOpenWallet={() => setIsWalletOpen(true)}
                onOpenTickets={() => setIsTicketsOpen(true)}
                onLogout={handleLogout}
                view={customerView}
                onNavigate={handleCustomerNavigate}
              />
            ) : (
              <GuestDashboard
                key={currentUser.id}
                currentUser={currentUser}
                onRefreshWallet={() => refreshWalletBalance(currentUser.id)}
                onToggleRole={handleToggleRole}
                onOpenWallet={() => setIsWalletOpen(true)}
                onOpenTickets={() => setIsTicketsOpen(true)}
                onLogout={handleLogout}
                view={customerView}
                onNavigate={handleCustomerNavigate}
              />
            )}
          </>
        ) : (
          <LandingPage onStartAuth={handleStartAuth} />
        )}
      </main>

      {/* Dynamic floating chatbot companion */}
      <AiCompanionWidget />

      {/* Modals Layer */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          defaultRole={authDefaultRole}
        />
      )}

      {isWalletOpen && currentUser && (
        <WalletModal
          currentUser={currentUser}
          wallet={wallet}
          onClose={() => setIsWalletOpen(false)}
          onRefreshWallet={() => refreshWalletBalance(currentUser.id)}
        />
      )}

      {isTicketsOpen && currentUser && (
        <SupportModal
          currentUser={currentUser}
          onClose={() => setIsTicketsOpen(false)}
        />
      )}

      {activeChat && currentUser && (
        <ChatModal
          currentUser={currentUser}
          receiverId={activeChat.receiverId}
          receiverName={activeChat.receiverName}
          rideId={activeChat.rideId}
          onClose={() => setActiveChat(null)}
        />
      )}

    </div>
  );
}
