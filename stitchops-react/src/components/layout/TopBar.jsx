import { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { SearchIcon, BellIcon, ChevronDownIcon } from '../icons/Icon';

export default function TopBar() {
  const { currentUser, currentEmployee, logout } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const displayName = currentEmployee ? currentEmployee.name : (currentUser.role === 'admin' ? 'Admin' : currentUser.email);
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="elg-topbar">
      <div className="elg-search">
        <SearchIcon />
        <input placeholder="Search" />
        <span className="kbd">⌘K</span>
      </div>
      <div className="elg-topbar-right">
        <button className="elg-icon-btn" title="Notifications"><BellIcon /></button>
        <div className="elg-account" ref={ref} onClick={() => setMenuOpen((v) => !v)}>
          <div className="elg-avatar">{initials}</div>
          <span className="elg-account-name">{displayName}</span>
          <ChevronDownIcon />
          {menuOpen && (
            <div className="elg-account-menu">
              <button onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
