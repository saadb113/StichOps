import { useEffect, useState } from 'react';

// Renders `src` as an image, but falls back to `fallback` (usually initials)
// if the file 404s or otherwise fails to load — e.g. a stale upload
// reference pointing at a file that's no longer on disk. Resets the failed
// state whenever `src` changes so switching between employees/records
// doesn't carry over a previous broken-image state.
export default function Avatar({ src, alt = '', fallback, className }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
  }
  return <div className={className}>{fallback}</div>;
}
