import { useState } from 'react';
import { api } from '../../lib/api';
import { downloadBlob } from '../../lib/helpers';
import { useUi } from '../../store/UiContext';

// Exports every record matching the screen's current filters (all pages,
// not just the visible one) as an Excel file, e.g.
// ElegantsDesign_orders_2026-11-01_to_2026-11-30.xlsx
export default function ExportButton({ kind, filters }) {
  const { toast } = useUi();
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const qs = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => [k, String(v)])
      ).toString();
      const blob = await api.download(`/exports/${kind}${qs ? `?${qs}` : ''}`);
      const range = filters.from && filters.to ? `_${filters.from}_to_${filters.to}` : filters.from ? `_from_${filters.from}` : '';
      const team = kind === 'employees' && filters.category ? `_${String(filters.category).replace(/\s+/g, '-')}` : '';
      downloadBlob(blob, `ElegantsDesign_${kind}${team}${range}.xlsx`);
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="elg-btn elg-export-btn"
      style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
      onClick={handleExport}
      disabled={busy}
      title="Export everything matching the current filters to Excel"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3v9.5M10 12.5l-3-3M10 12.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {busy ? 'Exporting…' : 'Export'}
    </button>
  );
}
