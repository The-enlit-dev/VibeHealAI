import { type Validator, ValidationError, integer, object, oneOf, optional, string } from "../../../shared/validation.js";
import { type Capability, type ConnectionHandle, defineCapability } from "../../integrations/adapter.js";
import { truncate } from "../../security/redaction.js";
import type { GitHubClient } from "./client.js";
import { GITHUB_CAPABILITIES } from "./metadata.js";

// Read-only GitHub capabilities (IM2). Each one validates its input, calls a single
// GET endpoint with the installation token and returns only whitelisted fields (IN-7).
// Text from GitHub, such as commit messages and PR titles, is untrusted data.

interface Dependencies {
  readonly client: GitHubClient;
  readonly authorization: (handle: ConnectionHandle) => Promise<string>;
}

const owner = string({ min: 1, max: 39, pattern: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/ });
const repoName: Validator<string> = (value, path) => {
  const name = string({ min: 1, max: 100, pattern: /^[A-Za-z0-9._-]+$/ })(value, path);
  if (name === "." || name === "..") throw new ValidationError(path, "has an invalid format");
  return name;
};
const ref: Validator<string> = (value, path) => {
  const name = string({ min: 1, max: 200, pattern: /^[A-Za-z0-9._/-]+$/ })(value, path);
  if (name.includes("..") || name.startsWith("/") || name.endsWith("/")) throw new ValidationError(path, "has an invalid format");
  return name;
};
const page = optional(integer({ min: 1, max: 100 }));
const perPage = optional(integer({ min: 1, max: 50 }));

const repoInput = object({ owner, repo: repoName });
const pagedRepoInput = object({ owner, repo: repoName, page, perPage });
const listInput = object({ page, perPage });
const commitsInput = object({ owner, repo: repoName, ref: optional(ref), perPage });
const pullsInput = object({ owner, repo: repoName, state: optional(oneOf(["open", "closed", "all"] as const)), perPage });

const repoPath = (input: { owner: string; repo: string }): string =>
  `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`;

const text = (value: unknown, max = 300): string | null => (typeof value === "string" ? truncate(value, max) : null);
const webUrl = (value: unknown): string | null =>
  typeof value === "string" && value.startsWith("https://github.com/") ? value : null;
const firstLine = (value: unknown): string | null => (typeof value === "string" ? truncate(value.split("\n")[0] ?? "", 200) : null);

interface RawRepository {
  id?: unknown;
  name?: unknown;
  full_name?: unknown;
  owner?: { login?: unknown } | null;
  private?: unknown;
  archived?: unknown;
  default_branch?: unknown;
  description?: unknown;
  language?: unknown;
  html_url?: unknown;
  pushed_at?: unknown;
}

export interface RepositorySummary {
  readonly id: number | null;
  readonly fullName: string | null;
  readonly owner: string | null;
  readonly name: string | null;
  readonly private: boolean;
  readonly archived: boolean;
  readonly defaultBranch: string | null;
  readonly description: string | null;
  readonly language: string | null;
  readonly htmlUrl: string | null;
  readonly pushedAt: string | null;
}

export function mapRepository(raw: RawRepository): RepositorySummary {
  return {
    id: typeof raw.id === "number" ? raw.id : null,
    fullName: text(raw.full_name, 200),
    owner: text(raw.owner?.login, 39),
    name: text(raw.name, 100),
    private: raw.private === true,
    archived: raw.archived === true,
    defaultBranch: text(raw.default_branch, 200),
    description: text(raw.description),
    language: text(raw.language, 50),
    htmlUrl: webUrl(raw.html_url),
    pushedAt: text(raw.pushed_at, 40),
  };
}

export function createGitHubCapabilities({ client, authorization }: Dependencies): Capability[] {
  return [
    defineCapability({
      descriptor: GITHUB_CAPABILITIES.listRepositories,
      validateInput: listInput,
      async execute(handle, input) {
        const response = await client.request<{ total_count?: unknown; repositories?: RawRepository[] }>({
          path: "/installation/repositories",
          query: { per_page: input.perPage ?? 30, page: input.page ?? 1 },
          authorization: await authorization(handle),
        });
        return {
          totalCount: typeof response?.total_count === "number" ? response.total_count : 0,
          repositories: (response?.repositories ?? []).map(mapRepository),
        };
      },
    }),
    defineCapability({
      descriptor: GITHUB_CAPABILITIES.getRepository,
      validateInput: repoInput,
      async execute(handle, input) {
        const raw = await client.request<RawRepository>({ path: repoPath(input), authorization: await authorization(handle) });
        return mapRepository(raw ?? {});
      },
    }),
    defineCapability({
      descriptor: GITHUB_CAPABILITIES.listBranches,
      validateInput: pagedRepoInput,
      async execute(handle, input) {
        const raw = await client.request<{ name?: unknown; protected?: unknown; commit?: { sha?: unknown } }[]>({
          path: `${repoPath(input)}/branches`,
          query: { per_page: input.perPage ?? 30, page: input.page ?? 1 },
          authorization: await authorization(handle),
        });
        return {
          branches: (raw ?? []).map((branch) => ({
            name: text(branch.name, 200),
            protected: branch.protected === true,
            commitSha: text(branch.commit?.sha, 40),
          })),
        };
      },
    }),
    defineCapability({
      descriptor: GITHUB_CAPABILITIES.listCommits,
      validateInput: commitsInput,
      async execute(handle, input) {
        const raw = await client.request<
          { sha?: unknown; html_url?: unknown; commit?: { message?: unknown; author?: { name?: unknown; date?: unknown } } }[]
        >({
          path: `${repoPath(input)}/commits`,
          query: { per_page: input.perPage ?? 20, sha: input.ref },
          authorization: await authorization(handle),
        });
        // Author email addresses are deliberately not returned (data minimisation).
        return {
          commits: (raw ?? []).map((commit) => ({
            sha: text(commit.sha, 40),
            message: firstLine(commit.commit?.message),
            authorName: text(commit.commit?.author?.name, 100),
            authoredAt: text(commit.commit?.author?.date, 40),
            htmlUrl: webUrl(commit.html_url),
          })),
        };
      },
    }),
    defineCapability({
      descriptor: GITHUB_CAPABILITIES.listPullRequests,
      validateInput: pullsInput,
      async execute(handle, input) {
        const raw = await client.request<
          {
            number?: unknown;
            title?: unknown;
            state?: unknown;
            draft?: unknown;
            user?: { login?: unknown } | null;
            head?: { ref?: unknown };
            base?: { ref?: unknown };
            updated_at?: unknown;
            html_url?: unknown;
          }[]
        >({
          path: `${repoPath(input)}/pulls`,
          query: { state: input.state ?? "open", per_page: input.perPage ?? 20 },
          authorization: await authorization(handle),
        });
        return {
          pullRequests: (raw ?? []).map((pull) => ({
            number: typeof pull.number === "number" ? pull.number : null,
            title: text(pull.title, 200),
            state: text(pull.state, 10),
            draft: pull.draft === true,
            author: text(pull.user?.login, 39),
            headRef: text(pull.head?.ref, 200),
            baseRef: text(pull.base?.ref, 200),
            updatedAt: text(pull.updated_at, 40),
            htmlUrl: webUrl(pull.html_url),
          })),
        };
      },
    }),
  ];
}
