import { useRef, useState } from 'react';
import { useUi } from '../../store/UiContext';

function ImageStackIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="24" height="24" rx="6" fill="var(--elg-primary)" opacity="0.15" />
      <rect x="10" y="6" width="24" height="24" rx="6" fill="var(--elg-primary)" />
      <circle cx="18" cy="14" r="2.2" fill="#fff" />
      <path d="M12 27l5.5-6.5 4 4.4L26 17.5l6 9.5H12z" fill="#fff" opacity="0.92" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 4h11M6 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4m2 0-.5 8.5a1.5 1.5 0 0 1-1.5 1.4H6.5A1.5 1.5 0 0 1 5 12.5L4.5 4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUploadBox({ imageUrl, onUpload, onDelete, hint = 'Support for JPG, PNG up to 5MB' }) {
  const { toast } = useUi();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast('Please choose a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast('Image must be 5MB or smaller.');
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
      toast('Image updated.');
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (!onDelete) return;
    setBusy(true);
    try {
      await onDelete();
      toast('Image removed.');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  }

  return (
    <div
      className={`elg-upload-box ${dragOver ? 'drag-over' : ''}`}
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }}
      />
      {imageUrl ? (
        <div className="elg-upload-preview">
          <img src={imageUrl} alt="" />
          {onDelete && (
            <button className="elg-upload-delete" title="Remove image" onClick={handleDelete} disabled={busy}>
              <TrashIcon />
            </button>
          )}
          <div className="elg-upload-preview-overlay">{busy ? 'Working…' : 'Click or drop to replace'}</div>
        </div>
      ) : (
        <>
          <img src="/icons/image-upload-icon.svg" />
          <div className="elg-upload-title">{busy ? 'Uploading…' : 'Drag image here or browse'}</div>
          <div className="elg-upload-hint">{hint}</div>
        </>
      )}
    </div>
  );
}
