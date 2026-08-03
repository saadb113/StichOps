const BASE = '/api';

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    method: options.method || 'GET',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include'
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler && path !== '/auth/login') unauthorizedHandler();
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.issues = data && data.issues;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body ?? {} }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body ?? {} }),
  delete: (path) => request(path, { method: 'DELETE' })
};
