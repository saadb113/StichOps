import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppStateContext, useAppState } from './AppStateContext';
import { UiContext, useUi } from './UiContext';
import { api } from '../lib/api';

// Gives a screen ONLY the records it needs, under the same names the rest of
// the app uses (`orders`, `customers`, `invoices`, `payslips`, `getCustomer`),
// so code works unchanged on a small slice instead of the whole database.
//
//   useScope({ customerId: 10 })              → fetch a slice from /api/scope
//   <ScopedData query={{ customerId: 10 }}>  → provide that slice to a subtree
//
// Only admins load data through scopes; other roles already receive just
// their own records at login, so for them both are pass-throughs.

const EMPTY = [];
const EMPTY_SLICE = { customers: EMPTY, orders: EMPTY, invoices: EMPTY, payslips: EMPTY };

const toQueryString = (query) => new URLSearchParams(
  Object.entries(query || {}).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => [k, String(v)])
).toString();

// Fetches the slice for `query` (null = don't fetch) and refetches whenever
// data changes anywhere (after a save, a live update…).
export function useScope(query) {
  const parent = useAppState();
  const enabled = parent.isAdmin && query != null;
  const key = enabled ? toQueryString(query) : null;
  const [state, setState] = useState({ key: null, slice: null });
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const n = ++seq.current;
    api.get(`/scope?${key}`)
      .then((r) => { if (n === seq.current) setState({ key, slice: r }); })
      .catch(() => { if (n === seq.current) setState({ key, slice: EMPTY_SLICE }); });
  }, [enabled, key, parent.listVersion]);

  return useMemo(() => {
    if (!parent.isAdmin) {
      const hidden = parent.hiddenOrderIds;
      return { customers: parent.customers, orders: hidden && hidden.size ? parent.orders.filter((o) => !hidden.has(o.id)) : parent.orders, invoices: parent.invoices, payslips: parent.payslips, getCustomer: parent.getCustomer, loading: parent.dataLoading };
    }
    // A slice fetched for a different query is stale — treat as loading.
    const slice = state.key === key ? state.slice : null;
    const customers = slice?.customers ?? EMPTY;
    const byId = new Map(customers.map((c) => [c.id, c]));
    const hidden = parent.hiddenOrderIds;
    const orders = slice?.orders ?? EMPTY;
    return {
      customers,
      orders: hidden && hidden.size ? orders.filter((o) => !hidden.has(o.id)) : orders,
      invoices: slice?.invoices ?? EMPTY,
      payslips: slice?.payslips ?? EMPTY,
      getCustomer: (id) => byId.get(id),
      loading: enabled && !slice
    };
  }, [parent, state, key, enabled]);
}

function createStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set: (next) => { value = next; listeners.forEach((l) => l()); },
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); }
  };
}

// Popups render at the top of the app (outside the scoped subtree), so the
// scoped data is handed to them through a store and kept live.
function ScopeBridge({ store, uiStore, children }) {
  const app = useSyncExternalStore(store.subscribe, store.get);
  const ui = useSyncExternalStore(uiStore.subscribe, uiStore.get);
  return (
    <AppStateContext.Provider value={app}>
      <UiContext.Provider value={ui}>{children}</UiContext.Provider>
    </AppStateContext.Provider>
  );
}

export default function ScopedData({ query, children }) {
  const parent = useAppState();
  const parentUi = useUi();
  const scope = useScope(query);
  const passThrough = !parent.isAdmin;

  const value = useMemo(() => (passThrough ? parent : {
    ...parent,
    customers: scope.customers,
    orders: scope.orders,
    invoices: scope.invoices,
    payslips: scope.payslips,
    getCustomer: scope.getCustomer,
    dataLoading: parent.dataLoading || scope.loading
  }), [parent, scope, passThrough]);

  const storeRef = useRef(null);
  const uiStoreRef = useRef(null);
  if (!storeRef.current) storeRef.current = createStore(value);

  const ui = useMemo(() => (passThrough ? parentUi : {
    ...parentUi,
    openModal: (node, opts) => parentUi.openModal(
      <ScopeBridge store={storeRef.current} uiStore={uiStoreRef.current}>{node}</ScopeBridge>,
      opts
    )
  }), [parentUi, passThrough]);
  if (!uiStoreRef.current) uiStoreRef.current = createStore(ui);

  useLayoutEffect(() => { storeRef.current.set(value); }, [value]);
  useLayoutEffect(() => { uiStoreRef.current.set(ui); }, [ui]);

  if (passThrough) return children;
  return (
    <AppStateContext.Provider value={value}>
      <UiContext.Provider value={ui}>{children}</UiContext.Provider>
    </AppStateContext.Provider>
  );
}
