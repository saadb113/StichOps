import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';
import { DownloadIcon } from '../icons/Icon';

export default function SlipHistoryTab({ employee: e }) {
  const { payslips, togglePayslipPayment } = useAppState();
  const { openModal, toast } = useUi();

  const slips = payslips.filter((s) => s.employeeId === e.id).sort((a, b) => b.id - a.id);

  async function handleTogglePayment(s) {
    try {
      const status = await togglePayslipPayment(s.id);
      toast(status === 'Completed' ? `${s.slipNo} marked as paid.` : `${s.slipNo} marked as pending.`);
    } catch (err) {
      toast(err.message);
    }
  }
  if (!slips.length) {
    return (
      <div className="elg-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--elg-ink)', marginBottom: 4 }}>No salary slips yet</div>
        <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>Approved salary slips for {e.name} will appear here.</div>
      </div>
    );
  }

  return (
    <div className="elg-panel elg-table-wrap slipHistory">
      <table className="elg-table">
        <thead>
          <tr>
            <th>Slip No</th>
            <th>Approved Date</th>
            <th>Total Amount</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Actions</th>
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
              <td>
                <span
                  className={`elg-pill ${s.paymentStatus === 'Completed' ? 'elg-pill-approved' : 'elg-pill-review'}`}
                  style={{ cursor: 'pointer', background : `${s.paymentStatus !== 'Completed' ? "#E9898A" : "#74C374"}` }}
                  onClick={() => handleTogglePayment(s)}
                  title="Click to toggle payment status"
                >
                  {s.paymentStatus === 'Completed' ? 'Paid' : 'Pending'}
                </span>
              </td>
              <td>
                <button
                  className="elg-btn elg-btn-sm"
                  style={{padding : "4.5px 10px", width: 'auto', display: 'inline-flex', marginRight: 6 }}
                  onClick={() => toast('Downloading ' + s.slipNo + '.pdf')}
                >
                  <img src="/images/download.svg" alt="" /> Download
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
