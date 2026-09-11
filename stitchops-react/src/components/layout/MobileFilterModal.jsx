import { useState } from 'react';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

// Mobile-only "filter sheet" opened from the funnel-icon button next to
// search on Orders/Invoices — desktop shows these as inline selects, mobile
// collects them into one modal so the search bar stays uncluttered.
export default function MobileFilterModal({ title = 'Filters', fields, values, onApply }) {
  const { closeModal } = useUi();
  const [draft, setDraft] = useState(values);

  function update(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleApply() {
    onApply(draft);
    closeModal();
  }

  function handleClear() {
    const cleared = Object.fromEntries(Object.keys(draft).map((k) => [k, '']));
    onApply(cleared);
    closeModal();
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 420 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 20, fontFamily: 'var(--elg-font-serif)', color: 'var(--elg-ink)' }}>{title}</div>
        <button className="elg-btn elg-btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModal}>
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {fields.map((f) => (
          <div className="elg-field" key={f.key} style={{ marginBottom: 0 }}>
            <label>{f.label}</label>
            {f.type === 'dateRange' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="date" className="elg-input" style={{ flex: 1, minWidth: 0 }} value={draft[f.fromKey] || ''} onChange={(e) => update(f.fromKey, e.target.value)} />
                <span style={{ color: 'var(--elg-ink-3)', fontSize: 13, flexShrink: 0 }}>to</span>
                <input type="date" className="elg-input" style={{ flex: 1, minWidth: 0 }} value={draft[f.toKey] || ''} onChange={(e) => update(f.toKey, e.target.value)} />
              </div>
            ) : (
              <select className="elg-select" style={{ width: '100%' }} value={draft[f.key] || ''} onChange={(e) => update(f.key, e.target.value)}>
                <option value="">{f.allLabel}</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto' }} onClick={handleClear}>Clear All</button>
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleApply}>Apply Filters</button>
      </div>
    </div>
  );
}
