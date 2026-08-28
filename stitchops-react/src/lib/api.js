const BASE = '/api';

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

// Lets the UI show a global "something is happening" indicator for every
// in-flight request, without every caller having to manage its own loading
// state. Any number of listeners can subscribe; each is called with the
// current count of in-flight requests.
let activeRequests = 0;
const loadingListeners = new Set();
export function onLoadingChange(fn) {
  loadingListeners.add(fn);
  return () => loadingListeners.delete(fn);
}
function setActiveRequests(delta) {
  activeRequests += delta;
  loadingListeners.forEach((fn) => fn(activeRequests));
}

async function request(path, options = {}) {
  setActiveRequests(1);
  try {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(BASE + path, {
      method: options.method || 'GET',
      // FormData sets its own multipart Content-Type (with boundary) — let
      // the browser handle that header itself.
      headers: options.body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
      credentials: 'include'
    });

    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }

    if (!res.ok) {
      if (res.status === 401 && unauthorizedHandler && path !== '/auth/login') unauthorizedHandler();
      let message = (data && data.error) || `Request failed (${res.status})`;
      if (data && Array.isArray(data.issues) && data.issues.length) {
        message = data.issues.map((i) => {
          const key = i.path && i.path[0];
          if (!key) return i.message;
          const label = String(key).replace(/([A-Z])/g, ' $1').toLowerCase();
          return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${i.message}`;
        }).join(' ');
      }
      const err = new Error(message);
      err.status = res.status;
      err.issues = data && data.issues;
      throw err;
    }
    return data;
  } finally {
    setActiveRequests(-1);
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body ?? {} }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body ?? {} }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(path, { method: 'POST', body: form });
  }
};
