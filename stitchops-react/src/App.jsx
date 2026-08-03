import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicOnly, ChangePasswordGate, WelcomeGate, RequireAuth, RequireAdmin, RequireSalesperson, HomeRedirect } from './routes/Guards';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ChangePassword from './components/auth/ChangePassword';
import Welcome from './components/auth/Welcome';
import Dashboard from './components/dashboard/Dashboard';
import OrdersScreen from './components/orders/OrdersScreen';
import InvoicesScreen from './components/invoices/InvoicesScreen';
import CustomersList from './components/customers/CustomersList';
import CustomerProfile from './components/customers/CustomerProfile';
import EmployeesList from './components/employees/EmployeesList';
import EmployeeProfile from './components/employees/EmployeeProfile';
import Reports from './components/reports/Reports';
import CompanySettings from './components/settings/CompanySettings';
import MyPayslip from './components/sales/MyPayslip';
import MyInfo from './components/sales/MyInfo';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/change-password" element={<ChangePasswordGate><ChangePassword /></ChangePasswordGate>} />
      <Route path="/welcome" element={<WelcomeGate><Welcome /></WelcomeGate>} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="orders" element={<RequireAdmin><OrdersScreen /></RequireAdmin>} />
        <Route path="invoices" element={<RequireAdmin><InvoicesScreen /></RequireAdmin>} />
        <Route path="customers" element={<RequireAdmin><CustomersList /></RequireAdmin>} />
        <Route path="customers/:customerId" element={<RequireAdmin><CustomerProfile /></RequireAdmin>} />
        <Route path="employees" element={<RequireAdmin><EmployeesList /></RequireAdmin>} />
        <Route path="employees/:employeeId" element={<RequireAdmin><EmployeeProfile /></RequireAdmin>} />
        <Route path="reports" element={<RequireAdmin><Reports /></RequireAdmin>} />
        <Route path="settings" element={<RequireAdmin><CompanySettings /></RequireAdmin>} />

        <Route path="my-customers" element={<RequireSalesperson><CustomersList /></RequireSalesperson>} />
        <Route path="my-customers/:customerId" element={<RequireSalesperson><CustomerProfile /></RequireSalesperson>} />
        <Route path="my-payslip" element={<RequireSalesperson><MyPayslip /></RequireSalesperson>} />
        <Route path="my-info" element={<RequireSalesperson><MyInfo /></RequireSalesperson>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
