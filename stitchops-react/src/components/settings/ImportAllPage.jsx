import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAppState } from '../../store/AppStateContext';
import { useUi } from '../../store/UiContext';
import LegacyImportForm from './LegacyImportModal';
import { ImportResults } from './ImportResults';

export default function ImportAllPage() {
  const navigate = useNavigate();
  const { importAllSystemData } = useAppState();
  const { toast } = useUi();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [legacy, setLegacy] = useState(false);
  const [result, setResult] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const step = completed ? 2 : file ? 1 : 0;
  const back = () => navigate('/settings?tab=systemData');
  const reset = () => { setFile(null); setResult(null); setCompleted(false); };

  async function chooseFile(selected) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const preview = await api.upload('/system-data/import-all/preview', selected);
      setLegacy(preview.legacy);
      setFile(selected);
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  }

  async function importWorkbook() {
    setBusy(true);
    try {
      setResult(await importAllSystemData(file));
      setCompleted(true);
    } catch (e) { toast(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="elg-page">
      <div className="elg-crumbs">
        <span className="elg-crumb-pill" style={{ cursor: 'pointer' }} onClick={back}>Settings</span>
        <span className="elg-crumb-sep">/</span>
        <span className="elg-crumb-current">Import All Data</span>
      </div>
      <div className="elg-page-head"><div>
        <div className="elg-page-title">Import All Data</div>
        <div className="elg-page-sub">Upload an Excel or CSV file, review the detected columns and records, and import.</div>
      </div></div>
      <div className="elg-import-steps">
        {['Upload File', 'Map Columns & Review', 'Results'].map((label, i) => (
          <div key={label} className={`elg-import-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <span className="elg-import-step-num">{i < step ? '✓' : i + 1}</span><span>{label}</span>
          </div>
        ))}
      </div>
      {!file ? <div className="elg-panel">
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { chooseFile(e.target.files[0]); e.target.value = ''; }} />
        <div className={`elg-import-drop ${dragging ? 'dragging' : ''}`}
          onClick={() => !busy && input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }}>
          <img src="/icons/upload-icon.svg" alt="" width="28" height="28" />
          <div style={{ fontWeight: 600 }}>{busy ? 'Reading file…' : 'Click to choose a file, or drag it here'}</div>
          <div>.xlsx, .xls or .csv · Headers are detected automatically</div>
        </div>
        <div className="elg-import-actions"><button className="elg-btn elg-btn-ghost" onClick={back}>Cancel</button></div>
      </div> : legacy ? <LegacyImportForm file={file} onClose={completed ? back : reset} onResult={() => setCompleted(true)} /> :
        <div className="elg-panel">
          {result ? <ImportResults results={result} /> : <>
            <div className="elg-import-filebar"><strong>{file.name}</strong></div>
            <p>This workbook uses the app's export format. Matching Employees, Customers, Invoices and Orders sheets will be imported together. Existing records with matching IDs will be updated.</p>
          </>}
          <div className="elg-import-actions">
            <button className="elg-btn" disabled={busy} onClick={reset}>Change file</button>
            <button className="elg-btn elg-btn-primary" disabled={busy} onClick={result ? back : importWorkbook}>{result ? 'Done' : busy ? 'Importing…' : 'Import data'}</button>
          </div>
        </div>}
    </div>
  );
}
