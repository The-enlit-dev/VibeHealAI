import type { CapabilityDescriptor, PermissionDescriptor, ProviderMetadata } from "../../../shared/providers.js";

// GitHub App permission names below match GitHub's documented App permissions as
// understood on 2026-10-31. docs.github.com could not be reached from the build
// environment that day, so they are marked verified: false until checked (U14).

export const GITHUB_PERMISSIONS = {
  metadata: {
    id: "github.metadata.read",
    title: "Repository metadata (read)",
    description: "See repository names, descriptions, visibility and default branch. GitHub requires this for every app.",
    access: "read",
    providerScope: "Metadata: Read-only",
    verified: false,
  },
  contents: {
    id: "github.contents.read",
    title: "Repository contents (read)",
    description: "See branches and commit history. BrixoAI does not change any files.",
    access: "read",
    providerScope: "Contents: Read-only",
    verified: false,
  },
  pullRequests: {
    id: "github.pull-requests.read",
    title: "Pull requests (read)",
    description: "See pull request titles, status and branches. BrixoAI cannot comment, merge or close them.",
    access: "read",
    providerScope: "Pull requests: Read-only",
    verified: false,
  },
} as const satisfies Record<string, PermissionDescriptor>;

/** GitHub App permission key → BrixoAI permission id. Only read access is accepted. */
export const GITHUB_APP_PERMISSION_MAP: Readonly<Record<string, string>> = {
  metadata: GITHUB_PERMISSIONS.metadata.id,
  contents: GITHUB_PERMISSIONS.contents.id,
  pull_requests: GITHUB_PERMISSIONS.pullRequests.id,
};

const capability = (
  id: string,
  title: string,
  description: string,
  requiredPermissions: string[],
): CapabilityDescriptor => ({ id, title, description, access: "read", requiredPermissions });

export const GITHUB_CAPABILITIES = {
  listRepositories: capability(
    "github.repositories.list",
    "List repositories",
    "List the repositories you chose to share with the BrixoAI GitHub App.",
    [GITHUB_PERMISSIONS.metadata.id],
  ),
  getRepository: capability("github.repository.get", "Repository details", "Read one repository's metadata.", [
    GITHUB_PERMISSIONS.metadata.id,
  ]),
  listBranches: capability("github.branches.list", "List branches", "List a repository's branches.", [
    GITHUB_PERMISSIONS.contents.id,
  ]),
  listCommits: capability("github.commits.list", "Recent commits", "List recent commits on a branch.", [
    GITHUB_PERMISSIONS.contents.id,
  ]),
  listPullRequests: capability("github.pull-requests.list", "Pull requests", "List pull requests and their status.", [
    GITHUB_PERMISSIONS.pullRequests.id,
  ]),
} as const;

export const GITHUB_METADATA: ProviderMetadata = {
  id: "github",
  name: "GitHub",
  category: "source_control",
  summary: "Read repositories, branches, commits and pull requests.",
  description:
    "Connect the BrixoAI GitHub App to the repositories you choose. BrixoAI reads repository details, branches, recent commits and pull requests. It cannot change code, push, merge or delete anything.",
  contextUse:
    "Shows which branch and recent commits a broken project is on, and adds that context to the handoff brief for your AI tool.",
  websiteUrl: "https://github.com",
  docsUrl: "https://docs.github.com/en/apps",
  implementation: "implemented",
  roadmapMilestone: "IM2",
  authorizationHosts: ["github.com"],
  permissions: Object.values(GITHUB_PERMISSIONS),
  capabilities: Object.values(GITHUB_CAPABILITIES),
  notes: [
    "Uses a GitHub App with read-only permissions. You choose which repositories it can see during installation.",
    "Needs a GitHub App registered by the owner of this backend. See docs/integrations/GITHUB_APP_SETUP.md.",
    "Disconnecting removes BrixoAI's record and revokes its current access token. To remove the app completely, uninstall it in your GitHub settings.",
    "Not yet tested against the live GitHub API: no GitHub App credentials were available when this was built.",
  ],
};
