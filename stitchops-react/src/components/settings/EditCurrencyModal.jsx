import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export default function EditCurrencyModal({ rate }) {
  const { updateCurrencyRate, deleteCurrencyRate } = useAppState();
  const { closeModal, toast } = useUi();

  const [mode, setMode] = useState(rate.isCustom ? 'your' : 'market');
  const [marketValue, setMarketValue] = useState(String(rate.rate));
  const [yourValue, setYourValue] = useState(rate.isCustom ? String(rate.rate) : '');

  async function handleSave() {
    const raw = mode === 'market' ? marketValue : yourValue;
    const num = Number(raw);
    if (!num || num <= 0) { toast('Enter a valid rate.'); return; }
    try {
      await updateCurrencyRate(rate.currency, { rate: num, isCustom: mode === 'your' });
      toast(`${rate.currency} rate updated.`);
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  async function handleDelete() {
    try {
      await deleteCurrencyRate(rate.currency);
      toast(`${rate.currency} removed.`);
      closeModal();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <div className="elg-modal" style={{ maxWidth: 480 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 20, fontFamily: 'var(--elg-font-serif)', color: 'var(--elg-ink)' }}>Edit Currency — {rate.currency}</div>
        <button className="elg-btn elg-btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModal}>
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: 24 }}>
        <div className="elg-settings-rate-toggle">
          <label className="elg-settings-radio">
            <input type="radio" name="rateMode" checked={mode === 'market'} onChange={() => setMode('market')} />
            Market Rates
          </label>
          <label className="elg-settings-radio">
            <input type="radio" name="rateMode" checked={mode === 'your'} onChange={() => setMode('your')} />
            Your Rates
          </label>
        </div>

        {mode === 'market' ? (
          <div className="elg-field" style={{ marginBottom: 0 }}>
            <label>Current Rates</label>
            <input type="number" step="0.01" value={marketValue} onChange={(e) => setMarketValue(e.target.value)} />
          </div>
        ) : (
          <div className="elg-field" style={{ marginBottom: 0 }}>
            <label>Add Rates</label>
            <input type="number" step="0.01" value={yourValue} onChange={(e) => setYourValue(e.target.value)} placeholder={`e.g. ${rate.rate}`} />
          </div>
        )}
      </div>

      <div className="elg-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto', color: 'var(--elg-delete-red)' }} onClick={handleDelete}>Delete Currency</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
          <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
