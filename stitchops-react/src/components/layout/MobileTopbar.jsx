export default function MobileTopbar({ onToggleMenu }) {
  return (
    <div id="mobileTopbar">
      <div className="hamburger" onClick={onToggleMenu} aria-label="Menu"><span></span></div>
      <div className="brand">Stitch<span>Ops</span></div>
      <div style={{ width: 36 }}></div>
    </div>
  );
}
