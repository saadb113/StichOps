import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onLoadingChange } from '../lib/api';

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [toastMsg, setToastMsg] = useState('');
  const [toastAction, setToastAction] = useState(null); // { label, onClick }
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef(null);

  // Global "something is happening" spinner for every in-flight API request.
  // Delayed on the way in (so quick requests never flash it) but hidden
  // immediately once nothing's left in flight.
  const [loading, setLoading] = useState(false);
  const loadingShowTimer = useRef(null);
  useEffect(() => onLoadingChange((count) => {
    if (count > 0) {
      if (!loadingShowTimer.current) {
        loadingShowTimer.current = setTimeout(() => setLoading(true), 200);
      }
    } else {
      if (loadingShowTimer.current) { clearTimeout(loadingShowTimer.current); loadingShowTimer.current = null; }
      setLoading(false);
    }
  }), []);

  // opts: { action: { label, onClick }, duration } — action-bearing toasts
  // (e.g. "Order deleted. Undo") default to a longer duration so there's a
  // real window to act, like an email client's "Undo send".
  const toast = useCallback((msg, opts) => {
    setToastMsg(msg);
    setToastAction(opts && opts.action ? opts.action : null);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const duration = (opts && opts.duration) || (opts && opts.action ? 6000 : 2200);
    toastTimer.current = setTimeout(() => setToastShow(false), duration);
  }, []);

  const [modal, setModal] = useState(null); // { node, dismissible, variant }

  const openModal = useCallback((node, opts) => {
    setModal({ node, dismissible: !(opts && opts.dismissible === false), variant: (opts && opts.variant) || 'legacy' });
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  const isElegant = modal && modal.variant === 'elegant';
  const overlayClass = isElegant ? 'elg-overlay' : 'overlay';
  const modalClass = isElegant ? 'elg-modal' : 'modal';

  return (
    <UiContext.Provider value={{ toast, openModal, closeModal, isModalOpen: !!modal, loading }}>
      {children}
      <div className={`${overlayClass} ${modal ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget && modal && modal.dismissible) closeModal(); }}>
        <div className={modalClass}>{modal ? modal.node : null}</div>
      </div>
      <div className={`toast ${toastShow ? 'show' : ''}`}>
        {toastMsg}
        {toastAction && (
          <button
            className="toast-action"
            onClick={() => {
              if (toastTimer.current) clearTimeout(toastTimer.current);
              setToastShow(false);
              toastAction.onClick();
            }}
          >
            {toastAction.label}
          </button>
        )}
      </div>
      <div className={`global-spinner ${loading ? 'show' : ''}`} aria-hidden={!loading}>
        <div className="global-spinner-ring" />
      </div>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within UiProvider');
  return ctx;
}
