import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import RangeDateField from '../common/RangeDateField';
import { useNavigate } from 'react-router-dom';
import { ImportResultsModal } from './ImportResults';


const UPLOAD_PAGES = [
  { key: 'employees', label: 'Employees' },
  { key: 'customers', label: 'Customers' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'orders', label: 'Orders' }
];

const EXPORT_PAGES = [
  { key: 'orders', label: 'Orders' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'customers', label: 'Customers' },
  { key: 'employees', label: 'Employees' }
];

function CloudUploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.8 15.5A3.8 3.8 0 0 1 5.3 8a5 5 0 0 1 9.6-1.4A3.75 3.75 0 0 1 14.5 14" stroke="var(--elg-primary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17v-6.5M10 10.5l-2.3 2.3M10 10.5l2.3 2.3" stroke="var(--elg-primary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon({ color = 'var(--elg-ink-2)' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3v9.5M10 12.5l-3-3M10 12.5l3-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadRow({ page }) {
  const navigate = useNavigate();
  return (
    <tr>
      <td>{page.label}</td>
      <td style={{ textAlign: 'right' }}>
        <button className="elg-icon-sq" title={`Import ${page.label}`} onClick={() => navigate(`/settings/import/${page.key}`)}>
          <img alt="" src="/icons/upload-icon.svg" />
        </button>
      </td>
    </tr>
  );
}

function ExportRow({ page, range, onRangeChange }) {
  const { exportSystemData } = useAppState();
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      await exportSystemData(page.key, range);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>{page.label}</td>
      <td>
        <RangeDateField from={range.from} to={range.to} onChange={(r) => onRangeChange(r)} />
      </td>
      <td style={{ textAlign: 'right' }}>
        <button className="elg-icon-sq" title={`Export ${page.label}`} disabled={busy} onClick={handleExport}>
          <img alt="Add Order" src="/icons/download-icon.svg" />
        </button>
      </td>
    </tr>
  );
}

// Powers the admin "forgot password" emailed reset link (see
// ForgotPassword.jsx / lib/mailer.js on the backend). Loaded on demand,
// not through global app state, since it includes a write-only password
// the rest of the app has no reason to hold onto.
const SMTP_STATUS = {
  connected: { label: 'Connected', cls: 'elg-smtp-status-ok' },
  failed: { label: 'Not connected', cls: 'elg-smtp-status-bad' },
  unchecked: { label: 'Not set up', cls: 'elg-smtp-status-idle' }
};

function SmtpStatus({ status, checking }) {
  if (checking) return <span className="elg-smtp-status elg-smtp-status-idle"><span className="elg-smtp-dot" />Checking…</span>;
  const s = SMTP_STATUS[status.status] || SMTP_STATUS.unchecked;
  return <span className={`elg-smtp-status ${s.cls}`}><span className="elg-smtp-dot" />{s.label}</span>;
}

function SmtpSettingsCard() {
  const { getSmtpSettings, updateSmtpSettings, sendSmtpTest, verifySmtp } = useAppState();
  const { toast } = useUi();
  const [loaded, setLoaded] = useState(false);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [user, setUser] = useState('');
  const [from, setFrom] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passSet, setPassSet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState({ status: 'unchecked', checkedAt: null, error: null });
  const [checking, setChecking] = useState(false);

  function applyStatus(s) {
    setStatus({ status: s.status, checkedAt: s.checkedAt, error: s.error });
  }

  useEffect(() => {
    getSmtpSettings().then((s) => {
      setHost(s.smtpHost || '');
      setPort(s.smtpPort || '');
      setUser(s.smtpUser || '');
      setFrom(s.smtpFrom || '');
      setPassSet(s.passSet);
      applyStatus(s);
      setLoaded(true);
    }).catch((e) => toast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setChecking(true);
    try {
      const data = {
        smtpHost: host.trim(),
        smtpPort: port ? Number(port) : null,
        smtpUser: user.trim(),
        smtpFrom: from.trim()
      };
      // Blank password field means "leave it as-is" — only send the key
      // (even as "") when the admin actually typed something, so clearing
      // the field by accident doesn't wipe a saved password.
      if (password) data.smtpPass = password;
      const result = await updateSmtpSettings(data);
      setPassSet(result.passSet);
      setPassword('');
      applyStatus(result);
      toast(result.status === 'connected' ? 'Saved — connected to the mail server.' : result.status === 'failed' ? 'Saved, but the connection failed — see below.' : 'Email settings saved.');
    } catch (e) {
      toast(e.message);
    } finally {
      setSaving(false);
      setChecking(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    try {
      const result = await verifySmtp();
      applyStatus(result);
      toast(result.status === 'connected' ? 'Connected to the mail server.' : result.error || 'Save your SMTP settings first.');
    } catch (e) {
      toast(e.message);
    } finally {
      setChecking(false);
    }
  }

  async function handleTest() {
    if (!testTo.trim()) { toast('Enter an email to send the test to.'); return; }
    setTesting(true);
    try {
      await sendSmtpTest(testTo.trim());
      toast(`Test email sent to ${testTo.trim()}.`);
    } catch (e) {
      toast(e.message);
    } finally {
      setTesting(false);
      getSmtpSettings().then(applyStatus).catch(() => {});
    }
  }

  if (!loaded) return null;

  return (
    <div className="elg-settings-card" style={{ marginBottom: 20 }}>
      <div className="elg-settings-card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h2>Email (SMTP) Settings</h2>
        <SmtpStatus status={status} checking={checking} />
      </div>
      {!checking && (status.status !== 'unchecked' || status.error) && (
        <div className={`elg-smtp-status-box ${status.status === 'connected' ? 'ok' : 'bad'}`}>
          {status.status === 'connected'
            ? <>Logged in to <strong>{host}</strong> as <strong>{user}</strong>. Admin password-reset emails will be sent from this mailbox.</>
            : <>{status.error}</>}
          {status.checkedAt && <div className="elg-smtp-checked">Last checked {new Date(status.checkedAt).toLocaleString()}</div>}
        </div>
      )}
      <div className="elg-hint-line" style={{ marginBottom: 16 }}>
        Used to send the admin "forgot password" reset link — e.g. a Hostinger mailbox. In hPanel: Emails &gt; your address &gt; Connect Apps &amp; Devices &gt; Manual Configuration gives the host/port/username.
      </div>
      <div className="elg-field-row">
        <div className="elg-field">
          <label>SMTP Host</label>
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.hostinger.com" />
        </div>
        <div className="elg-field">
          <label>SMTP Port</label>
          <input type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="465" />
        </div>
      </div>
      <div className="elg-field-row">
        <div className="elg-field">
          <label>Username</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="noreply@yourdomain.com" />
        </div>
        <div className="elg-field">
          <label>From (optional)</label>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={'ElegantsDesign <noreply@theelegantsdesign.com>'} />
        </div>
      </div>
      <div className="elg-field">
        <label>Password {passSet && !password && <span style={{ fontWeight: 400, color: 'var(--elg-ink-3)' }}>(saved — leave blank to keep it)</span>}</label>
        <div className="elg-password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={passSet ? '••••••••' : 'Mailbox password'}
          />
          <button type="button" className="elg-password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
            {showPassword ? <img src="/images/showpwd.svg" alt="" /> : <img src="/images/hidepwd.svg" alt="" />}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} disabled={saving || checking} onClick={handleSave}>
          {saving ? 'Saving & checking…' : 'Save & Check Connection'}
        </button>
        <button className="elg-btn" style={{ width: 'auto' }} disabled={saving || checking || !passSet} onClick={handleCheck} title={passSet ? '' : 'Save your settings first'}>
          {checking && !saving ? 'Checking…' : 'Check Connection'}
        </button>
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--elg-line)' }}>
        <div className="elg-field-row" style={{ alignItems: 'flex-end' }}>
          <div className="elg-field" style={{ marginBottom: 0 }}>
            <label>Send Test Email</label>
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@company.com" />
          </div>
          <button className="elg-btn" style={{ width: 'auto', whiteSpace: 'nowrap' }} disabled={testing} onClick={handleTest}>
            {testing ? 'Sending…' : 'Send Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SystemDataTab() {
  const { importAllSystemData, exportAllSystemData } = useAppState();
  const { toast, openModal } = useUi();
  const allFileRef = useRef(null);
  const [uploadingAll, setUploadingAll] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [globalRange, setGlobalRange] = useState({ from: '', to: '' });
  const [ranges, setRanges] = useState(() =>
    Object.fromEntries(EXPORT_PAGES.map((p) => [p.key, { from: '', to: '' }]))
  );

  function applyGlobalRange(next) {
    setGlobalRange(next);
    setRanges(Object.fromEntries(EXPORT_PAGES.map((p) => [p.key, next])));
  }

  async function handleUploadAll(file) {
    if (!file) return;
    setUploadingAll(true);
    try {
      const results = await importAllSystemData(file);
      const keys = Object.keys(results);
      if (!keys.length) { toast('No matching sheets found — expected Employees, Customers, Invoices and/or Orders.'); return; }
      openModal(<ImportResultsModal results={results} />, { variant: 'elegant' });
    } catch (e) {
      toast(e.message);
    } finally {
      setUploadingAll(false);
    }
  }

  async function handleExportAll() {
    setExportingAll(true);
    try {
      await exportAllSystemData(globalRange);
    } catch (e) {
      toast(e.message);
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <>
      <SmtpSettingsCard />

      <div className="elg-settings-card" style={{ marginBottom: 20 }}>
        <div className="elg-settings-card-title"><h2>Upload Data</h2></div>
        <div className="elg-table-wrap" style={{ padding: 10, border: '1px solid var(--elg-line)', borderRadius: 8 }}>
          <table className="elg-table">
            <thead><tr><th>Pages</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {UPLOAD_PAGES.map((p) => <UploadRow key={p.key} page={p} />)}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <input
            ref={allFileRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: 'none' }}
            onChange={(e) => { handleUploadAll(e.target.files[0]); e.target.value = ''; }}
          />
          <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', gap: 6 }} disabled={uploadingAll} onClick={() => allFileRef.current.click()}>
            <img alt="Add Order" src="/icons/upload-icon-black.svg" /> Upload all Data
          </button>
        </div>
      </div>

      <div className="elg-settings-card">
        <div className="elg-settings-card-title" style={{ justifyContent: 'space-between' }}>
          <h2>Export Data</h2>
          <RangeDateField from={globalRange.from} to={globalRange.to} onChange={(r) => applyGlobalRange(r)} align="right" />
        </div>
        <div className="elg-table-wrap" style={{ padding: 10, border: '1px solid var(--elg-line)', borderRadius: 8 }}>
          <table className="elg-table">
            <thead><tr><th>Pages</th><th>Date Range</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {EXPORT_PAGES.map((p) => (
                <ExportRow
                  key={p.key}
                  page={p}
                  range={ranges[p.key]}
                  onRangeChange={(next) => setRanges((r) => ({ ...r, [p.key]: next }))}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button className="elg-btn" style={{ width: 'auto', display: 'inline-flex', gap: 6, padding : "7.5px 13px" }} disabled={exportingAll} onClick={handleExportAll}>
            <img alt="Add Order" src="/icons/download-icon-black.svg" />
             Export all Data
          </button>
        </div>
      </div>
    </>
  );
}
