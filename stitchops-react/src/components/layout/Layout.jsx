import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileBottomNav from './MobileBottomNav';
import GlobalSearch from './GlobalSearch';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  return (
    <div id="app" className="elg-shell">
      <div className={`mob-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <Sidebar open={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />
      <div className="elg-main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <TopBar onToggleMenu={() => setMobileMenuOpen((v) => !v)} />
        <div id="main">
          <Outlet />
        </div>
      </div>
      <MobileBottomNav menuOpen={mobileMenuOpen} onToggleMenu={() => setMobileMenuOpen((v) => !v)} />
      <GlobalSearch />
    </div>
  );
}
