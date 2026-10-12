import { useEffect, useRef, useState } from 'react';
import RangeCalendar, { toISO, parseISO } from './RangeCalendar';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(iso) {
  const p = parseISO(iso);
  if (!p) return '';
  return `${p.d} ${MONTH_SHORT[p.m]} ${p.y}`;
}

function todayISO() {
  const n = new Date();
  return toISO(n.getFullYear(), n.getMonth(), n.getDate());
}

function startOfWeek(iso) {
  const p = parseISO(iso);
  const d = new Date(p.y, p.m, p.d);
  d.setDate(d.getDate() - d.getDay());
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(iso) {
  const p = parseISO(iso);
  return toISO(p.y, p.m, 1);
}
function startOfYear(iso) {
  const p = parseISO(iso);
  return toISO(p.y, 0, 1);
}

// Drop-in replacement for the from/to `<input type="date">` pair used
// across every filter bar — same `{from, to}` ISO-string contract, so
// callers only need to swap the markup, not their filter logic.
export default function RangeDateField({ from, to, onChange, placeholder = 'Select dates', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const seed = to || from || todayISO();
  const seedP = parseISO(seed);
  const [viewYear, setViewYear] = useState(seedP.y);
  const [viewMonth, setViewMonth] = useState(seedP.m);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  function navigate(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function handleSelectDay(iso) {
    if (!from || (from && to)) {
      onChange({ from: iso, to: null });
    } else if (iso >= from) {
      onChange({ from, to: iso });
      setOpen(false);
    } else {
      onChange({ from: iso, to: from });
      setOpen(false);
    }
  }

  function applyPreset(nextFrom, nextTo) {
    onChange({ from: nextFrom, to: nextTo });
    const p = parseISO(nextTo || nextFrom);
    setViewYear(p.y);
    setViewMonth(p.m);
    setOpen(false);
  }

  const label = from && to ? `${fmt(from)} – ${fmt(to)}` : (from ? `${fmt(from)} – …` : placeholder);

  return (
    <div className="elg-rangefield" ref={ref}>
      <button type="button" className="elg-input elg-rangefield-trigger" onClick={() => setOpen((v) => !v)}>
        <span className={from ? '' : 'placeholder'}>{label}</span>
        <img src="/images/calender.svg" alt="" />
      </button>
      {(from || to) && (
        <button type="button" className="elg-date-clear" title="Clear dates" onClick={() => onChange({ from: '', to: '' })}>&times;</button>
      )}
      {open && (
        <div className={`elg-rangefield-popover ${align === 'right' ? 'align-right' : ''}`}>
          <div className="elg-rangecal-presets">
            <button type="button" onClick={() => applyPreset(todayISO(), todayISO())}>Today</button>
            <button type="button" onClick={() => applyPreset(startOfWeek(todayISO()), todayISO())}>This Week</button>
            <button type="button" onClick={() => applyPreset(startOfMonth(todayISO()), todayISO())}>This Month</button>
            <button type="button" onClick={() => applyPreset(startOfYear(todayISO()), todayISO())}>This Year</button>
            <button type="button" className="clear" onClick={() => applyPreset('', '')}>Clear</button>
          </div>
          <RangeCalendar
            from={from}
            to={to}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onNavigate={navigate}
            onSelectDay={handleSelectDay}
            today={todayISO()}
          />
        </div>
      )}
    </div>
  );
}
