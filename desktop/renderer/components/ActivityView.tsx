import type { ActivityEntry } from "../../../shared/api.js";
import { bridgeMissing, getBridge } from "../bridge.js";
import { useBridgeQuery } from "../hooks.js";
import { ErrorNotice, Loading } from "./common.js";

const OUTCOME_LABELS: Readonly<Record<ActivityEntry["outcome"], string>> = { success: "OK", denied: "Denied", failure: "Failed" };

export function ActivityView() {
  const bridge = getBridge();
  const [activity, reload] = useBridgeQuery(
    () => (bridge ? bridge.listActivity(100) : Promise.resolve(bridgeMissing<readonly ActivityEntry[]>())),
    [],
  );

  return (
    <section className="activity" aria-labelledby="activity-heading">
      <header className="page-header page-header-row">
        <div>
          <h1 id="activity-heading">Activity</h1>
          <p className="muted">The backend's audit log of connections and actions, newest first. Secrets are redacted before anything is stored.</p>
        </div>
        <button type="button" className="button" onClick={reload}>
          Refresh
        </button>
      </header>
      {activity.status === "loading" ? <Loading label="Loading activity" /> : null}
      {activity.status === "error" ? <ErrorNotice error={activity.error} onRetry={reload} /> : null}
      {activity.status === "ready" && activity.data.length === 0 ? <p className="empty">No activity yet.</p> : null}
      {activity.status === "ready" && activity.data.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Event</th>
              <th scope="col">Result</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {activity.data.map((entry) => (
              <tr key={entry.id}>
                <td className="nowrap">{new Date(entry.at).toLocaleString()}</td>
                <td>
                  <code>{entry.action}</code>
                </td>
                <td>
                  <span className={`outcome outcome-${entry.outcome}`}>{OUTCOME_LABELS[entry.outcome]}</span>
                </td>
                <td>{entry.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
