import { useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

// Pure, controlled day-grid for a single month — the popover shell
// (trigger, presets, positioning) lives in RangeDateField. `from`/`to` are
// ISO yyyy-mm-dd strings or null, matching every page's existing filter
// state so this drops in without changing comparison/filter logic elsewhere.
export default function RangeCalendar({ from, to, onSelectDay, viewYear, viewMonth, onNavigate, today }) {
  const [hover, setHover] = useState(null);

  const todayISO = today || toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();
  const total = daysInMonth(viewYear, viewMonth);
  const prevTotal = daysInMonth(viewYear, viewMonth - 1 < 0 ? 11 : viewMonth - 1);

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    const pm = viewMonth - 1 < 0 ? 11 : viewMonth - 1;
    const py = viewMonth - 1 < 0 ? viewYear - 1 : viewYear;
    cells.push({ y: py, m: pm, d: prevTotal - startOffset + i + 1, outside: true });
  }
  for (let d = 1; d <= total; d++) cells.push({ y: viewYear, m: viewMonth, d, outside: false });
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const nm = last.m + 1 > 11 ? 0 : last.m + 1;
    const ny = last.m + 1 > 11 ? last.y + 1 : last.y;
    const prevCellMonth = cells[cells.length - 1].m;
    const d = prevCellMonth === viewMonth ? cells.length - (startOffset + total) + 1 : last.d + 1;
    cells.push({ y: ny, m: nm, d, outside: true });
    if (cells.length >= 42) break;
  }

  const rangeStart = from;
  const rangeEnd = to || hover;
  const lo = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : null;
  const hi = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : null;

  return (
    <div className="elg-rangecal">
      <div className="elg-rangecal-head">
        <button type="button" className="elg-rangecal-nav" onClick={() => onNavigate(-1)} aria-label="Previous month">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="elg-rangecal-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button type="button" className="elg-rangecal-nav" onClick={() => onNavigate(1)} aria-label="Next month">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="elg-rangecal-weekdays">
        {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="elg-rangecal-grid" aria-label="Range calendar" role="grid" onMouseLeave={() => setHover(null)}>
        {cells.map((c, idx) => {
          const iso = toISO(c.y, c.m, c.d);
          const isStart = iso === rangeStart;
          const isEnd = iso === to;
          const inRange = lo && hi && iso > lo && iso < hi;
          const isToday = iso === todayISO;
          const cls = [
            'elg-rangecal-day',
            c.outside ? 'outside' : '',
            isStart ? 'range-start' : '',
            isEnd ? 'range-end' : '',
            inRange ? 'in-range' : '',
            isToday ? 'today' : ''
          ].filter(Boolean).join(' ');
          return (
            <button
              type="button"
              key={idx}
              className={cls}
              onClick={() => onSelectDay(iso)}
              onMouseEnter={() => setHover(iso)}
            >
              {c.d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { toISO, parseISO };
