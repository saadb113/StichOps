import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

// A required ID field is satisfied by mapping either the ID column or its
// name-lookup alternative (e.g. Customer ID *or* Customer company name).
const ALTERNATIVES = { customerId: 'customerName', designerId: 'designerName' };

function showSample(v) {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

export function ImportResults({ title, results }) {
  return (
    <div>
      {Object.entries(results).map(([label, r]) => (
        <div key={label} style={{ marginBottom: 16 }}>
          {title !== false && <div style={{ fontWeight: 600, marginBottom: 6, textTransform: 'capitalize' }}>{label}</div>}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, marginBottom: 8 }}>
            <span>{r.created} added</span>
            <span>{r.updated} updated</span>
            {r.skipped ? <span>{r.skipped} empty rows skipped</span> : null}
            <span style={{ color: r.errors.length ? 'var(--elg-red-ink)' : undefined }}>{r.errors.length} failed</span>
          </div>
          {r.errors.length > 0 && (
            <div className="elg-import-errors">
              {r.errors.map((e, i) => (
                <div key={i}><strong>Row {e.row}:</strong> {e.message}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ImportResultsModal({ results }) {
  const { closeModal } = useUi();
  return (
    <div className="elg-modal">
      <div className="elg-modal-head elg-import-head">
        <div style={{ fontSize: 18, fontWeight: 700 }}>Import Results</div>
        <button className="elg-btn elg-btn-ghost elg-import-close" onClick={closeModal}><CloseIcon /></button>
      </div>
      <div className="elg-modal-body" style={{ padding: 24 }}><ImportResults results={results} /></div>
      <div className="elg-modal-foot elg-import-foot">
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={closeModal}>Done</button>
      </div>
    </div>
  );
}

export default function ImportMappingModal({ page, file, preview }) {
  const { importSystemData } = useAppState();
  const { closeModal, toast } = useUi();
  const [mapping, setMapping] = useState(preview.mapping);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const used = new Set(Object.values(mapping).filter(Boolean));
  const missing = preview.fields
    .filter((f) => f.required && !used.has(f.key) && !(ALTERNATIVES[f.key] && used.has(ALTERNATIVES[f.key])))
    .map((f) => f.label.replace(' ID', ''));
  const mappedCount = used.size;

  function setField(header, key) {
    setMapping((m) => ({ ...m, [header]: key }));
  }

  async function handleImport() {
    setBusy(true);
    try {
      setResult(await importSystemData(page.key, file, mapping));
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="elg-modal elg-import-modal">
      <div className="elg-modal-head elg-import-head">
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{result ? `${page.label} Import Results` : `Map Columns — ${page.label}`}</div>
          <div style={{ fontSize: 13, color: 'var(--elg-ink-3)', marginTop: 2 }}>{file.name} · {preview.rowCount} rows</div>
        </div>
        <button className="elg-btn elg-btn-ghost elg-import-close" onClick={closeModal}><CloseIcon /></button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        {result ? (
          <ImportResults title={false} results={{ [page.label]: result }} />
        ) : (
          <>
            <p style={{ fontSize: 14, margin: '0 0 14px', lineHeight: 1.5 }}>
              Match each column in your file to a StitchOps field. Columns set to <strong>Don't import</strong> are ignored.
              Rows with an ID that already exists are updated; the rest are added.
            </p>
            <div className="elg-table-wrap elg-import-map">
              <table className="elg-table">
                <thead><tr><th>Column in file</th><th>Sample</th><th>Import as</th></tr></thead>
                <tbody>
                  {preview.headers.map((h) => (
                    <tr key={h}>
                      <td style={{ fontWeight: 500 }}>{h}</td>
                      <td style={{ color: 'var(--elg-ink-3)' }}>{showSample(preview.sample[0]?.[h])}</td>
                      <td>
                        <select className="elg-select" value={mapping[h] || ''} onChange={(e) => setField(h, e.target.value)}>
                          <option value="">Don't import</option>
                          {preview.fields.map((f) => (
                            <option key={f.key} value={f.key} disabled={used.has(f.key) && mapping[h] !== f.key}>
                              {f.label}{f.required ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 13, marginTop: 12, color: missing.length ? 'var(--elg-red-ink)' : 'var(--elg-ink-3)' }}>
              {missing.length
                ? `Not mapped yet (needed for new records): ${missing.join(', ')}.`
                : `${mappedCount} of ${preview.headers.length} columns mapped. * = required for new records.`}
            </div>
          </>
        )}
      </div>

      <div className="elg-modal-foot elg-import-foot">
        {result ? (
          <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={closeModal}>Done</button>
        ) : (
          <>
            <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
            <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} disabled={busy || mappedCount === 0} onClick={handleImport}>
              {busy ? 'Importing…' : `Import ${preview.rowCount} rows`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
