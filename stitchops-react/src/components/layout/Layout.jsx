import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileTopbar from './MobileTopbar';
import TopBar from './TopBar';
import GlobalSearch from './GlobalSearch';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  return (
    <div id="app" className="elg-shell">
      <MobileTopbar onToggleMenu={() => setMobileMenuOpen((v) => !v)} />
      <div className={`mob-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <Sidebar open={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <TopBar />
        <div id="main">
          <Outlet />
        </div>
      </div>
      <GlobalSearch />
    </div>
  );
}
