import { User, UserRole, CustomerView } from '../types';
import IdentityVerification from './IdentityVerification';
import HostCommuteHub from './HostCommuteHub';
import CustomerDashboard from './CustomerDashboard';
import PlansPage from './PlansPage';
import PersonalInfoPage from './PersonalInfoPage';
import SettingsPage from './SettingsPage';

interface HostDashboardProps {
  currentUser: User;
  onRefreshWallet: () => void;
  onUpdateUser?: (user: User) => void;
  onExit?: () => void;
  onToggleRole: (r: UserRole, targetView?: CustomerView) => void;
  onOpenWallet: () => void;
  onOpenTickets: () => void;
  onLogout: () => void;
  view: CustomerView;
  onNavigate: (v: CustomerView) => void;
}

// Hosts verify their ID first; section navigation lives in the top navbar.
export default function HostDashboard({ currentUser, onRefreshWallet, onUpdateUser, onExit, onToggleRole, onOpenWallet, onOpenTickets, onLogout, view, onNavigate }: HostDashboardProps) {
  if (!currentUser.isIdVerified) {
    return (
      <IdentityVerification
        currentUser={currentUser}
        onUpdateUser={(u) => onUpdateUser?.(u)}
        onCancel={() => onExit?.()}
      />
    );
  }

  switch (view) {
    case 'commute':
      return <HostCommuteHub currentUser={currentUser} onRefreshWallet={onRefreshWallet} />;
    case 'plans':
      return <PlansPage currentUser={currentUser} onGoToCommute={() => onNavigate('commute')} onRefreshWallet={onRefreshWallet} />;
    case 'profile':
      return <PersonalInfoPage currentUser={currentUser} />;
    case 'settings':
      return <SettingsPage currentUser={currentUser} onToggleRole={onToggleRole} onOpenWallet={onOpenWallet} onOpenTickets={onOpenTickets} onLogout={onLogout} />;
    default:
      return <CustomerDashboard currentUser={currentUser} onGoToCommute={() => onNavigate('commute')} onRefreshWallet={onRefreshWallet} onToggleRole={onToggleRole} />;
  }
}
