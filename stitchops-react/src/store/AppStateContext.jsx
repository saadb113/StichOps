import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api';
import { downloadBlob } from '../lib/helpers';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [authLoading, setAuthLoading] = useState(true);
  // True while the signed-in user's collections are still loading — pages
  // show skeletons instead of empty states during this window.
  const [dataLoading, setDataLoading] = useState(false);
  // Updated synchronously when a load starts/ends (not only on render), so
  // state updates made by the load itself are recognised as part of it.
  const dataLoadingRef = useRef(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const [customers, setCustomersRaw] = useState([]);
  const [orders, setOrdersRaw] = useState([]);
  const [invoices, setInvoicesRaw] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designers, setDesigners] = useState([]);
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
  // Any logged-in non-admin — Salesperson or a Designer/custom-team
  // "EMPLOYEE" login — gets the self-service portal (own payslip/info).
  const isEmployee = !!currentUser && !isAdmin;

  // ---------- collection fetchers ----------
  const refreshCustomers = async () => setCustomers(await api.get('/customers'));
  const refreshOrders = async () => setOrders(await api.get('/orders'));
  const refreshInvoices = async () => setInvoices(await api.get('/invoices'));
  const refreshPayslips = async () => setPayslips(await api.get('/payslips'));
  const refreshEmployees = async () => setEmployees(await api.get('/employees'));
  // Unlike /employees (admin-only, full payroll data), /employees/designers
  // is just id/name and is available to every logged-in role — it's what
  // populates the Designer picker on the Add Order form for salespeople too.
  const refreshDesigners = async () => setDesigners(await api.get('/employees/designers'));
  const refreshEmployeeCategories = async () => setEmployeeCategories(await api.get('/employee-categories'));
  const refreshCompanyEmails = async () => setCompanyEmails(await api.get('/company-emails'));
  const refreshBankAccounts = async () => setBankAccounts(await api.get('/bank-accounts'));
  const refreshCurrencyRates = async () => setCurrencyRates(await api.get('/currency-rates'));
  const refreshPasswordResetRequests = async () => setPasswordResetRequests(await api.get('/password-reset-requests'));
  const refreshNotifications = async () => setNotifications(await api.get('/notifications'));
  // Unread "salesperson added a customer" notifications — the Customers nav badge.
  const [newCustomerCount, setNewCustomerCount] = useState(0);
  const refreshNewCustomerCount = async () => setNewCustomerCount((await api.get('/notifications/new-customers/count')).count);
  const refreshMeta = async () => {
    const m = await api.get('/meta');
    setNextInvoiceNo(m.nextInvoiceNo);
    setNextCustomerCode(m.nextCustomerCode);
  };

  // Server-paged lists (Orders/Invoices/Customers screens) refetch their
  // current page whenever this ticks — after any save or live update that
  // changes orders, customers or invoices. Decided at the moment of the
  // update (not in an effect), so the initial login load never counts.
  const [listVersion, setListVersion] = useState(0);
  const tracked = (rawSetter) => (update) => {
    rawSetter(update);
    if (!dataLoadingRef.current) setListVersion((v) => v + 1);
  };
  const setOrders = tracked(setOrdersRaw);
  const setCustomers = tracked(setCustomersRaw);
  const setInvoices = tracked(setInvoicesRaw);

  // Counter, not a boolean: overlapping loads must not mark loading as done
  // while another is still filling in data.
  const activeLoads = useRef(0);
  async function loadCollectionsFor(role) {
    activeLoads.current += 1;
    dataLoadingRef.current = true;
    setDataLoading(true);
    try {
      await fetchCollectionsFor(role);
    } finally {
      activeLoads.current -= 1;
      if (activeLoads.current === 0) {
        dataLoadingRef.current = false;
        setDataLoading(false);
      }
    }
  }

  async function fetchCollectionsFor(role) {
    // company + currency rates are needed by both roles — salespeople rely
    // on defaultCurrency to display their own pay/commission figures the
    // same way the admin side does.
    const tasks = [refreshCustomers(), refreshOrders(), refreshPayslips(), api.get('/company').then(setCompany), refreshCurrencyRates(), refreshDesigners()];
    if (role === 'admin') {
      tasks.push(
        refreshInvoices(),
        refreshEmployees(),
        refreshEmployeeCategories(),
        refreshCompanyEmails(),
        refreshBankAccounts(),
        refreshPasswordResetRequests(),
        refreshNotifications(),
        refreshNewCustomerCount(),
        refreshMeta()
      );
    }
    await Promise.all(tasks);
  }

  function clearAll() {
    setCurrentUser(null);
    setCurrentEmployee(null);
    setCustomers([]); setOrders([]); setInvoices([]); setPayslips([]);
    setEmployees([]); setDesigners([]); setEmployeeCategories([]); setCompanyEmails([]);
    setCompany(null); setBankAccounts([]); setCurrencyRates([]);
    setPasswordResetRequests([]); setNotifications([]); setNewCustomerCount(0);
    setNextInvoiceNo(null); setNextCustomerCode(null);
  }

  // Guard: React StrictMode (development) runs mount effects twice — the
  // session check and initial data load must only ever happen once.
  const bootstrapped = useRef(false);
  useEffect(() => {
    setUnauthorizedHandler(() => clearAll());
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    // Only a 401 means "not signed in". A 500 or network blip (server
    // restarting, database waking up) is retried, so it never logs anyone out.
    const fetchMe = async () => {
      const delays = [1000, 2000, 4000, 8000];
      for (let attempt = 0; ; attempt++) {
        try {
          return await api.get('/auth/me');
        } catch (e) {
          if (e.status === 401 || attempt >= delays.length) throw e;
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
      }
    };
    (async () => {
      try {
        const { user, employee } = await fetchMe();
        setCurrentUser(user);
        setCurrentEmployee(employee);
        setAuthLoading(false);
        loadCollectionsFor(user.role).catch(() => {});
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
      if (notification.type === 'new_customer') { refreshCustomers(); refreshNewCustomerCount().catch(() => {}); }
      if (notification.type === 'invoice_generated') { refreshInvoices(); refreshOrders(); }
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

  // Saves update just the affected record in memory, using the record the
  // server returns (same shape as the list endpoints), instead of
  // re-downloading the whole list after every change.
  const upsert = (list, item, sort) => {
    const next = list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
    return sort ? next.sort(sort) : next;
  };
  const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id;
  const byIdAsc = (a, b) => a.id - b.id;
  const byIdDesc = (a, b) => b.id - a.id;

  // ---------- customers ----------
  async function addCustomer(data) {
    const created = await api.post('/customers', data);
    setCustomers((list) => upsert(list, created, byIdAsc));
    if (isAdmin && data.customerCode) await refreshMeta();
    return created;
  }
  async function updateCustomer(id, data) {
    const updated = await api.patch(`/customers/${id}`, data);
    setCustomers((list) => upsert(list, updated, byIdAsc));
    return updated;
  }
  async function setCustomerStatus(id, status) {
    return updateCustomer(id, { status });
  }
  async function deleteCustomer(id) {
    await api.delete(`/customers/${id}`);
    setCustomers((list) => list.filter((c) => c.id !== id));
  }

  // ---------- orders ----------
  async function addOrder(data) {
    const result = await api.post('/orders', data);
    setOrders((list) => upsert(list, result.order, byDateDesc));
    // A first order can flip the customer's type (e.g. Free Trial -> Paid).
    if (result.customer) setCustomers((list) => upsert(list, result.customer, byIdAsc));
    return result; // { order, customer, statusChangedTo }
  }
  async function updateOrder(id, data) {
    const result = await api.patch(`/orders/${id}`, data);
    setOrders((list) => upsert(list, result.order, byDateDesc));
    return result; // { order, wasInvoiced }
  }
  async function deleteOrder(id) {
    await api.delete(`/orders/${id}`);
    setOrders((list) => list.filter((o) => o.id !== id));
  }

  // Optimistically hides the order everywhere immediately and only actually
  // deletes it on the server after the undo window passes — mirrors an email
  // client's "Undo send". Returns an `undo()` you can wire to a toast action.
  function softDeleteOrder(id, delayMs = 6000) {
    const snapshot = orders;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    let settled = false;
    const timer = setTimeout(async () => {
      if (settled) return;
      settled = true;
      try {
        await api.delete(`/orders/${id}`);
      } catch {
        // Couldn't actually delete it server-side — put it back rather than
        // silently losing it from view.
        await refreshOrders();
      }
    }, delayMs);
    return {
      undo: () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setOrders(snapshot);
      }
    };
  }
  async function setOrderStatus(orderId, status) {
    return updateOrder(orderId, { status });
  }
  async function addComment(orderId, text) {
    const updated = await api.post(`/orders/${orderId}/comments`, { text });
    setOrders((list) => upsert(list, updated, byDateDesc));
  }

  // ---------- invoices ----------
  // Invoices are no longer approved manually from here — the backend bundles
  // each customer's completed orders into one auto-approved invoice on the
  // 1st of the month (see stitchops-backend/src/lib/monthlyInvoicing.js).
  async function togglePaymentStatus(id, details) {
    const updated = await api.patch(`/invoices/${id}/payment`, details || {});
    setInvoices((list) => upsert(list, updated, byIdDesc));
    return updated.paymentStatus;
  }
  async function sendInvoiceReminder(id) {
    const updated = await api.post(`/invoices/${id}/remind`);
    setInvoices((list) => upsert(list, updated, byIdDesc));
    return updated;
  }
  async function setInvoiceBankAccount(id, bankAccountId) {
    const updated = await api.patch(`/invoices/${id}/bank-account`, { bankAccountId });
    setInvoices((list) => upsert(list, updated, byIdDesc));
    return updated;
  }

  // ---------- employees / payslips ----------
  async function approveSlip(employeeId, bonuses) {
    const slip = await api.post(`/employees/${employeeId}/approve-slip`, { bonuses: bonuses || [] });
    // Approving updates the employee's own record too (nextSlipSeq,
    // lastSlipApprovedPeriod), which is what gates whether the closed
    // month's card can show up again — so the employee list needs
    // refreshing here, not just orders/payslips.
    await Promise.all([refreshPayslips(), refreshOrders(), refreshEmployees()]);
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
    await Promise.all([refreshEmployees(), refreshDesigners(), refreshCompanyEmails()]);
    return result; // { employee, credentials, needsEmailWarning }
  }
  async function updateEmployee(id, data) {
    const updated = await api.patch(`/employees/${id}`, data);
    await Promise.all([refreshEmployees(), refreshDesigners(), refreshCompanyEmails(), refreshCustomers(), refreshOrders()]);
    return updated;
  }
  async function deleteEmployee(id) {
    await api.delete(`/employees/${id}`);
    await Promise.all([refreshEmployees(), refreshDesigners(), refreshCompanyEmails()]);
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
  async function createLogin(employeeId, email) {
    const result = await api.post(`/employees/${employeeId}/create-login`, email ? { email } : {});
    await refreshEmployees();
    return result;
  }
  async function addCategory(name) {
    await api.post('/employee-categories', { name });
    await refreshEmployeeCategories();
  }
  async function renameCategory(oldName, newName) {
    await api.patch(`/employee-categories/${encodeURIComponent(oldName)}`, { name: newName });
    await Promise.all([refreshEmployeeCategories(), refreshEmployees()]);
  }
  async function deleteCategory(name) {
    await api.delete(`/employee-categories/${encodeURIComponent(name)}`);
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

  // ---------- system data (Settings > System Data) ----------
  function buildRangeQuery(range) {
    const params = new URLSearchParams();
    if (range?.from) params.set('from', range.from);
    if (range?.to) params.set('to', range.to);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }
  async function exportSystemData(model, range) {
    const blob = await api.download(`/system-data/export/${model}${buildRangeQuery(range)}`);
    downloadBlob(blob, `ElegantsDesign_${model}.xlsx`);
  }
  async function exportAllSystemData(range) {
    const blob = await api.download(`/system-data/export-all${buildRangeQuery(range)}`);
    downloadBlob(blob, 'ElegantsDesign_all_data.xlsx');
  }
  async function refreshAfterImport(model) {
    if (model === 'orders') await refreshOrders();
    else if (model === 'customers') await refreshCustomers();
    else if (model === 'employees') await refreshEmployees();
    else if (model === 'invoices') await refreshInvoices();
  }
  async function previewImport(model, file) {
    return api.upload(`/system-data/import/${model}/preview`, file);
  }
  async function importSystemData(model, file, mapping) {
    const result = await api.upload(`/system-data/import/${model}`, file, mapping ? { mapping: JSON.stringify(mapping) } : {});
    await refreshAfterImport(model);
    return result;
  }
  async function importAllSystemData(file) {
    const results = await api.upload('/system-data/import-all', file);
    await Promise.all([refreshOrders(), refreshCustomers(), refreshEmployees(), refreshInvoices()]);
    return results;
  }

  // ---------- notifications ----------
  async function markNotificationRead(id) {
    const updated = await api.patch(`/notifications/${id}/read`);
    setNotifications((list) => list.map((n) => (n.id === id ? updated : n)));
    if (updated.type === 'new_customer') refreshNewCustomerCount().catch(() => {});
  }
  // Opening the Customers page = the admin has seen the newly added customers.
  async function markNewCustomersSeen() {
    if (!newCustomerCount) return;
    setNewCustomerCount(0);
    setNotifications((list) => list.map((n) => (n.type === 'new_customer' ? { ...n, read: true } : n)));
    try {
      await api.post('/notifications/new-customers/read');
    } catch {
      refreshNewCustomerCount().catch(() => {});
    }
  }
  async function markAllNotificationsRead() {
    await api.post('/notifications/read-all');
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setNewCustomerCount(0);
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
  async function addCompanyEmail(email, employeeIds = []) {
    try {
      await api.post('/company-emails', { email, employeeIds });
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

  // ---------- SMTP settings (Settings > System Data) ----------
  // Not loaded into global state like company/bankAccounts — it includes a
  // write-only password, so it's only ever fetched by the settings page
  // itself, on demand.
  async function getSmtpSettings() {
    return api.get('/company/smtp');
  }
  async function updateSmtpSettings(data) {
    return api.patch('/company/smtp', data);
  }
  async function verifySmtp() { return api.post('/company/smtp/verify'); }
  async function sendSmtpTest(to) {
    return api.post('/company/smtp/test', { to });
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
    loadCollectionsFor(result.user.role).catch(() => {});
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
    let result;
    try {
      result = await api.post('/auth/forgot-password', { email });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    return { ok: true, adminRecovery: Boolean(result && result.adminRecovery), emailSent: Boolean(result && result.emailSent) };
  }
  async function submitResetPassword(token, password) {
    try {
      await api.post('/auth/reset-password', { token, password });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    return { ok: true };
  }
  async function submitAdminRecovery(email, code, password) {
    try {
      await api.post('/auth/admin-recovery', { email, code, password });
    } catch (e) {
      return { ok: false, error: e.message };
    }
    return { ok: true };
  }

  const value = {
    // status
    authLoading,
    dataLoading,
    listVersion,
    // data
    customers, orders, invoices, payslips, employees, designers, employeeCategories,
    company, companyEmails, bankAccounts, currencyRates, nextInvoiceNo, nextCustomerCode, passwordResetRequests,
    notifications,
    currentUser, isAdmin, isSalesperson, isEmployee, currentEmployee,
    // lookups
    getCustomer, getEmployee, refreshCustomers, refreshOrders, refreshInvoices,
    // mutators
    addCustomer, updateCustomer, setCustomerStatus, deleteCustomer,
    addOrder, updateOrder, deleteOrder, softDeleteOrder, setOrderStatus, addComment,
    togglePaymentStatus, sendInvoiceReminder, setInvoiceBankAccount,
    approveSlip, toggleCustomerEarningsPaid, togglePayslipPayment,
    addEmployee, updateEmployee, deleteEmployee, regenerateCredentials, createLogin, addCategory, renameCategory, deleteCategory, approvePasswordReset, rejectPasswordReset,
    uploadEmployeePhoto, deleteEmployeePhoto,
    updateCompany, uploadCompanyLogo, deleteCompanyLogo, addCompanyEmail, updateCompanyEmail, removeCompanyEmail,
    getSmtpSettings, updateSmtpSettings, sendSmtpTest, verifySmtp,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addCurrencyRate, updateCurrencyRate, deleteCurrencyRate, fetchMarketRate,
    markNotificationRead, markAllNotificationsRead, newCustomerCount, markNewCustomersSeen,
    exportSystemData, exportAllSystemData, importSystemData, previewImport, importAllSystemData,
    attemptLogin, logout, submitNewPassword, markWelcomed, submitForgotPassword, submitAdminRecovery, submitResetPassword, changePassword
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
