// Demand-validation summaries and the private CSV export.
// The summary contains aggregate counts only (no email addresses).
// The CSV contains personal data, so the CLI writes it to a git-ignored folder only.

import { AI_TOOLS, PLANNED_CAPABILITIES, type WaitlistEntry } from "./validation.js";

export const FRUSTRATION_THEMES = [
  { id: "understand", label: "Don't understand AI-written code", pattern: /understand|confus|no idea what|makes no sense|don'?t get (it|what)/i },
  { id: "breaks", label: "Project breaks after AI changes", pattern: /break|broke|broken|stopped working|doesn'?t work|crash/i },
  { id: "diagnose", label: "Errors are hard to diagnose", pattern: /error|bug|stack ?trace|debug|diagnos|message/i },
  { id: "what-changed", label: "Not sure what changed", pattern: /what changed|which files|changed|diff/i },
  { id: "restore", label: "Restoring a working version is hard", pattern: /restor|revert|undo|roll ?back|previous version|go back|backup/i },
] as const;

export interface CountRow {
  id: string;
  label: string;
  count: number;
}

export interface WaitlistReport {
  totalSignups: number;
  signupsByDay: { date: string; count: number }[];
  aiTools: CountRow[];
  capabilities: CountRow[];
  frustrationThemes: CountRow[];
  frustrationTexts: number;
  otherFrustrations: number;
}

export function buildReport(entries: readonly WaitlistEntry[]): WaitlistReport {
  const byDay = new Map<string, number>();
  const toolCounts = new Map<string, number>();
  const capabilityCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  let frustrationTexts = 0;
  let otherFrustrations = 0;

  for (const entry of entries) {
    const day = entry.createdAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    const tool = entry.aiTool ?? "not-answered";
    toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);

    for (const capability of new Set(entry.capabilities)) {
      capabilityCounts.set(capability, (capabilityCounts.get(capability) ?? 0) + 1);
    }

    if (entry.frustration) {
      frustrationTexts += 1;
      const matched = FRUSTRATION_THEMES.filter((theme) => theme.pattern.test(entry.frustration ?? ""));
      for (const theme of matched) {
        themeCounts.set(theme.id, (themeCounts.get(theme.id) ?? 0) + 1);
      }
      if (matched.length === 0) otherFrustrations += 1;
    }
  }

  const sortDesc = (rows: CountRow[]) => rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const aiToolRows: CountRow[] = AI_TOOLS.map((tool) => ({ id: tool.id, label: tool.label, count: toolCounts.get(tool.id) ?? 0 }));
  const notAnswered = toolCounts.get("not-answered") ?? 0;
  if (notAnswered > 0) aiToolRows.push({ id: "not-answered", label: "Not answered", count: notAnswered });

  return {
    totalSignups: entries.length,
    signupsByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    aiTools: sortDesc(aiToolRows),
    capabilities: sortDesc(
      PLANNED_CAPABILITIES.map((capability) => ({
        id: capability.id,
        label: capability.label,
        count: capabilityCounts.get(capability.id) ?? 0,
      })),
    ),
    frustrationThemes: sortDesc(
      FRUSTRATION_THEMES.map((theme) => ({ id: theme.id, label: theme.label, count: themeCounts.get(theme.id) ?? 0 })),
    ),
    frustrationTexts,
    otherFrustrations,
  };
}

function table(rows: CountRow[]): string {
  const lines = ["| Option | Count |", "| --- | ---: |"];
  for (const row of rows) lines.push(`| ${row.label} | ${row.count} |`);
  return lines.join("\n");
}

/** Markdown summary. Contains no email addresses or free-text answers. */
export function renderMarkdown(report: WaitlistReport, generatedAt: Date): string {
  const lines: string[] = [
    "# BrixoAI early-access waitlist: demand summary",
    "",
    `Generated: ${generatedAt.toISOString()}`,
    "",
    "Counts only. Email addresses and free-text answers are in the private CSV export, not here.",
    "",
    `## Total valid signups: ${report.totalSignups}`,
    "",
  ];

  if (report.totalSignups === 0) {
    lines.push("No signups recorded yet. These numbers are not an estimate.", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push("## Signups by day", "", "| Date | Signups |", "| --- | ---: |");
  for (const day of report.signupsByDay) lines.push(`| ${day.date} | ${day.count} |`);
  lines.push("", "## Preferred AI coding tools", "", table(report.aiTools), "");
  lines.push("## Most requested capabilities (planned features, not available yet)", "", table(report.capabilities), "");
  lines.push(
    "## Most common frustrations",
    "",
    `Answers with text: ${report.frustrationTexts}. Answers that matched no theme: ${report.otherFrustrations}. ` +
      "One answer can match several themes.",
    "",
    table(report.frustrationThemes),
    "",
  );
  return `${lines.join("\n")}\n`;
}

/** Prefix cells that spreadsheet apps would evaluate as formulas (CSV injection). */
export function csvCell(value: string | null | undefined): string {
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function renderCsv(entries: readonly WaitlistEntry[]): string {
  const header = ["created_at", "email", "name", "ai_tool", "capabilities", "frustration"];
  const rows = entries.map((entry) =>
    [
      csvCell(entry.createdAt),
      csvCell(entry.email),
      csvCell(entry.name),
      csvCell(entry.aiTool),
      csvCell(entry.capabilities.join(";")),
      csvCell(entry.frustration),
    ].join(","),
  );
  return `${header.join(",")}\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}
