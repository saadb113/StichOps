import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';
import { DownloadIcon } from '../icons/Icon';

export default function SlipHistoryTab({ employee: e }) {
  const { payslips } = useAppState();
  const { openModal, toast } = useUi();

  const slips = payslips.filter((s) => s.employeeId === e.id).sort((a, b) => b.id - a.id);
  if (!slips.length) {
    return (
      <div className="elg-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--elg-ink)', marginBottom: 4 }}>No salary slips yet</div>
        <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>Approved salary slips for {e.name} will appear here.</div>
      </div>
    );
  }

  return (
    <div className="elg-panel elg-table-wrap">
      <table className="elg-table">
        <thead>
          <tr>
            <th>Slip No</th>
            <th>Approved Date</th>
            <th>Total Amount</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {slips.map((s) => (
            <tr key={s.id}>
              <td><strong style={{ color: 'var(--elg-primary)' }}>{s.slipNo}</strong></td>
              <td>{s.approvedDate}</td>
              <td><strong>{fmt(s.total, s.currency)}</strong></td>
              <td>
                <span className="elg-pill elg-pill-approved">Approved</span>
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button
                  className="elg-btn elg-btn-sm"
                  style={{ width: 'auto', display: 'inline-flex', marginRight: 6 }}
                  onClick={() => toast('Downloading ' + s.slipNo + '.pdf')}
                >
                  <DownloadIcon /> Download
                </button>
                <button
                  className="elg-btn elg-btn-ghost elg-btn-sm"
                  style={{ width: 'auto', display: 'inline-flex' }}
                  onClick={() => openModal(<EditSlipOrdersModal ctx={{ type: 'slip', slipId: s.id }} />, { variant: 'elegant' })}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '12px 18px', fontSize: '12px', color: 'var(--elg-ink-3)', borderTop: '1px solid var(--elg-line)' }}>
        Editing an order here updates the Reports commission summary and this employee's Earnings tab immediately.
      </div>
    </div>
  );
}
