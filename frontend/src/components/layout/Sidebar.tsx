import { LayoutDashboard, ArrowDownToLine, ScrollText, Settings, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Page = 'overview' | 'withdrawals' | 'ledger' | 'admin';

interface SidebarProps {
  page: Page;
  onNavigate: (p: Page) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
  { id: 'withdrawals', label: 'Withdrawals', icon: <ArrowDownToLine size={15} /> },
  { id: 'ledger', label: 'Ledger', icon: <ScrollText size={15} /> },
  { id: 'admin', label: 'Admin Panel', icon: <Settings size={15} /> },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function Sidebar({ page, onNavigate, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  const visibleNavItems = navItems.filter(item => {
    if (item.id === 'admin') {
      return user?.role === 'admin';
    }
    return true;
  });

  const handleNavClick = (id: Page) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-name">Rustyn Affiliate</span>
          <button className="sidebar-close-btn" onClick={onClose} title="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-label">Menu</p>
          <nav className="sidebar-nav">
            {visibleNavItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user ? initials(user.name) : '?'}</div>
            <div className="user-info">
              <div className="user-name">{user?.id}</div>
              <div className="user-role">{user?.role === 'admin' ? 'Administrator' : 'Affiliate'}</div>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
