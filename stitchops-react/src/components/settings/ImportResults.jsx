import { useUi } from '../../store/UiContext';
import { CloseIcon } from '../icons/Icon';

export function ImportResults({ title, results }) {
  return (
    <div>
      {Object.entries(results).map(([label, r]) => (
        <div key={label} style={{ marginBottom: 16 }}>
          {title !== false && <div style={{ fontWeight: 600, marginBottom: 6, textTransform: 'capitalize' }}>{label}</div>}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, marginBottom: 8 }}>
            <span>{r.created} added</span>
            <span>{r.updated} updated</span>
            {r.merged ? <span>{r.merged} merged into an existing customer</span> : null}
            {r.skipped ? <span>{r.skipped} empty rows skipped</span> : null}
            <span style={{ color: r.errors.length ? 'var(--elg-red-ink)' : undefined }}>{r.errors.length} failed</span>
          </div>
          {r.errors.length > 0 && (
            <div className="elg-import-errors">
              {r.errors.map((e, i) => (
                <div key={i}><strong>Row {e.row}:</strong> {e.message}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ImportResultsModal({ results }) {
  const { closeModal } = useUi();
  return (
    <div className="elg-modal">
      <div className="elg-modal-head elg-import-head">
        <div style={{ fontSize: 18, fontWeight: 700 }}>Import Results</div>
        <button className="elg-btn elg-btn-ghost elg-import-close" onClick={closeModal}><CloseIcon /></button>
      </div>
      <div className="elg-modal-body" style={{ padding: 24 }}><ImportResults results={results} /></div>
      <div className="elg-modal-foot elg-import-foot">
        <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={closeModal}>Done</button>
      </div>
    </div>
  );
}
