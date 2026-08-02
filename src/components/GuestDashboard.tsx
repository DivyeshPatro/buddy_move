import { User, UserRole, CustomerView } from '../types';
import GuestCommuteHub from './GuestCommuteHub';
import CustomerDashboard from './CustomerDashboard';
import PlansPage from './PlansPage';
import PersonalInfoPage from './PersonalInfoPage';
import SettingsPage from './SettingsPage';

interface GuestDashboardProps {
  currentUser: User;
  onRefreshWallet: () => void;
  onToggleRole: (r: UserRole, targetView?: CustomerView) => void;
  onOpenWallet: () => void;
  onOpenTickets: () => void;
  onLogout: () => void;
  view: CustomerView;                 // active section (driven by the top navbar)
  onNavigate: (v: CustomerView) => void;
}

// Section content for the logged-in guest. Navigation lives in the top navbar.
export default function GuestDashboard({ currentUser, onRefreshWallet, onToggleRole, onOpenWallet, onOpenTickets, onLogout, view, onNavigate }: GuestDashboardProps) {
  switch (view) {
    case 'commute':
      return <GuestCommuteHub currentUser={currentUser} onRefreshWallet={onRefreshWallet} />;
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
