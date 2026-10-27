// A minimal Server-Sent Events hub for pushing admin notifications live,
// so the topbar bell updates the instant something happens — no polling.
const clients = new Set();

// A browser tab closing, a phone sleeping or the proxy dropping the
// connection can leave a dead socket in the set; writing to it throws.
// That must only drop that one client — never crash the server.
function safeWrite(res, chunk) {
  if (res.writableEnded || res.destroyed) {
    clients.delete(res);
    return false;
  }
  try {
    res.write(chunk);
    return true;
  } catch (err) {
    clients.delete(res);
    return false;
  }
}

function addClient(res) {
  clients.add(res);
}

function removeClient(res) {
  clients.delete(res);
}

function broadcastNotification(notification) {
  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const res of [...clients]) safeWrite(res, payload);
}

module.exports = { addClient, removeClient, broadcastNotification, safeWrite };
