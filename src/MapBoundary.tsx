import { Component, type ReactNode } from "react";

// Keeps a failing map (a Leaflet error, a bad saved route) from blanking the whole page:
// the rest of the dashboard or plan keeps working and the map area explains what happened.
export default class MapBoundary extends Component<{ children: ReactNode; className?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Map failed to render:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <div className={`map-failed ${this.props.className ?? ""}`} role="alert">
      <b>The map couldn't be displayed</b>
      <span>Your plan details below are unaffected. Try reloading the page.</span>
    </div>;
  }
}
