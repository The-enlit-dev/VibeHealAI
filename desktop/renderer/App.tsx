import { useState } from "react";
import { ActivityView } from "./components/ActivityView.js";
import { Marketplace } from "./components/Marketplace.js";

type Page = "integrations" | "activity";

export function App() {
  const [page, setPage] = useState<Page>("integrations");

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">VibeHeal</div>
        <ul className="nav">
          <li>
            <button type="button" className="nav-item" aria-current={page === "integrations" ? "page" : undefined} onClick={() => setPage("integrations")}>
              Integrations
            </button>
          </li>
          <li>
            <button type="button" className="nav-item" aria-current={page === "activity" ? "page" : undefined} onClick={() => setPage("activity")}>
              Activity
            </button>
          </li>
        </ul>
        <div className="sidebar-note">
          <strong>Broken-project workflow</strong>
          <p>Inspect, explain, back up, review and undo. Not built yet: planned for milestones M1 to M4.</p>
        </div>
      </nav>
      <main className="content">{page === "integrations" ? <Marketplace /> : <ActivityView />}</main>
    </div>
  );
}
