import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, paymentBadge } from '../../lib/helpers';
import EditInvoiceOrdersModal from '../invoices/EditInvoiceOrdersModal';

export default function InvoiceHistoryTab({ customer }) {
  const { invoices, togglePaymentStatus } = useAppState();
  const { openModal, toast } = useUi();

  const invs = invoices.filter((i) => i.customerId === customer.id).sort((a, b) => b.id - a.id);
  if (!invs.length) {
    return <div className="panel"><div className="empty"><i>No invoices yet</i>Approved invoices for {customer.company} will appear here.</div></div>;
  }

  async function handleToggle(id) {
    try {
      const next = await togglePaymentStatus(id);
      toast('Payment marked as ' + next + '.');
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="panel">
      <table>
        <thead><tr><th>Invoice</th><th>Generated</th><th>Approved</th><th>Total</th><th>Status</th><th>Payment</th><th></th></tr></thead>
        <tbody>
          {invs.map((i) => {
            const pb = paymentBadge(i);
            return (
              <tr key={i.id}>
                <td>{i.invoiceNo}{i.version > 1 ? ` (v${i.version})` : ''}</td>
                <td>{i.generatedDate}</td>
                <td>{i.approvedDate || '—'}</td>
                <td>{fmt(i.total, i.currency)}</td>
                <td><span className={`badge ${i.status === 'approved' ? 'b-approved' : 'b-review'}`}>{i.status === 'approved' ? 'Approved' : 'Pending review'}</span></td>
                <td>{i.status === 'approved' ? <span className={`badge ${pb.cls}`} style={{ cursor: 'pointer' }} onClick={() => handleToggle(i.id)} title="Click to toggle">{pb.label}</span> : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {i.status === 'approved' && (
                    <>
                      <button className="btn btn-sm" onClick={() => toast('Downloading ' + i.invoiceNo + '.pdf')}>Download</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => openModal(<EditInvoiceOrdersModal invoiceId={i.id} />, { variant: 'elegant' })}>Edit</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
