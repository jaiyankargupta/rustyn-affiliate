import { Menu, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

type Page = 'overview' | 'withdrawals' | 'ledger' | 'admin';

const titles: Record<Page, string> = {
  overview: 'Overview',
  withdrawals: 'Withdrawals',
  ledger: 'Ledger',
  admin: 'Admin Panel',
};

interface TopbarProps {
  page: Page;
  onRefresh: () => void;
  loading: boolean;
  onMenuToggle?: () => void;
}

export function Topbar({ page, onRefresh, loading, onMenuToggle }: TopbarProps) {
  const { theme, toggle } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle-btn" onClick={onMenuToggle} title="Open menu">
          <Menu size={18} />
        </button>
        <span className="topbar-title">{titles[page]}</span>
      </div>
      <div className="topbar-right">
        <button className="btn btn-default btn-sm" onClick={toggle} title="Toggle theme">
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <button className="btn btn-default btn-sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>
    </header>
  );
}
