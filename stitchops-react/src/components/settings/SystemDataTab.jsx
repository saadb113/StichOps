import { useRef, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';

const UPLOAD_PAGES = [
  { key: 'orders', label: 'Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'employees', label: 'Employees' }
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
  const { importSystemData } = useAppState();
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    try {
      const result = await importSystemData(page.key, file);
      const parts = [];
      if (result.created) parts.push(`${result.created} added`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (result.errors?.length) parts.push(`${result.errors.length} failed`);
      toast(parts.length ? `${page.label}: ${parts.join(', ')}.` : `${page.label}: nothing to import.`);
      if (result.errors?.length) console.warn(`${page.label} import errors`, result.errors);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>{page.label}</td>
      <td style={{ textAlign: 'right' }}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }}
        />
        <button className="elg-icon-sq" title={`Upload ${page.label}`} disabled={busy} onClick={() => inputRef.current.click()}>
          <img alt="Add Order" src="/icons/upload-icon.svg" />
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
        <span className="elg-input">
          <input type="date" style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }}  value={range.from} onChange={(e) => onRangeChange({ ...range, from: e.target.value })} />
          <img src="/images/calender.svg" alt="" />
        </span>
      </td>
      <td>
        <span className="elg-input">
          <input type="date" style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }}  value={range.to} onChange={(e) => onRangeChange({ ...range, to: e.target.value })} />
          <img src="/images/calender.svg" alt="" />
        </span>
      </td>
      <td style={{ textAlign: 'right' }}>
        <button className="elg-icon-sq" title={`Export ${page.label}`} disabled={busy} onClick={handleExport}>
          <img alt="Add Order" src="/icons/download-icon.svg" />
        </button>
      </td>
    </tr>
  );
}

export default function SystemDataTab() {
  const { importAllSystemData, exportAllSystemData } = useAppState();
  const { toast } = useUi();
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
      if (!keys.length) { toast('No matching sheets found — expected Orders, Customers and/or Employees.'); return; }
      const summary = keys.map((k) => {
        const r = results[k];
        const bits = [];
        if (r.created) bits.push(`${r.created} added`);
        if (r.updated) bits.push(`${r.updated} updated`);
        if (r.errors?.length) bits.push(`${r.errors.length} failed`);
        return `${k}: ${bits.join(', ') || 'no changes'}`;
      }).join(' · ');
      toast(summary);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--elg-ink-3)' }}>
            <span className="elg-input">
              <input type="date" style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }}  value={globalRange.from} onChange={(e) => applyGlobalRange({ ...globalRange, from: e.target.value })} />
              <img src="/images/calender.svg" alt="" />
            </span>
            to
            <span className="elg-input">
              <input type="date" style={{ border: 'none', outline: 'none', fontFamily: 'var(--elg-font-sans)', fontSize: 13, background: 'transparent' }} value={globalRange.to} onChange={(e) => applyGlobalRange({ ...globalRange, to: e.target.value })} />
              <img src="/images/calender.svg" alt="" />
            </span>
          </div>
        </div>
        <div className="elg-table-wrap" style={{ padding: 10, border: '1px solid var(--elg-line)', borderRadius: 8 }}>
          <table className="elg-table">
            <thead><tr><th>Pages</th><th>From</th><th>To</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
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
