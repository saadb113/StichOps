import { useRef, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { ImportResults } from './ImportResults';

export const IMPORT_PAGES = {
  employees: 'Employees',
  customers: 'Customers',
  invoices: 'Invoices',
  orders: 'Orders'
};

const ACCEPT = '.xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const STEPS = ['Upload File', 'Map Columns', 'Results'];

// A required ID field is satisfied by mapping either the ID column or its
// name-lookup alternative (e.g. Customer ID *or* Customer company name).
const ALTERNATIVES = { customerId: 'customerName', designerId: 'designerName' };

function showSample(v) {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

export default function ImportDataPage() {
  const { model } = useParams();
  const navigate = useNavigate();
  const { previewImport, importSystemData } = useAppState();
  const { toast } = useUi();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const label = IMPORT_PAGES[model];
  if (!label) return <Navigate to="/settings?tab=systemData" replace />;

  const step = result ? 2 : preview ? 1 : 0;
  const backToSettings = () => navigate('/settings?tab=systemData');

  async function handleFile(f) {
    if (!f) return;
    setBusy(true);
    try {
      const p = await previewImport(model, f);
      if (!p.headers.length) { toast('That file has no header row to map.'); return; }
      setFile(f);
      setPreview(p);
      setMapping(p.mapping);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      setResult(await importSystemData(model, file, mapping));
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setFile(null); setPreview(null); setMapping({}); setResult(null);
  }

  const used = new Set(Object.values(mapping).filter(Boolean));
  const missing = preview
    ? preview.fields
      .filter((f) => f.required && !used.has(f.key) && !(ALTERNATIVES[f.key] && used.has(ALTERNATIVES[f.key])))
      .map((f) => f.label.replace(' ID', ''))
    : [];

  return (
    <div className="elg-page">
      <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={backToSettings}>Settings</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Import {label}</span>
      </div>

      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">Import {label}</div>
          <div className="elg-page-sub">Upload an Excel or CSV file, match its columns to ElegantsDesign fields, and import.</div>
        </div>
      </div>

      <div className="elg-import-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`elg-import-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span className="elg-import-step-num">{i < step ? '✓' : i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="elg-panel">
        {step === 0 && (
          <>
            <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />
            <div
              className={`elg-import-drop ${dragging ? 'dragging' : ''}`}
              onClick={() => !busy && inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <img src="/icons/upload-icon.svg" alt="" width="28" height="28" />
              <div style={{ fontWeight: 600, fontSize: 15 }}>{busy ? 'Reading file…' : 'Click to choose a file, or drag it here'}</div>
              <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>.xlsx, .xls or .csv · first row must be the column headers</div>
            </div>
            <div className="elg-import-actions">
              <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={backToSettings}>Cancel</button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="elg-import-filebar">
              <div>
                <div style={{ fontWeight: 600 }}>{file.name}</div>
                <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>{preview.rowCount} rows · {preview.headers.length} columns</div>
              </div>
              <button className="elg-btn elg-btn-sm" style={{ width: 'auto' }} onClick={startOver}>Change file</button>
            </div>
            <p style={{ fontSize: 14, margin: '0 0 14px', lineHeight: 1.5 }}>
              Match each column in your file to an ElegantsDesign field. Columns set to <strong>Don't import</strong> are ignored.
              Rows with an ID that already exists are updated; the rest are added.
            </p>

            <div className="elg-import-map-list">
              {preview.headers.map((h) => (
                <div key={h} className="elg-import-map-row">
                  <div className="elg-import-map-col">
                    <div style={{ fontWeight: 500 }}>{h}</div>
                    <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>e.g. {showSample(preview.sample[0]?.[h])}</div>
                  </div>
                  <div className="elg-import-map-arrow">→</div>
                  <select className="elg-select" value={mapping[h] || ''} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}>
                    <option value="">Don't import</option>
                    {preview.fields.map((f) => (
                      <option key={f.key} value={f.key} disabled={used.has(f.key) && mapping[h] !== f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, marginTop: 12, color: missing.length ? 'var(--elg-red-ink)' : 'var(--elg-ink-3)' }}>
              {missing.length
                ? `Not mapped yet (needed for new records): ${missing.join(', ')}.`
                : `${used.size} of ${preview.headers.length} columns mapped. * = required for new records.`}
            </div>

            <div className="elg-import-actions">
              <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={startOver}>Back</button>
              <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} disabled={busy || used.size === 0} onClick={handleImport}>
                {busy ? 'Importing…' : `Import ${preview.rowCount} rows`}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <ImportResults title={false} results={{ [label]: result }} />
            <div className="elg-import-actions">
              <button className="elg-btn" style={{ width: 'auto' }} onClick={startOver}>Import another file</button>
              <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={backToSettings}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
