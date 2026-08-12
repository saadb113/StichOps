// Small hand-drawn icon set for "The Elegants Design" redesign — no icon
// library dependency, matches this project's existing zero-dependency approach.
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function DashboardIcon(props) {
  return <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}
export function BagIcon(props) {
  return <svg {...base} {...props}><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
}
export function DocIcon(props) {
  return <svg {...base} {...props}><path d="M7 3h7l4 4v14H7Z" /><path d="M14 3v4h4" /><path d="M9.5 12.5h5M9.5 15.5h5M9.5 9.5h2" /></svg>;
}
export function PeopleIcon(props) {
  return <svg {...base} {...props}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9" r="2.4" /><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.8" /></svg>;
}
export function PersonIcon(props) {
  return <svg {...base} {...props}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></svg>;
}
export function ChartIcon(props) {
  return <svg {...base} {...props}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M2.5 20h19" /></svg>;
}
export function GearIcon(props) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-1.8-1L15 3h-4l-.3 2.9a7.7 7.7 0 0 0-1.8 1l-2.3-.9-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.8 1L9 21h4l.3-2.9c.7-.2 1.3-.6 1.8-1l2.3.9 2-3.4-2-1.5Z" /></svg>;
}
export function SearchIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
}
export function BellIcon(props) {
  return <svg {...base} {...props}><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
}
export function ChevronDownIcon(props) {
  return <svg {...base} {...props} width={props.width || 14} height={props.height || 14}><path d="M6 9l6 6 6-6" /></svg>;
}
export function PencilIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M4 20l1-4L16 5l3 3-11 11-4 1Z" /><path d="M14 7l3 3" /></svg>;
}
export function KebabIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16} fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>;
}
export function CloseIcon(props) {
  return <svg {...base} {...props} width={props.width || 18} height={props.height || 18}><path d="M6 6l12 12M18 6L6 18" /></svg>;
}
export function CalendarIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
}
export function WarningIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M12 3.5 21.5 20h-19L12 3.5Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.15" fill="currentColor" stroke="none" /></svg>;
}
export function PlusIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M12 5v14M5 12h14" /></svg>;
}
export function UserPlusIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.9 3.1-7 7-7 1 0 1.9.2 2.7.6" /><path d="M18 8v6M15 11h6" /></svg>;
}
export function ShieldIcon(props) {
  return <svg {...base} {...props}><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>;
}
export function TrendUpIcon(props) {
  return <svg {...base} {...props}><path d="M4 17L10 11L14 15L20 7" /><path d="M14 7h6v6" /></svg>;
}
export function DownloadIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>;
}
export function ArrowLeftIcon(props) {
  return <svg {...base} {...props} width={props.width || 15} height={props.height || 15}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg>;
}
export function ClockIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
}
export function MessageIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M4 5h16v11H8l-4 4V5Z" /></svg>;
}
export function BagOutlineSmallIcon(props) {
  return <svg {...base} {...props} width={props.width || 15} height={props.height || 15}><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
}

// ---- Filled "active" counterparts for sidebar nav icons ----
const filledBase = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'none' };

export function DashboardIconActive(props) {
  return <svg {...filledBase} {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}
export function BagIconActive(props) {
  return (
    <svg {...filledBase} {...props}>
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function DocIconActive(props) {
  return (
    <svg {...filledBase} {...props}>
      <path d="M7 3h7l4 4v14H7Z" />
      <path d="M14 3v4h4" fill="none" stroke="var(--elg-surface)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12.5h5M9.5 15.5h5M9.5 9.5h2" stroke="var(--elg-surface)" strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </svg>
  );
}
export function PeopleIconActive(props) {
  return <svg {...filledBase} {...props}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9" r="2.4" /><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.8" /></svg>;
}
export function PersonIconActive(props) {
  return <svg {...filledBase} {...props}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></svg>;
}
export function ChartIconActive(props) {
  return <svg {...filledBase} {...props}><rect x="2.8" y="10" width="3.4" height="10" rx="1" /><rect x="10.3" y="4" width="3.4" height="16" rx="1" /><rect x="17.8" y="7.5" width="3.4" height="12.5" rx="1" /></svg>;
}
export function EyeIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}
export function EyeOffIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M3 3l18 18" /><path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c7 0 10.5 7 10.5 7a15.6 15.6 0 0 1-3.2 4.1M6.6 6.6C3.4 8.6 1.5 12 1.5 12S5 19 12 19a10.4 10.4 0 0 0 3.4-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
}
export function GearIconActive(props) {
  return (
    <svg {...filledBase} {...props}>
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-1.8-1L15 3h-4l-.3 2.9a7.7 7.7 0 0 0-1.8 1l-2.3-.9-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.8 1L9 21h4l.3-2.9c.7-.2 1.3-.6 1.8-1l2.3.9 2-3.4-2-1.5Z" />
      <circle cx="12" cy="12" r="3" fill="var(--elg-surface)" />
    </svg>
  );
}

export function KeyIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M21 2l-2 2m-3 1l4 4-9 9-4-1-1-4 9-9Z" /><circle cx="7.5" cy="16.5" r="3.5" /></svg>;
}

export function TrashIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
}

export function MailIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
}

export function CheckIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><path d="M20 6L9 17l-5-5" /></svg>;
}

export function CopyIcon(props) {
  return <svg {...base} {...props} width={props.width || 16} height={props.height || 16}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}

export function BankIcon(props) {
  return <svg {...base} {...props} width={props.width || 18} height={props.height || 18}><path d="M3 10l9-6 9 6" /><path d="M4 10h16v9H4z" /><path d="M9 13v4M15 13v4" /><path d="M3 21h18" /></svg>;
}

export function IdCardIcon(props) {
  return <svg {...base} {...props} width={props.width || 18} height={props.height || 18}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="12" r="2" /><path d="M6 16.2c.5-1.4 1.4-2.2 2.5-2.2s2 .8 2.5 2.2" /><path d="M14 9.5h5M14 12.5h5M14 15.5h3" /></svg>;
}

