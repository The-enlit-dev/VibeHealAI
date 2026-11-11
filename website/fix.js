// "Understand your error" page. Runs entirely in the browser: the pasted text is never sent anywhere.
// The logic lives in /fix-core/ (generated from shared/explainer/, the code the unit tests exercise).
// This file only reads the form, calls analyze() and draws the result with textContent (no innerHTML).

import { analyze } from "/fix-core/index.js";

const EXAMPLES = {
  "missing-package": {
    command: "node server.js",
    errorText: "node:internal/modules/cjs/loader:1228\n  throw err;\n  ^\n\nError: Cannot find module 'express'\nRequire stack:\n- C:\\Users\\example\\my-app\\server.js\n  code: 'MODULE_NOT_FOUND'",
  },
  port: {
    command: "npm run dev",
    errorText: "Error: listen EADDRINUSE: address already in use :::3000\n    at Server.setupListenHandle [as _listen2] (node:net:1817:16)\n  code: 'EADDRINUSE', errno: -4091, syscall: 'listen', port: 3000",
  },
  env: {
    command: "npm run build",
    errorText: "Error: Missing environment variable: STRIPE_SECRET_KEY\n    at getStripe (src/lib/stripe.ts:4:11)\n> Build error occurred",
  },
  types: {
    command: "npm run build",
    errorText: "Failed to compile.\n\n./src/app/page.tsx:12:5\nType error: Property 'name' does not exist on type 'User'.\n\n  10 |   const user = await getUser();\n> 12 |   return <h1>{user.name}</h1>;",
  },
};

const $ = (id) => document.getElementById(id);
const form = $("fix-form");
if (form) {
  const fields = {
    errorText: $("fix-error"),
    command: $("fix-command"),
    packageJson: $("fix-package"),
  };
  const messages = {
    errorText: $("fix-error-message"),
    command: $("fix-command-message"),
    packageJson: $("fix-package-message"),
  };
  const results = $("fix-results");
  const cards = $("fix-cards");
  const copyStatus = $("fix-copy-status");

  const CONFIDENCE = { high: "Strong match", medium: "Possible match" };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const clearErrors = () => {
    for (const key of Object.keys(messages)) {
      messages[key].hidden = true;
      messages[key].textContent = "";
      fields[key].removeAttribute("aria-invalid");
    }
  };

  const showError = (field, message) => {
    messages[field].textContent = message;
    messages[field].hidden = false;
    fields[field].setAttribute("aria-invalid", "true");
    if (field === "packageJson") fields.packageJson.closest("details").open = true;
    fields[field].focus();
  };

  const list = (tag, items, className) => {
    const node = el(tag, className);
    for (const item of items) node.appendChild(el("li", "", item));
    return node;
  };

  const drawCard = (explanation) => {
    const card = el("section", "studio-card fix-card");
    const head = el("div", "fix-card-head");
    head.appendChild(el("h2", "", explanation.title));
    head.appendChild(el("span", "badge badge-available", CONFIDENCE[explanation.confidence] ?? "Match"));
    card.appendChild(head);
    card.appendChild(el("p", "fix-summary", explanation.summary));
    card.appendChild(el("h3", "", "Why this usually happens"));
    card.appendChild(el("p", "", explanation.why));
    card.appendChild(el("h3", "", "Safe things to check, in order"));
    card.appendChild(list("ol", explanation.checks));
    if (explanation.likelyFiles.length) {
      card.appendChild(el("h3", "", "Files mentioned in the error"));
      card.appendChild(list("ul", explanation.likelyFiles, "fix-files"));
    }
    if (explanation.evidence.length) {
      card.appendChild(el("h3", "", "What it matched on"));
      card.appendChild(el("pre", "fix-evidence", explanation.evidence.join("\n")));
    }
    return card;
  };

  const draw = (result) => {
    cards.replaceChildren();
    const count = result.explanations.length;
    $("fix-summary").textContent =
      count === 0
        ? "No built-in rule matches this error. That doesn't mean it can't be fixed: the brief below still lets your AI tool take a careful look."
        : `${count} possible ${count === 1 ? "explanation" : "explanations"} found, strongest first. These are pattern matches, so check them against your situation.`;

    const redaction = $("fix-redaction");
    if (result.redaction.count > 0) {
      redaction.textContent = `VibeHeal hid ${result.redaction.count} value${result.redaction.count === 1 ? "" : "s"} that looked sensitive (${result.redaction.kinds.join(", ")}). Check the text below before you share it.`;
      redaction.hidden = false;
    } else {
      redaction.textContent = "Nothing that looks like a secret was found. Still read the text below before you share it: automatic checks can miss things.";
      redaction.hidden = false;
    }
    if (result.shortened) {
      redaction.textContent += " Your output was long, so only its beginning and end were read.";
    }

    for (const explanation of result.explanations) cards.appendChild(drawCard(explanation));
    $("fix-brief").value = result.brief;
    $("fix-redacted-error").textContent = result.redactedError;
    copyStatus.textContent = "";
    results.hidden = false;
    results.focus();
    results.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();
    let outcome;
    try {
      outcome = analyze({
        errorText: fields.errorText.value,
        command: fields.command.value,
        packageJson: fields.packageJson.value,
      });
    } catch {
      // The rules never throw on text input, but if one ever does, say so instead of failing silently.
      showError("errorText", "Something went wrong while reading that text. Try pasting a shorter part of the error.");
      return;
    }
    if (!outcome.ok) {
      showError(outcome.field, outcome.message);
      return;
    }
    draw(outcome.result);
  });

  form.addEventListener("reset", () => {
    clearErrors();
    results.hidden = true;
    cards.replaceChildren();
    $("fix-brief").value = "";
    $("fix-redacted-error").textContent = "";
    copyStatus.textContent = "";
  });

  for (const button of form.querySelectorAll("[data-fix-example]")) {
    button.addEventListener("click", () => {
      const example = EXAMPLES[button.getAttribute("data-fix-example")];
      if (!example) return;
      clearErrors();
      fields.errorText.value = example.errorText;
      fields.command.value = example.command;
      fields.packageJson.value = "";
      fields.errorText.focus();
    });
  }

  $("fix-copy").addEventListener("click", async () => {
    const text = $("fix-brief").value;
    try {
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = "Copied. Paste it into your AI tool.";
    } catch {
      // Clipboard access can be blocked; fall back to selecting the text so Ctrl+C works.
      $("fix-brief").focus();
      $("fix-brief").select();
      copyStatus.textContent = "Couldn't copy automatically. The text is selected: press Ctrl+C (Cmd+C on Mac).";
    }
  });

  // Shown only once the script has loaded, so a visitor without JavaScript doesn't see a dead form.
  form.hidden = false;
}
