import { useEffect, useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export default function EditCurrencyModal({ rate }) {
  const { updateCurrencyRate, deleteCurrencyRate, fetchMarketRate } = useAppState();
  const { closeModal, toast } = useUi();

  const [mode, setMode] = useState(rate.isCustom ? 'your' : 'market');
  const [marketValue, setMarketValue] = useState(rate.isCustom ? '' : String(rate.rate));
  const [marketBase, setMarketBase] = useState('');
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [yourValue, setYourValue] = useState(rate.isCustom ? String(rate.rate) : '');

  async function loadMarketRate() {
    setMarketLoading(true);
    setMarketError('');
    try {
      const res = await fetchMarketRate(rate.currency);
      setMarketValue(res.rate.toFixed(2));
      setMarketBase(res.base);
    } catch (e) {
      setMarketError(e.message);
    } finally {
      setMarketLoading(false);
    }
  }

  useEffect(() => {
    if (mode === 'market') loadMarketRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function handleSave() {
    if (mode === 'market' && marketLoading) { toast('Still fetching the market rate — hang on.'); return; }
    if (mode === 'market' && marketError) { toast('Could not fetch a market rate. Try refreshing or switch to Your Rates.'); return; }
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
    <div className="elg-modal" style={{ maxWidth: 540 }}>
      <div className="elg-modal-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--elg-line)' }}>
        <div style={{ fontSize: 20, fontFamily: 'var(--elg-font-serif)', color: 'var(--elg-ink)' }}>Edit Currency — {rate.currency}</div>
        <button className="elg-btn elg-btn-ghost" style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModal}>
          <CloseIcon />
        </button>
      </div>

      <div className="elg-modal-body" style={{ padding: "30px 24px" }}>
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
            <label>Current Rates{marketBase ? ` (per 1 ${rate.currency}, in ${marketBase})` : ''}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                step="0.01"
                value={marketLoading ? '' : marketValue}
                placeholder={marketLoading ? 'Fetching…' : marketError ? '—' : ''}
                readOnly
                disabled
              />
              <button
                type="button"
                className="elg-btn"
                style={{ width: 'auto', flexShrink: 0 }}
                onClick={loadMarketRate}
                disabled={marketLoading}
              >
                Refresh
              </button>
            </div>
            {marketError && (
              <div style={{ color: 'var(--elg-delete-red)', fontSize: 12.5, marginTop: 6 }}>{marketError}</div>
            )}
          </div>
        ) : (
          <div className="elg-field" style={{ marginBottom: 0 }}>
            <label>Add Rates</label>
            <input type="number" step="0.01" value={yourValue} onChange={(e) => setYourValue(e.target.value)} placeholder={`e.g. ${rate.rate}`} />
          </div>
        )}
      </div>

      <div className="elg-modal-foot edit-currency-modal-foot" style={{ padding: '16px 24px', borderTop: '1px solid var(--elg-line)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <button className="elg-btn elg-btn-ghost" style={{ width: 'auto', color: 'var(--elg-delete-red)' }} onClick={handleDelete}>Delete Currency</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="elg-btn" style={{ width: 'auto' }} onClick={closeModal}>Cancel</button>
          <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
