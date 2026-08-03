import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileTopbar from './MobileTopbar';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  return (
    <div id="app">
      <MobileTopbar onToggleMenu={() => setMobileMenuOpen((v) => !v)} />
      <div className={`mob-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <Sidebar open={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />
      <div id="main">
        <Outlet />
      </div>
    </div>
  );
}
