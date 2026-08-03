export function copyToClipboard(text, label, toast) {
  const done = () => toast((label || 'Copied') + ' to clipboard.');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done, toast));
  } else {
    fallbackCopy(text, done, toast);
  }
}

function fallbackCopy(text, done, toast) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    toast('Could not copy — please copy manually.');
  }
  document.body.removeChild(ta);
}
