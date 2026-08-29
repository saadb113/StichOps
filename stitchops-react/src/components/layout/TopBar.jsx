import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TopBar() {
  const { currentUser, currentEmployee, company, isAdmin, notifications, markNotificationRead, markAllNotificationsRead, refreshCustomers, logout } = useAppState();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const accountRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const displayName = currentEmployee ? currentEmployee.name : (currentUser.role === 'admin' ? 'Admin' : currentUser.email);
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const photoUrl = isAdmin ? company?.logo : currentEmployee?.photo;
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleNotifClick(n) {
    setNotifOpen(false);
    if (!n.read) {
      try { await markNotificationRead(n.id); } catch { /* ignore */ }
    }
    // The record behind this notification may be newer than whatever this
    // tab last fetched — refresh it first so the destination page doesn't
    // land on a "not found" state for something that was just created.
    if (n.type === 'new_customer') {
      try { await refreshCustomers(); } catch { /* ignore */ }
    }
    if (n.link) navigate(n.link);
  }

  return (
    <div className="elg-topbar">
      <div className="elg-search" onClick={() => window.dispatchEvent(new Event('open-global-search'))}>
        <img src="/icons/nav-search-icon.svg" alt="Search" />
        <input id="search" name="search" placeholder="Search" type="text" readOnly />
        <p className="kbd">
          <img src="/icons/command-icon.svg" alt="Command" />
          <span>K</span>
        </p>
      </div>
      <div className="elg-topbar-right">
        {isAdmin && (
          <div className="elg-notif" ref={notifRef}>
            <button className="elg-icon-btn" title="Notifications" onClick={() => setNotifOpen((v) => !v)}>
              {unreadCount == 0 && (
                <img src="/icons/notifications-icon.svg" alt="Notifications" />
              )}
              {unreadCount > 0 && (
                <img src="/icons/notifications-icon-active.svg" alt="Notifications" />
              )}
            </button>
            {notifOpen && (
              <div className="elg-notif-panel">
                <div className="elg-notif-panel-head">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="elg-notif-mark-all" onClick={markAllNotificationsRead}>Mark all read</button>
                  )}
                </div>
                <div className="elg-notif-list">
                  {notifications.length === 0 && (
                    <div className="elg-notif-empty">No notifications yet.</div>
                  )}
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`elg-notif-row ${n.read ? '' : 'unread'}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <span className="elg-notif-dot" />
                      <span className="elg-notif-text">
                        <span className="elg-notif-message">{n.message}</span>
                        <span className="elg-notif-time">{timeAgo(n.createdAt)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="elg-account" ref={accountRef} onClick={() => setMenuOpen((v) => !v)}>
          {photoUrl ? (
            <img className="elg-avatar" src={photoUrl} alt="" />
          ) : (
            <div className="elg-avatar">{initials}</div>
          )}
          <span className="elg-account-name">{displayName}</span>
          <img src="/icons/down-icon.svg" alt="dropdown icon" />
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
