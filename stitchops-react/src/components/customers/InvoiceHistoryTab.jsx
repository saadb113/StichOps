import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { fmt, paymentBadge } from '../../lib/helpers';
import { downloadInvoicePdf } from '../../lib/invoicePdf';
import EditInvoiceOrdersModal from '../invoices/EditInvoiceOrdersModal';
import { DownloadIcon, PencilIcon } from '../icons/Icon';

function invoiceBadgeInfo(inv) {
  const pb = paymentBadge(inv);
  if (pb.cls === 'b-completed') return { label: 'Paid', cls: 'elg-badge-paid' };
  const m = pb.label.match(/Unpaid — (\d+) months?/);
  if (m) {
    const n = Number(m[1]);
    return { label: `Unpaid (${n} Month${n > 1 ? 's' : ''})`, cls: 'elg-badge-unpaid' };
  }
  return { label: 'Pending', cls: 'elg-badge-pending-pay' };
}

export default function InvoiceHistoryTab({ customer }) {
  const { invoices, orders, company, togglePaymentStatus } = useAppState();
  const { openModal, toast } = useUi();

  const invs = invoices.filter((i) => i.customerId === customer.id).sort((a, b) => b.id - a.id);
  if (!invs.length) {
    return <div className="elg-panel"><div className="elg-empty">No invoices yet — approved invoices for {customer.company} will appear here.</div></div>;
  }

  async function handleToggle(id) {
    try {
      const next = await togglePaymentStatus(id);
      toast('Payment marked as ' + next + '.');
    } catch (e) {
      toast(e.message);
    }
  }

  function handleDownload(inv) {
    const lineOrders = orders.filter((o) => inv.orderIds.includes(o.id));
    downloadInvoicePdf({ invoice: inv, customer, company, orders: lineOrders });
  }

  return (
    <div className="elg-panel elg-table-wrap">
      <table className="elg-table">
        <thead><tr><th>Invoice</th><th>Generated</th><th>Approved</th><th>Total</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
        <tbody>
          {invs.map((i) => {
            const bi = invoiceBadgeInfo(i);
            return (
              <tr key={i.id}>
                <td>{i.invoiceNo}{i.version > 1 ? ` (v${i.version})` : ''}</td>
                <td>{i.generatedDate}</td>
                <td>{i.approvedDate || '—'}</td>
                <td>{fmt(i.total, i.currency)}</td>
                <td><span className={`elg-badge ${i.status === 'approved' ? 'elg-badge-completed' : 'elg-badge-pending-pay'}`}>{i.status === 'approved' ? 'Approved' : 'Pending Review'}</span></td>
                <td>{i.status === 'approved' ? <span className={`elg-badge clickable ${bi.cls}`} onClick={() => handleToggle(i.id)} title="Click to toggle">{bi.label}</span> : '—'}</td>
                <td>
                  {i.status === 'approved' && (
                    <div className="elg-row-actions">
                      <button className="elg-btn elg-download-btn" title="Download" onClick={() => handleDownload(i)}><img src="/images/download-invoice.svg" alt="Download" width={14} height={14} />Download</button>
                    </div>
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
