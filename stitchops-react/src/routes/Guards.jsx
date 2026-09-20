import { Navigate, useLocation } from 'react-router-dom';
import { useAppState } from '../store/AppStateContext';

function AuthGateLoading() {
  return <div className="auth-wrap"><div className="auth-card" style={{ textAlign: 'center' }}>Loading…</div></div>;
}

// Salespeople land on their customer list; every other self-service login
// (Designer, custom team) has no customers of their own, so they land on
// their payslip instead.
function employeeHome(isSalesperson) {
  return isSalesperson ? '/my-customers' : '/my-payslip';
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
  const { currentUser, authLoading, isAdmin, isSalesperson } = useAppState();
  if (authLoading) return <AuthGateLoading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!currentUser.mustChangePassword) return <Navigate to={isAdmin ? '/dashboard' : employeeHome(isSalesperson)} replace />;
  return children;
}

export function WelcomeGate({ children }) {
  const { currentUser, authLoading, isAdmin, isSalesperson } = useAppState();
  if (authLoading) return <AuthGateLoading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (currentUser.welcomed) return <Navigate to={isAdmin ? '/dashboard' : employeeHome(isSalesperson)} replace />;
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
  const { isAdmin, isSalesperson } = useAppState();
  if (!isAdmin) return <Navigate to={employeeHome(isSalesperson)} replace />;
  return children;
}

export function RequireSalesperson({ children }) {
  const { isSalesperson } = useAppState();
  if (!isSalesperson) return <Navigate to="/dashboard" replace />;
  return children;
}

// Any non-admin login (Salesperson or a Designer/custom-team EMPLOYEE
// login) — gates the shared self-service pages (payslip, info).
export function RequireEmployee({ children }) {
  const { isEmployee } = useAppState();
  if (!isEmployee) return <Navigate to="/dashboard" replace />;
  return children;
}

export function HomeRedirect() {
  const { isAdmin, isSalesperson } = useAppState();
  return <Navigate to={isAdmin ? '/dashboard' : employeeHome(isSalesperson)} replace />;
}
