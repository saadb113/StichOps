import { createContext, useCallback, useContext, useRef, useState } from 'react';

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2200);
  }, []);

  const [modal, setModal] = useState(null); // { node, dismissible }

  const openModal = useCallback((node, opts) => {
    setModal({ node, dismissible: !(opts && opts.dismissible === false) });
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <UiContext.Provider value={{ toast, openModal, closeModal, isModalOpen: !!modal }}>
      {children}
      <div className={`overlay ${modal ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget && modal && modal.dismissible) closeModal(); }}>
        <div className="modal">{modal ? modal.node : null}</div>
      </div>
      <div className={`toast ${toastShow ? 'show' : ''}`}>{toastMsg}</div>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within UiProvider');
  return ctx;
}
