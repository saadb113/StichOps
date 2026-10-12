import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { SYM } from '../../lib/constants';
import { bankAccountLines } from '../../lib/helpers';
import { CloseIcon, CheckIcon } from '../icons/Icon';

// Lets admin override the auto-picked (by customer currency) bank account on
// a draft invoice's Payment Details box with any account on file, for cases
// like paying into a different currency's account than the client is billed.
export default function SelectBankAccountModal({ selectedId, onSelect }) {
  const { bankAccounts } = useAppState();
  const { closeModal } = useUi();

  function pick(id) {
    onSelect(id);
    closeModal();
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 460 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--elg-ink)' }}>Select Bank Account</div>
        <button
          className="elg-btn elg-btn-ghost"
          style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 16 }}>
        {bankAccounts.length === 0 && (
          <div className="elg-empty">No bank accounts on file yet — add one from Settings &gt; Bank Accounts.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bankAccounts.map((a) => {
            const lines = bankAccountLines(a);
            const active = a.id === selectedId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => pick(a.id)}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${active ? 'var(--elg-primary)' : 'var(--elg-line)'}`,
                  background: active ? 'rgba(51,78,172,0.06)' : 'var(--elg-surface)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--elg-ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.currency} Account <span className="elg-ccy-tag" style={{ fontWeight: 500 }}>{a.currency} {SYM[a.currency] || ''}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--elg-ink-3)', lineHeight: 1.4}}>
                    {lines.length ? lines.map((l) => l.value).join(' · ') : (a.accountName || a.accountNo || 'No details on file')}
                  </div>
                </div>
                {active && <CheckIcon width={18} height={18} color="var(--elg-primary)" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
