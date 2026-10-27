import { Component } from 'react';

// Catches render errors anywhere below it so a bug on one screen shows a
// recoverable message instead of blanking the whole site (white screen).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Screen crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Navigating to another page clears the error so the rest of the app keeps working.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="elg-page">
        <div className="elg-panel" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center', padding: 32 }}>
          <div className="elg-section-title" style={{ marginBottom: 8 }}>Something went wrong on this page</div>
          <p style={{ fontSize: 14, color: 'var(--elg-ink-3)', margin: '0 0 20px', lineHeight: 1.5 }}>
            The rest of the app is still working. Try reloading, or go to another page from the menu.
          </p>
          <button className="elg-btn elg-btn-primary" style={{ width: 'auto' }} onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
