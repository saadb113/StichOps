import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt } from '../../lib/helpers';
import EditSlipOrdersModal from './EditSlipOrdersModal';

export default function SlipHistoryTab({ employee: e }) {
  const { payslips } = useAppState();
  const { openModal, toast } = useUi();

  const slips = payslips.filter((s) => s.employeeId === e.id).sort((a, b) => b.id - a.id);
  if (!slips.length) return <div className="panel"><div className="empty"><i>No slips yet</i>Approved salary slips for {e.name} will appear here.</div></div>;

  return (
    <div className="panel">
      <table>
        <thead><tr><th>Slip</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {slips.map((s) => (
            <tr key={s.id}>
              <td>{s.slipNo}</td>
              <td>{s.approvedDate}</td>
              <td>{fmt(s.total, s.currency)}</td>
              <td><span className="badge b-approved">Approved</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-sm" onClick={() => toast('Downloading ' + s.slipNo + '.pdf')}>Download</button>
                <button className="btn btn-sm btn-ghost" onClick={() => openModal(<EditSlipOrdersModal ctx={{ type: 'slip', slipId: s.id }} />)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '10px 18px', fontSize: '11.5px', color: 'var(--ink-3)', borderTop: '1px solid var(--line)' }}>Editing an order here also updates the Reports commission summary and this employee's Earnings tab immediately.</div>
    </div>
  );
}
