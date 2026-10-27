import { ArrowLeftIcon } from '../icons/Icon';

// Loading placeholders. Each one renders inside the page's real containers
// (metric grid, table, mobile card list…) and reuses their classes, so the
// skeleton takes exactly the space the loaded content will.

export function Sk({ w = '100%', h = 14, r = 6, style, className = '' }) {
  return <span className={`elg-sk ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

// Text-line skeleton: exactly one line tall in the surrounding text's font
// and line-height (1lh), so it occupies the same space as the real text.
// `size` only sets a font size where the container doesn't provide one.
export function SkText({ w = '60%', size, style, className = '' }) {
  return (
    <span className={`elg-sk-line ${className}`} style={{ ...(size ? { fontSize: size } : null), ...style }}>
      <Sk w={w} h="0.75em" r={4} />
    </span>
  );
}

// `labels`: the page's real card titles — shown as-is so they wrap exactly
// like the loaded cards; only the value and the sub-line shimmer.
// `subs`: per card, fixed sub-line text (string) or how many shimmer lines
// the sub-line takes on phones (number) — extra lines are mobile-only,
// since these sub-lines fit on one line on desktop.
export function SkeletonMetricCards({ count = 4, labels, subs = [] }) {
  const items = labels || Array.from({ length: count }, () => null);
  const sub = (s) => (typeof s === 'string' ? s : Array.from({ length: s || 1 }, (_, k) => <SkText key={k} w={k ? '45%' : '70%'} className={k ? 'elg-sk-mobile-line' : ''} />));
  return items.map((label, i) => (
    <div className="elg-metric-card" key={i} aria-busy="true">
      <div className="elg-metric-head">
        <span className="elg-metric-label">{label ?? <SkText w={90} />}</span>
        <span className="elg-metric-icon"><Sk w={18} h={18} r={9} /></span>
      </div>
      <div className="elg-metric-value"><SkText w="55%" /></div>
      <div className="elg-metric-sub">{sub(subs[i])}</div>
    </div>
  ));
}

const CELL_WIDTHS = ['70%', '85%', '60%', '75%', '50%', '65%', '80%', '55%'];

export function SkeletonRows({ cols, rows = 8 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} className="elg-sk-row" aria-busy="true">
      {Array.from({ length: cols }, (_, c) => (
        <td key={c}><SkText w={CELL_WIDTHS[(r + c) % CELL_WIDTHS.length]} /></td>
      ))}
    </tr>
  ));
}

// Mobile card placeholder built from the same classes as the real cards.
// Shape options mirror each page's card:
//   avatar   – round avatar before the title (Customers)
//   subtitle – second line under the title (Invoices, Customers, Employees)
//   right    – 'action' (⋯ button) | 'badge' | 'price' | null, top-right of the card
//   rows     – number of icon + text rows
//   twoCol   – rows laid out two per line (Employees)
//   foot     – 'badge-price' | 'row-price' | null
export function SkeletonMobileCards({ count = 4, avatar = false, subtitle = false, right = 'action', rows = 1, twoCol = false, foot = 'badge-price' }) {
  const row = (k, w) => (
    <div className="elg-mobile-card-row" key={k}><Sk w={14} h={14} r={3} /><SkText w={w} /></div>
  );
  const rowEls = Array.from({ length: rows }, (_, j) => row(j, ['45%', '65%', '35%', '55%'][j % 4]));
  return Array.from({ length: count }, (_, i) => (
    <div className="elg-mobile-card" key={i} aria-busy="true">
      <div className="elg-mobile-card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {avatar && <span className="elg-mobile-avatar elg-sk" aria-hidden="true" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="elg-mobile-card-title"><SkText w={['60%', '48%', '70%', '55%'][i % 4]} /></div>
            {subtitle && <div className="elg-mobile-card-subtitle"><SkText w="35%" /></div>}
          </div>
        </div>
        {right === 'action' && <div className="elg-row-actions"><span className="elg-icon-sq elg-sk" aria-hidden="true" /></div>}
        {right === 'badge' && <Sk w={70} h={26} r={999} />}
        {right === 'price' && <span className="elg-mobile-card-price"><SkText w={70} /></span>}
      </div>
      {twoCol ? <div className="elg-mobile-card-2col">{rowEls}</div> : rowEls}
      {foot === 'badge-price' && (
        <div className="elg-mobile-card-foot">
          <Sk w={76} h={26} r={999} />
          <span className="elg-mobile-card-price"><SkText w={70} /></span>
        </div>
      )}
      {foot === 'row-price' && (
        <div className="elg-mobile-card-foot">
          <div className="elg-mobile-card-row" style={{ marginBottom: 0 }}><Sk w={14} h={14} r={3} /><SkText w={90} /></div>
          <span className="elg-mobile-card-price"><SkText w={60} /></span>
        </div>
      )}
    </div>
  ));
}

// Simple label/value list (profile details, settings fields).
export function SkeletonFieldList({ count = 5 }) {
  return (
    <div className="elg-sk-fields" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="elg-sk-field">
          <SkText w={90} size={12} />
          <SkText w={`${45 + ((i * 17) % 40)}%`} size={14} />
        </div>
      ))}
    </div>
  );
}

// Full profile page placeholder (customer / employee). `panels` are the real
// sidebar panel titles + field labels, so only the values shimmer.
export function ProfileSkeleton({ panels, tabs = 3, tabWidths = [], variant = 'customer' }) {
  const employee = variant === 'employee';
  const nameBlock = (
    <div style={{ minWidth: 220 }}>
      <div className="elg-profile-name-row">
        <div className="elg-profile-name" style={{ width: 200 }}><SkText w="100%" /></div>
        {!employee && <Sk w={56} h={22} r={999} />}
      </div>
      <div className={employee ? 'elg-page-sub' : 'elg-profile-sub'} style={{ width: 300 }}><SkText w="100%" /></div>
    </div>
  );
  return (
    <div className="elg-page" aria-busy="true">
      {/* Phones show this compact bar instead of the back link + large header (CSS-controlled). */}
      <div className="elg-mobile-profile-header">
        <span className="elg-mobile-back elg-sk" aria-hidden="true" />
        <span className="elg-mobile-avatar elg-sk" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="elg-mobile-card-title"><SkText w="60%" /></div>
          <div className="elg-mobile-card-subtitle"><SkText w="35%" /></div>
        </div>
        <span className="elg-icon-sq edit-toggle-btn elg-sk" aria-hidden="true" />
        <span className="elg-icon-sq edit-toggle-btn elg-sk" aria-hidden="true" />
      </div>
      <div className="elg-back-link" style={{ pointerEvents: 'none' }}>
        {employee ? <ArrowLeftIcon /> : <img src="/icons/customers-back-btn.svg" alt="" />} Back
      </div>
      {employee ? (
        <div className="elg-page-head elg-employee-profile-head">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="elg-avatar-lg elg-sk" aria-hidden="true" />
              {nameBlock}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Sk w={119} h={42} r={8} />
              <Sk w={40} h={42} r={8} />
            </div>
          </div>
        </div>
      ) : (
      <div className="elg-profile-head">
        <div className="elg-profile-id">
          <span className="elg-avatar-lg elg-sk" aria-hidden="true" />
          {nameBlock}
        </div>
        <div className="elg-profile-actions">
          <Sk w={120} h={40} r={8} />
          <Sk w={40} h={40} r={8} />
        </div>
      </div>
      )}
      <div className="elg-profile-grid elg-mobile-view-content">
        <div className="elg-mobile-tab-content-col">
          {tabs > 0 && (
            <div className="elg-tabs" style={employee ? { marginBottom: 18 } : undefined}>
              {Array.from({ length: tabs }, (_, i) => (
                <div className="elg-tab" key={i} style={{ pointerEvents: 'none', width: tabWidths[i] }}>
                  <Sk w={14} h={15} r={3} />
                  <SkText w={(tabWidths[i] || 110) - 50} />
                </div>
              ))}
            </div>
          )}
          <div className="elg-panel">
            <div className="elg-table-wrap">
              <table className="elg-table">
                <thead><tr>{[0, 1, 2, 3, 4].map((i) => <th key={i}><SkText w={60} size={12} /></th>)}</tr></thead>
                <tbody><SkeletonRows cols={5} rows={6} /></tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="elg-profile-sidebar">
          {panels.map((p, i) => (
            <div className="elg-panel" style={{ marginBottom: i < panels.length - 1 ? 16 : 0 }} key={p.title}>
              <div className="elg-panel-head"><h3>{p.title}</h3></div>
              <div className="elg-panel-body">
                <div className="elg-kv">
                  {p.rows.map((k, j) => (
                    <div className="elg-kv-row" key={k}>
                      <span className="k">{k}</span>
                      <span className="v"><Sk w={[90, 120, 70, 140, 100][j % 5]} h={12} /></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// One form field (real label, shimmering 46px input — the height of .elg-field input).
export function SkField({ label, style }) {
  return (
    <div className="elg-field" style={style}>
      <label>{label}</label>
      <Sk h={46} r={8} />
    </div>
  );
}

// A settings card with its real title and field labels, laid out in rows.
export function SettingsCardSkeleton({ title, rows = [], children, className = '' }) {
  return (
    <div className={`elg-settings-card ${className}`} aria-busy="true">
      <div className="elg-settings-card-title"><h2>{title}</h2></div>
      {rows.map((row, i) => (
        <div className="elg-field-row" key={i}>
          {row.map((label) => <SkField key={label} label={label} style={i === rows.length - 1 && !children ? { marginBottom: 0 } : undefined} />)}
        </div>
      ))}
      {children}
    </div>
  );
}

// Whole-app placeholder while we find out who's signed in: real sidebar,
// top bar and page frame, with shimmering nav items and content.
export function AppShellSkeleton() {
  return (
    <div id="app" className="elg-shell" aria-busy="true">
      <div id="sidebar" className="elg-sidebar">
        <div className="elg-logo"><img src="/images/elegants-logo-svg.svg" alt="ElegantsDesign" /></div>
        <div className="elg-nav">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div className="elg-nav-item" key={i} style={{ pointerEvents: 'none' }}>
              <Sk w={18} h={18} r={4} />
              <Sk w={[80, 60, 70, 85, 75, 65, 70][i]} h={12} />
            </div>
          ))}
        </div>
      </div>
      <div className="elg-main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <div className="elg-topbar">
          <Sk w={320} h={38} r={8} style={{ maxWidth: '50%' }} />
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <Sk w={38} h={38} r={8} />
            <Sk w={110} h={38} r={8} />
          </div>
        </div>
        <div id="main">
          <div className="elg-page">
            <div className="elg-crumbs"><Sk w={140} h={22} r={6} /></div>
            <div className="elg-page-head">
              <div style={{ width: 280, maxWidth: '100%' }}>
                <div className="elg-page-title"><SkText w="60%" size={28} /></div>
                <div className="elg-page-sub"><SkText w="100%" size={14} /></div>
              </div>
            </div>
            <div className="elg-metric-grid"><SkeletonMetricCards /></div>
            <div className="elg-panel elg-table-wrap">
              <table className="elg-table">
                <thead><tr>{[0, 1, 2, 3, 4, 5].map((i) => <th key={i}><SkText w={60} size={12} /></th>)}</tr></thead>
                <tbody><SkeletonRows cols={6} rows={6} /></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="auth-wrap" aria-busy="true">
      <div className="auth-card">
        <SkText w="45%" size={24} />
        <SkText w="75%" size={14} style={{ marginBottom: 20 }} />
        <Sk h={46} r={8} style={{ marginBottom: 14 }} />
        <Sk h={46} r={8} style={{ marginBottom: 20 }} />
        <Sk h={44} r={8} />
      </div>
    </div>
  );
}
