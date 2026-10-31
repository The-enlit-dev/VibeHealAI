import { useState } from "react";
import type { ActionResult } from "../../../shared/api.js";
import { bridgeMissing, getBridge } from "../bridge.js";
import { ErrorNotice, Loading } from "../components/common.js";
import { useBridgeQuery } from "../hooks.js";
import type { ContextViewProps } from "./index.js";

// Read-only GitHub context: repositories, then branches, recent commits and open pull
// requests for the selected one. All text from GitHub is rendered as plain text (IN-7).

interface Repository {
  readonly id: number | null;
  readonly fullName: string | null;
  readonly owner: string | null;
  readonly name: string | null;
  readonly private: boolean;
  readonly defaultBranch: string | null;
  readonly htmlUrl: string | null;
}
interface Branch {
  readonly name: string | null;
  readonly protected: boolean;
}
interface Commit {
  readonly sha: string | null;
  readonly message: string | null;
  readonly authorName: string | null;
  readonly authoredAt: string | null;
}
interface PullRequest {
  readonly number: number | null;
  readonly title: string | null;
  readonly draft: boolean;
  readonly headRef: string | null;
  readonly htmlUrl: string | null;
}

function useAction<T>(connectionId: string, capabilityId: string, input: Record<string, unknown> | null) {
  const bridge = getBridge();
  const key = input ? JSON.stringify(input) : null;
  return useBridgeQuery<T | null>(async () => {
    if (!input) return { ok: true, data: null };
    if (!bridge) return bridgeMissing<T>();
    const result = await bridge.runAction(connectionId, capabilityId, input);
    return result.ok ? { ok: true, data: (result.data as ActionResult).data as T } : result;
  }, [connectionId, capabilityId, key]);
}

export function GitHubContext({ provider, connectionId }: ContextViewProps) {
  const bridge = getBridge();
  const [repos, reloadRepos] = useAction<{ totalCount: number; repositories: Repository[] }>(connectionId, "github.repositories.list", {});
  const [selected, setSelected] = useState<Repository | null>(null);
  const target = selected?.owner && selected.name ? { owner: selected.owner, repo: selected.name } : null;
  const [branches] = useAction<{ branches: Branch[] }>(connectionId, "github.branches.list", target);
  const [commits] = useAction<{ commits: Commit[] }>(
    connectionId,
    "github.commits.list",
    target ? { ...target, perPage: 10, ...(selected?.defaultBranch ? { ref: selected.defaultBranch } : {}) } : null,
  );
  const [pulls] = useAction<{ pullRequests: PullRequest[] }>(connectionId, "github.pull-requests.list", target ? { ...target, perPage: 10 } : null);

  const open = (url: string | null) => {
    if (url) void bridge?.openProviderLink(provider.id, url);
  };

  return (
    <section className="section context" aria-label="Repository context">
      <h3>Repository context</h3>
      <p className="muted small">Read-only. Fetched live through the BrixoAI backend.</p>
      {repos.status === "loading" ? <Loading label="Loading repositories" /> : null}
      {repos.status === "error" ? <ErrorNotice error={repos.error} onRetry={reloadRepos} /> : null}
      {repos.status === "ready" && repos.data ? (
        repos.data.repositories.length === 0 ? (
          <p className="muted">No repositories are shared with the BrixoAI app. Add some in your GitHub installation settings.</p>
        ) : (
          <label className="field">
            <span className="field-label">Repository ({repos.data.totalCount})</span>
            <select
              value={selected?.fullName ?? ""}
              onChange={(event) => setSelected(repos.data?.repositories.find((repo) => repo.fullName === event.target.value) ?? null)}
            >
              <option value="">Choose a repository</option>
              {repos.data.repositories.map((repo) => (
                <option key={repo.id ?? repo.fullName} value={repo.fullName ?? ""}>
                  {repo.fullName}
                  {repo.private ? " (private)" : ""}
                </option>
              ))}
            </select>
          </label>
        )
      ) : null}

      {selected ? (
        <div className="context-grid">
          <div>
            <h4>Branches</h4>
            {branches.status === "loading" ? <Loading label="Loading" /> : null}
            {branches.status === "error" ? <ErrorNotice error={branches.error} /> : null}
            {branches.status === "ready" && branches.data ? (
              <ul className="plain-list compact">
                {branches.data.branches.map((branch) => (
                  <li key={branch.name}>
                    <code>{branch.name}</code>
                    {branch.name === selected.defaultBranch ? <span className="muted small"> default</span> : null}
                    {branch.protected ? <span className="muted small"> protected</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <h4>Recent commits{selected.defaultBranch ? ` on ${selected.defaultBranch}` : ""}</h4>
            {commits.status === "loading" ? <Loading label="Loading" /> : null}
            {commits.status === "error" ? <ErrorNotice error={commits.error} /> : null}
            {commits.status === "ready" && commits.data ? (
              <ul className="plain-list compact">
                {commits.data.commits.map((commit) => (
                  <li key={commit.sha}>
                    <code>{commit.sha?.slice(0, 7)}</code> {commit.message}
                    <span className="muted small">
                      {" "}
                      {commit.authorName}
                      {commit.authoredAt ? `, ${new Date(commit.authoredAt).toLocaleDateString()}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <h4>Open pull requests</h4>
            {pulls.status === "loading" ? <Loading label="Loading" /> : null}
            {pulls.status === "error" ? <ErrorNotice error={pulls.error} /> : null}
            {pulls.status === "ready" && pulls.data ? (
              pulls.data.pullRequests.length === 0 ? (
                <p className="muted">None open.</p>
              ) : (
                <ul className="plain-list compact">
                  {pulls.data.pullRequests.map((pull) => (
                    <li key={pull.number}>
                      <button type="button" className="link-button" onClick={() => open(pull.htmlUrl)}>
                        #{pull.number} {pull.title}
                      </button>
                      <span className="muted small">
                        {" "}
                        from <code>{pull.headRef}</code>
                        {pull.draft ? " (draft)" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
