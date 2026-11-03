import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useUi } from '../../store/UiContext';
import { useAppState } from '../../store/AppStateContext';


const SYMBOL = { USD: '$', GBP: '£', AUD: 'A$', EUR: '€' };
const MAPPING_FIELDS = [
  ['date', 'Order date'], ['name', 'Customer name'], ['identifier', 'Customer email / company'],
  ['orderName', 'Order name'], ['designer', 'Designer'], ['salesperson', 'Salesperson'],
  ['productionCost', 'Production cost'], ['price', 'Price'], ['currency', 'Currency']
];
const CURRENCIES = ['USD', 'GBP', 'AUD', 'EUR'];
const money = (ccy, n) => `${SYMBOL[ccy] || `${ccy} `}${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Section({ title, children, note }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {note && <div style={{ fontSize: 13, color: 'var(--elg-ink-3)', marginBottom: 8 }}>{note}</div>}
      {children}
    </div>
  );
}

// Create-or-link picker for one customer / designer / salesperson.
function LinkSelect({ match, value, onChange }) {
  return (
    <select className="elg-input" style={{ minWidth: 200 }} value={value} onChange={(e) => onChange(e.target.value)}>
      {match && <option value={`link:${match.id}`}>Link to {match.label}</option>}
      <option value="create">Create new</option>
    </select>
  );
}

const defaultChoice = (item) => (item.match ? `link:${item.match.id}` : 'create');
const toDecision = (choice, extra = {}) => (choice.startsWith('link:')
  ? { action: 'link', customerId: Number(choice.slice(5)), employeeId: Number(choice.slice(5)) }
  : { action: 'create', ...extra });

// "Import old data": a client's own order sheet (not our export). Shows who
// each row belongs to — existing customers/designers/salespeople are linked,
// the rest created — and imports the orders once the admin confirms.
export default function LegacyImportForm({ file, onClose, onResult }) {
  const { toast } = useUi();
  const closeModal = onClose;
  const { refreshOrders, refreshCustomers, refreshEmployees } = useAppState();
  const [year, setYear] = useState('');
  // The year the preview was read with; text dates like "14 Sep" depend on it.

  const [historical, setHistorical] = useState(true);
  const [plan, setPlan] = useState(null);
  const [sheetMappings, setSheetMappings] = useState({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState({ customers: {}, designers: {}, salespeople: {} });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmUndo, setConfirmUndo] = useState(false);

  const previewRequest = useRef(null);
  function applyPlan(p) {
    setPlan(p);
    setYear(String(p.year));
    setSheetMappings(Object.fromEntries(p.sheets.map((s) => [s.name, {
      mapping: s.mapping,
      priceColumns: s.priceColumnIndexes
    }])));
    setMappingDirty(false);
    setChoices({
      customers: Object.fromEntries(p.customers.map((c) => [c.key, defaultChoice(c)])),
      designers: Object.fromEntries(p.designers.map((d) => [d.name, defaultChoice(d)])),
      salespeople: Object.fromEntries(p.salespeople.map((s) => [s.name, defaultChoice(s)]))
    });
  }

  useEffect(() => {
    let active = true;
    setPlan(null);
    setError('');
    if (previewRequest.current?.file !== file) {
      previewRequest.current = { file, promise: api.upload('/system-data/legacy/preview', file, { options: '{}' }) };
    }
    previewRequest.current.promise
      .then((p) => { if (active) applyPlan(p); })
      .catch((e) => { if (active && !e.duplicate) setError(e.message); });
    return () => { active = false; };
  }, [file]);

  async function updatePreview() {
    if (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > 2100) {
      toast('Enter a year between 1900 and 2100.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const p = await api.upload('/system-data/legacy/preview', file, {
        options: JSON.stringify({ year: Number(year) || plan.year, mapping: sheetMappings })
      });
      applyPlan(p);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  const setChoice = (kind, key, value) => setChoices((c) => ({ ...c, [kind]: { ...c[kind], [key]: value } }));

  async function handleImport() {
    setBusy(true);
    try {
      const decisions = {
        customers: Object.fromEntries(Object.entries(choices.customers).map(([k, v]) => [k, toDecision(v)])),
        designers: Object.fromEntries(Object.entries(choices.designers).map(([k, v]) => [k, toDecision(v)])),
        salespeople: Object.fromEntries(Object.entries(choices.salespeople).map(([k, v]) => [k, toDecision(v)]))
      };
      const r = await api.upload('/system-data/legacy/import', file, {
        options: JSON.stringify({ year: plan.year, historical, mapping: sheetMappings }),
        decisions: JSON.stringify(decisions)
      });
      setResult(r);
      onResult?.();
      await Promise.all([refreshOrders(), refreshCustomers(), refreshEmployees()]);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    setBusy(true);
    try {
      const r = await api.delete(`/system-data/legacy/batches/${result.batchId}`);
      await Promise.all([refreshOrders(), refreshCustomers(), refreshEmployees()]);
      toast(`Import undone — removed ${r.orders} orders, ${r.customers} customers, ${r.employees} employees.`);
      closeModal();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  const problemRows = plan ? plan.rows.filter((r) => r.errors.length || r.warnings.length) : [];
  const importable = plan ? plan.rows.filter((r) => !r.errors.length).length : 0;

  return (
    <div className="elg-panel">
      <div className="elg-import-filebar">
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Review imported data</div>
          <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>{file.name}</div>
        </div>
        <button className="elg-btn elg-btn-sm" style={{ width: 'auto' }} disabled={busy} onClick={closeModal}>{result ? 'Done' : 'Change file'}</button>
      </div>

      <div>
        {error && <div className="elg-import-errors">{error}</div>}
        {!error && !plan && !result && <div style={{ color: 'var(--elg-ink-3)' }}>Reading the sheet…</div>}

        {result && (
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            <div><strong>{result.orders}</strong> orders imported</div>
            <div><strong>{result.customers}</strong> customers created</div>
            <div><strong>{result.designers}</strong> designers and <strong>{result.salespeople}</strong> salespeople created</div>
            {result.duplicates > 0 && <div>{result.duplicates} already in the app — skipped</div>}
            {result.skippedRows.length > 0 && (
              <div className="elg-import-errors">
                {result.skippedRows.map((s) => <div key={s.row}><strong>Row {s.row.split('!')[1]}:</strong> {s.reason}</div>)}
              </div>
            )}
          </div>
        )}

        {plan && !result && (
          <>
            <Section title="Sheet columns" note="We detected these headers automatically. Review or change the field matches, then update the preview before importing.">
              {plan.sheets.map((sheet) => (
                <div key={sheet.name} style={{ border: '1px solid var(--elg-line)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>{sheet.name} <span style={{ color: 'var(--elg-ink-3)', fontWeight: 400 }}>· {sheet.header.length} columns</span></div>
                  <div className="elg-import-map-list">
                    {MAPPING_FIELDS.map(([field, label]) => (
                      <div className="elg-import-map-row" key={field}>
                        <div className="elg-import-map-col"><div style={{ fontWeight: 500 }}>{label}</div></div>
                        <div className="elg-import-map-arrow">→</div>
                        <select className="elg-select" value={sheetMappings[sheet.name]?.mapping?.[field] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSheetMappings((prev) => ({ ...prev, [sheet.name]: {
                              ...prev[sheet.name],
                              mapping: { ...prev[sheet.name].mapping, [field]: value === '' ? null : Number(value) }
                            }}));
                            setMappingDirty(true);
                          }}>
                          <option value="">Don't map</option>
                          {sheet.header.map((header, i) => <option key={`${i}:${header}`} value={i}>{header || `(blank column ${i + 1})`}</option>)}
                        </select>
                      </div>
                    ))}
                    {CURRENCIES.map((ccy) => (
                      <div className="elg-import-map-row" key={`price-${ccy}`}>
                        <div className="elg-import-map-col"><div style={{ fontWeight: 500 }}>{ccy} price column</div></div>
                        <div className="elg-import-map-arrow">→</div>
                        <select className="elg-select" value={sheetMappings[sheet.name]?.priceColumns?.[ccy] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSheetMappings((prev) => ({ ...prev, [sheet.name]: {
                              ...prev[sheet.name],
                              priceColumns: { ...prev[sheet.name].priceColumns, [ccy]: value === '' ? undefined : Number(value) }
                            }}));
                            setMappingDirty(true);
                          }}>
                          <option value="">No separate {ccy} column</option>
                          {sheet.header.map((header, i) => <option key={`${i}:${header}`} value={i}>{header || `(blank column ${i + 1})`}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="elg-btn" style={{ width: 'auto' }} disabled={busy || !mappingDirty} onClick={updatePreview}>
                  {busy ? 'Updating preview…' : 'Update preview'}
                </button>
              </div>
            </Section>
            <Section title="Summary">
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, alignItems: 'center' }}>
                <span><strong>{importable}</strong> orders</span>
                {Object.entries(plan.totals).map(([ccy, n]) => <span key={ccy}>{money(ccy, n)}</span>)}
                <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  Year
                  <input className="elg-input" style={{ width: 90 }} type="number" value={year}
                    onChange={(e) => { setYear(e.target.value); setMappingDirty(true); }} />
                </label>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginTop: 10 }}>
                <input type="checkbox" checked={historical} onChange={(e) => setHistorical(e.target.checked)} />
                Already invoiced and paid — mark orders Completed, commission and production cost paid
              </label>
            </Section>

            <Section title={`Customers (${plan.customers.length})`} note="Rows with the same email, company or name are grouped into one customer.">
              <div className="elg-table-wrap">
                <table className="elg-table">
                  <thead><tr><th>Customer</th><th>From the sheet</th><th>Orders</th><th>Action</th></tr></thead>
                  <tbody>
                    {plan.customers.map((c) => (
                      <tr key={c.key}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.company}</div>
                          <div style={{ fontSize: 12, color: 'var(--elg-ink-3)' }}>{[c.contact !== c.company && c.contact, c.email, c.country, c.currency].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{c.variants.map((v) => <div key={v}>{v}</div>)}</td>
                        <td>{c.orderCount}</td>
                        <td><LinkSelect match={c.match} value={choices.customers[c.key]} onChange={(v) => setChoice('customers', c.key, v)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {[['designers', 'Designers'], ['salespeople', 'Salespeople']].map(([kind, label]) => plan[kind].length > 0 && (
              <Section key={kind} title={label}>
                <div className="elg-table-wrap">
                  <table className="elg-table">
                    <thead><tr><th>Name in sheet</th><th>Orders</th><th>Action</th></tr></thead>
                    <tbody>
                      {plan[kind].map((p) => (
                        <tr key={p.name}>
                          <td>{p.name}</td>
                          <td>{p.orderCount}</td>
                          <td><LinkSelect match={p.match} value={choices[kind][p.name]} onChange={(v) => setChoice(kind, p.name, v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            ))}
            {plan.salespeople.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--elg-ink-3)', marginBottom: 20 }}>No salesperson column — new customers will be company-owned.</div>
            )}

            {problemRows.length > 0 && (
              <Section title="Check these rows" note="Rows marked “skipped” won't be imported.">
                <div className="elg-import-errors">
                  {problemRows.map((r) => (
                    <div key={`${r.sheet}${r.row}`}>
                      <strong>Row {r.row}{r.errors.length ? ' (skipped)' : ''}:</strong> {[...r.errors, ...r.warnings].join('; ')}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>

      <div className="elg-import-actions">
        {result ? (
          <>
            {confirmUndo ? (
              <>
                <span style={{ fontSize: 14, marginRight: 'auto' }}>Remove everything this import added?</span>
                <button className="elg-btn" style={{ width: 'auto' }} disabled={busy} onClick={() => setConfirmUndo(false)}>Keep</button>
                <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} disabled={busy} onClick={handleUndo}>{busy ? 'Undoing…' : 'Yes, undo'}</button>
              </>
            ) : (
              <>
                <button className="elg-btn" style={{ width: 'auto' }} onClick={() => setConfirmUndo(true)}>Undo import</button>
                <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={closeModal}>Done</button>
              </>
            )}
          </>
        ) : (
          <>
            <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
            <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} disabled={!plan || busy || mappingDirty || !importable} onClick={handleImport}>
              {busy ? 'Importing…' : `Import ${importable} orders`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
