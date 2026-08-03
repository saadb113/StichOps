import { Navigate, useLocation } from 'react-router-dom';
import { useAppState } from '../store/AppStateContext';

function AuthGateLoading() {
  return <div className="auth-wrap"><div className="auth-card" style={{ textAlign: 'center' }}>Loading…</div></div>;
}

export function PublicOnly({ children }) {
  const { currentUser, authLoading, isAdmin } = useAppState();
  if (authLoading) return <AuthGateLoading />;
  if (currentUser) {
    if (currentUser.mustChangePassword) return <Navigate to="/change-password" replace />;
    if (!currentUser.welcomed) return <Navigate to="/welcome" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export function ChangePasswordGate({ children }) {
  const { currentUser, authLoading, isAdmin } = useAppState();
  if (authLoading) return <AuthGateLoading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!currentUser.mustChangePassword) return <Navigate to={isAdmin ? '/dashboard' : '/my-customers'} replace />;
  return children;
}

export function WelcomeGate({ children }) {
  const { currentUser, authLoading, isAdmin } = useAppState();
  if (authLoading) return <AuthGateLoading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (currentUser.welcomed) return <Navigate to={isAdmin ? '/dashboard' : '/my-customers'} replace />;
  return children;
}

export function RequireAuth({ children }) {
  const { currentUser, authLoading } = useAppState();
  const location = useLocation();
  if (authLoading) return <AuthGateLoading />;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location }} />;
  if (currentUser.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!currentUser.welcomed) return <Navigate to="/welcome" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin } = useAppState();
  if (!isAdmin) return <Navigate to="/my-customers" replace />;
  return children;
}

export function RequireSalesperson({ children }) {
  const { isSalesperson } = useAppState();
  if (!isSalesperson) return <Navigate to="/dashboard" replace />;
  return children;
}

export function HomeRedirect() {
  const { isAdmin } = useAppState();
  return <Navigate to={isAdmin ? '/dashboard' : '/my-customers'} replace />;
}
