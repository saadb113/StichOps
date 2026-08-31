import { createContext, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeCategories, setEmployeeCategories] = useState([]);
  const [companyEmails, setCompanyEmails] = useState([]);
  const [company, setCompany] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [currencyRates, setCurrencyRates] = useState([]);
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [nextInvoiceNo, setNextInvoiceNo] = useState(null);
  const [nextCustomerCode, setNextCustomerCode] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const isSalesperson = currentUser?.role === 'salesperson';

  // ---------- collection fetchers ----------
  const refreshCustomers = async () => setCustomers(await api.get('/customers'));
  const refreshOrders = async () => setOrders(await api.get('/orders'));
  const refreshInvoices = async () => setInvoices(await api.get('/invoices'));
  const refreshPayslips = async () => setPayslips(await api.get('/payslips'));
  const refreshEmployees = async () => setEmployees(await api.get('/employees'));
  const refreshEmployeeCategories = async () => setEmployeeCategories(await api.get('/employee-categories'));
  const refreshCompanyEmails = async () => setCompanyEmails(await api.get('/company-emails'));
  const refreshBankAccounts = async () => setBankAccounts(await api.get('/bank-accounts'));
  const refreshCurrencyRates = async () => setCurrencyRates(await api.get('/currency-rates'));
  const refreshPasswordResetRequests = async () => setPasswordResetRequests(await api.get('/password-reset-requests'));
  const refreshNotifications = async () => setNotifications(await api.get('/notifications'));
  const refreshMeta = async () => {
    const m = await api.get('/meta');
    setNextInvoiceNo(m.nextInvoiceNo);
    setNextCustomerCode(m.nextCustomerCode);
  };

  async function loadCollectionsFor(role) {
    // company + currency rates are needed by both roles — salespeople rely
    // on defaultCurrency to display their own pay/commission figures the
    // same way the admin side does.
    const tasks = [refreshCustomers(), refreshOrders(), refreshPayslips(), api.get('/company').then(setCompany), refreshCurrencyRates()];
    if (role === 'admin') {
      tasks.push(
        refreshInvoices(),
        refreshEmployees(),
        refreshEmployeeCategories(),
        refreshCompanyEmails(),
        refreshBankAccounts(),
        refreshPasswordResetRequests(),
        refreshNotifications(),
        refreshMeta()
      );
    }
    await Promise.all(tasks);
  }

  function clearAll() {
    setCurrentUser(null);
    setCurrentEmployee(null);
    setCustomers([]); setOrders([]); setInvoices([]); setPayslips([]);
    setEmployees([]); setEmployeeCategories([]); setCompanyEmails([]);
    setCompany(null); setBankAccounts([]); setCurrencyRates([]);
    setPasswordResetRequests([]); setNotifications([]);
    setNextInvoiceNo(null); setNextCustomerCode(null);
  }

  useEffect(() => {
    setUnauthorizedHandler(() => clearAll());
    (async () => {
      try {
        const { user, employee } = await api.get('/auth/me');
        setCurrentUser(user);
        setCurrentEmployee(employee);
        await loadCollectionsFor(user.role);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live push channel for notifications — the bell updates the instant
  // something happens (e.g. a salesperson adds a customer), no polling.
  useEffect(() => {
    if (!isAdmin) return;
    const es = new EventSource('/api/notifications/stream', { withCredentials: true });
    es.addEventListener('notification', (e) => {
      let notification;
      try { notification = JSON.parse(e.data); } catch { return; }
      setNotifications((list) => (list.some((n) => n.id === notification.id) ? list : [notification, ...list].slice(0, 10)));
      if (notification.type === 'password_reset_request') refreshPasswordResetRequests();
      if (notification.type === 'new_customer') refreshCustomers();
      // The employee behind this notification (their photo, most likely)
      // may be newer than whatever this admin tab last fetched.
      if (notification.employeeId) refreshEmployees();
    });
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ---------- lookups ----------
  const getCustomer = (id) => customers.find((c) => c.id === id);
  const getEmployee = (id) => employees.find((e) => e.id === id);

  // ---------- customers ----------
  async function addCustomer(data) {
    const created = await api.post('/customers', data);
    await refreshCustomers();
    if (isAdmin && data.customerCode) await refreshMeta();
    return created;
  }
  async function updateCustomer(id, data) {
    const updated = await api.patch(`/customers/${id}`, data);
    await refreshCustomers();
    return updated;
  }
  async function setCustomerStatus(id, status) {
    return updateCustomer(id, { status });
  }

  // ---------- orders ----------
  async function addOrder(data) {
    const result = await api.post('/orders', data);
    await Promise.all([refreshOrders(), refreshCustomers()]);
    return result; // { order, customer, statusChangedTo }
  }
  async function updateOrder(id, data) {
    const result = await api.patch(`/orders/${id}`, data);
    await refreshOrders();
    return result; // { order, wasInvoiced }
  }
  async function deleteOrder(id) {
    await api.delete(`/orders/${id}`);
    await refreshOrders();
  }
  async function setOrderStatus(orderId, status) {
    return updateOrder(orderId, { status });
  }
  async function addComment(orderId, text) {
    await api.post(`/orders/${orderId}/comments`, { text });
    await refreshOrders();
  }

  // ---------- invoices ----------
  async function approveInvoice(customerId) {
    let invoice;
    try {
      invoice = await api.post('/invoices/approve', { customerId });
    } catch (e) {
      if (e.status === 400) return null;
      throw e;
    }
    await Promise.all([refreshInvoices(), refreshOrders()]);
    return invoice;
  }
  async function togglePaymentStatus(id) {
    const updated = await api.patch(`/invoices/${id}/payment`);
    await refreshInvoices();
    return updated.paymentStatus;
  }

  // ---------- employees / payslips ----------
  async function approveSlip(employeeId) {
    const slip = await api.post(`/employees/${employeeId}/approve-slip`);
    await Promise.all([refreshPayslips(), refreshOrders()]);
    return slip;
  }
  async function toggleCustomerEarningsPaid(employeeId, customerId) {
    await api.patch(`/employees/${employeeId}/earnings/${customerId}/toggle-paid`);
    await refreshOrders();
  }
  async function togglePayslipPayment(id) {
    const updated = await api.patch(`/payslips/${id}/payment`);
    await refreshPayslips();
    return updated.paymentStatus;
  }
  async function addEmployee(data) {
    const result = await api.post('/employees', data);
    await Promise.all([refreshEmployees(), refreshCompanyEmails()]);
    return result; // { employee, credentials, needsEmailWarning }
  }
  async function updateEmployee(id, data) {
    const updated = await api.patch(`/employees/${id}`, data);
    await Promise.all([refreshEmployees(), refreshCompanyEmails(), refreshCustomers(), refreshOrders()]);
    return updated;
  }
  async function deleteEmployee(id) {
    await api.delete(`/employees/${id}`);
    await Promise.all([refreshEmployees(), refreshCompanyEmails()]);
  }
  async function uploadEmployeePhoto(id, file) {
    const updated = await api.upload(`/employees/${id}/photo`, file);
    if (currentEmployee && currentEmployee.id === id) setCurrentEmployee(updated);
    // The employees list is an admin-only endpoint — a salesperson uploading
    // their own photo can't (and doesn't need to) refresh it.
    if (isAdmin) await refreshEmployees();
    return updated;
  }
  async function deleteEmployeePhoto(id) {
    const updated = await api.delete(`/employees/${id}/photo`);
    if (currentEmployee && currentEmployee.id === id) setCurrentEmployee(updated);
    if (isAdmin) await refreshEmployees();
    return updated;
  }
  async function regenerateCredentials(employeeId) {
    try {
      return await api.post(`/employees/${employeeId}/regenerate-credentials`);
    } catch (e) {
      if (e.status === 400) return null;
      throw e;
    }
  }
  async function addCategory(name) {
    await api.post('/employee-categories', { name });
    await refreshEmployeeCategories();
  }
  async function approvePasswordReset(requestId) {
    let result;
    try {
      result = await api.post(`/password-reset-requests/${requestId}/approve`);
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
    await refreshPasswordResetRequests();
    return result;
  }
  async function rejectPasswordReset(requestId) {
    try {
      await api.post(`/password-reset-requests/${requestId}/reject`);
    } catch (e) {
      if (e.status === 404) return { ok: false };
      throw e;
    }
    await refreshPasswordResetRequests();
    return { ok: true };
  }

  // ---------- notifications ----------
  async function markNotificationRead(id) {
    const updated = await api.patch(`/notifications/${id}/read`);
    setNotifications((list) => list.map((n) => (n.id === id ? updated : n)));
  }
  async function markAllNotificationsRead() {
    await api.post('/notifications/read-all');
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
  }

  // ---------- company settings ----------
  async function updateCompany(data) {
    const updated = await api.patch('/company', data);
    setCompany(updated);
    return updated;
  }
  async function uploadCompanyLogo(file) {
    const updated = await api.upload('/company/logo', file);
    setCompany(updated);
    return updated;
  }
  async function deleteCompanyLogo() {
    const updated = await api.delete('/company/logo');
    setCompany(updated);
    return updated;
  }
  async function addCompanyEmail(email, employeeId) {
    try {
      await api.post('/company-emails', { email, employeeId: employeeId ?? null });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    await Promise.all([refreshCompanyEmails(), refreshEmployees()]);
    return { ok: true };
  }
  async function updateCompanyEmail(currentEmail, data) {
    try {
      await api.patch(`/company-emails/${encodeURIComponent(currentEmail)}`, data);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    await Promise.all([refreshCompanyEmails(), refreshEmployees()]);
    return { ok: true };
  }
  async function removeCompanyEmail(email) {
    try {
      await api.delete(`/company-emails/${encodeURIComponent(email)}`);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    await Promise.all([refreshCompanyEmails(), refreshEmployees()]);
    return { ok: true };
  }

  // ---------- bank accounts ----------
  async function addBankAccount(data) {
    const created = await api.post('/bank-accounts', data);
    await refreshBankAccounts();
    return created;
  }
  async function updateBankAccount(id, data) {
    const updated = await api.patch(`/bank-accounts/${id}`, data);
    await refreshBankAccounts();
    return updated;
  }
  async function deleteBankAccount(id) {
    await api.delete(`/bank-accounts/${id}`);
    await refreshBankAccounts();
  }

  // ---------- currency rates ----------
  async function addCurrencyRate(data) {
    const created = await api.post('/currency-rates', data);
    await refreshCurrencyRates();
    return created;
  }
  async function updateCurrencyRate(currency, data) {
    const updated = await api.patch(`/currency-rates/${currency}`, data);
    await refreshCurrencyRates();
    return updated;
  }
  async function deleteCurrencyRate(currency) {
    await api.delete(`/currency-rates/${currency}`);
    await refreshCurrencyRates();
  }
  async function fetchMarketRate(currency) {
    return api.get(`/currency-rates/${currency}/market`);
  }

  // ---------- self-service password change ----------
  async function changePassword(currentPassword, newPassword) {
    let result;
    try {
      result = await api.post('/auth/change-password', { currentPassword, password: newPassword });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    setCurrentUser(result.user);
    setCurrentEmployee(result.employee);
    return { ok: true };
  }

  // ---------- auth ----------
  async function attemptLogin(email, password, remember) {
    let result;
    try {
      result = await api.post('/auth/login', { email, password, remember });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    setCurrentUser(result.user);
    setCurrentEmployee(result.employee);
    await loadCollectionsFor(result.user.role);
    return { ok: true, user: result.user };
  }
  async function logout() {
    try { await api.post('/auth/logout'); } catch { /* ignore network errors on logout */ }
    clearAll();
  }
  async function submitNewPassword(pw) {
    const result = await api.post('/auth/change-password', { password: pw });
    setCurrentUser(result.user);
    setCurrentEmployee(result.employee);
  }
  async function markWelcomed() {
    const result = await api.post('/auth/welcome');
    setCurrentUser(result.user);
    setCurrentEmployee(result.employee);
  }
  async function submitForgotPassword(email) {
    try {
      await api.post('/auth/forgot-password', { email });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    return { ok: true };
  }

  const value = {
    // status
    authLoading,
    // data
    customers, orders, invoices, payslips, employees, employeeCategories,
    company, companyEmails, bankAccounts, currencyRates, nextInvoiceNo, nextCustomerCode, passwordResetRequests,
    notifications,
    currentUser, isAdmin, isSalesperson, currentEmployee,
    // lookups
    getCustomer, getEmployee, refreshCustomers,
    // mutators
    addCustomer, updateCustomer, setCustomerStatus,
    addOrder, updateOrder, deleteOrder, setOrderStatus, addComment,
    approveInvoice, togglePaymentStatus,
    approveSlip, toggleCustomerEarningsPaid, togglePayslipPayment,
    addEmployee, updateEmployee, deleteEmployee, regenerateCredentials, addCategory, approvePasswordReset, rejectPasswordReset,
    uploadEmployeePhoto, deleteEmployeePhoto,
    updateCompany, uploadCompanyLogo, deleteCompanyLogo, addCompanyEmail, updateCompanyEmail, removeCompanyEmail,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addCurrencyRate, updateCurrencyRate, deleteCurrencyRate, fetchMarketRate,
    markNotificationRead, markAllNotificationsRead,
    attemptLogin, logout, submitNewPassword, markWelcomed, submitForgotPassword, changePassword
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
