import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onLoadingChange } from '../lib/api';

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [toastMsg, setToastMsg] = useState('');
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

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2200);
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
      <div className={`toast ${toastShow ? 'show' : ''}`}>{toastMsg}</div>
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
