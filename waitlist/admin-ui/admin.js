/* global document, window */
// Admin dashboard. All data comes from session-protected /api/admin/* endpoints.
// Text is always set with textContent; no HTML strings are inserted.

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var state = { page: 1, pageSize: 25, toolLabels: {}, capabilityLabels: {}, optionsLoaded: false };

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, text, className) {
    var node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function formatDate(iso) {
    if (!iso) return "none yet";
    var date = new Date(iso);
    return isNaN(date.getTime()) ? iso : date.toLocaleString();
  }

  function showNotice(message) {
    var notice = $("notice");
    notice.textContent = message || "";
    notice.hidden = !message;
  }

  function api(path, options) {
    var init = options || {};
    init.credentials = "same-origin";
    init.cache = "no-store";
    init.headers = Object.assign({ Accept: "application/json" }, init.headers || {});
    return fetch(path, init).then(function (response) {
      return response
        .json()
        .catch(function () {
          return null;
        })
        .then(function (body) {
          return { status: response.status, body: body };
        });
    });
  }

  function showLogin(message) {
    $("dashboard-view").hidden = true;
    $("account").hidden = true;
    $("login-view").hidden = false;
    $("login-status").textContent = message || "";
    $("password").value = "";
    $("username").focus();
  }

  function showDashboard(username) {
    $("login-view").hidden = true;
    $("dashboard-view").hidden = false;
    $("account").hidden = false;
    $("account-name").textContent = username;
  }

  /** Any 401 while signed in returns to the login screen. */
  function guard(result) {
    if (result.status === 401) {
      showLogin("Your session has ended. Please sign in again.");
      return false;
    }
    if (result.status === 403) {
      showNotice("The request was refused.");
      return false;
    }
    if (result.status !== 200 || !result.body) {
      showNotice((result.body && result.body.error) || "Could not load data. Please try again.");
      return false;
    }
    return true;
  }

  // ---------- overview ----------

  function renderChart(days) {
    var container = $("trend-chart");
    clear(container);
    // Match the viewBox to the real width so labels keep their size on wide screens.
    var width = Math.max(300, Math.round(container.clientWidth || 600));
    var height = 170;
    var top = 10;
    var bottom = 24;
    var plotHeight = height - top - bottom;
    var max = days.reduce(function (m, d) {
      return Math.max(m, d.count);
    }, 0);
    var total = days.reduce(function (s, d) {
      return s + d.count;
    }, 0);
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Signups per day for the last 30 days. " + total + " in total.");
    var slot = width / days.length;
    days.forEach(function (day, index) {
      var barHeight = max === 0 ? 0 : Math.max(day.count > 0 ? 2 : 0, (day.count / max) * plotHeight);
      var rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("class", "bar-rect");
      rect.setAttribute("x", String(index * slot + 2));
      rect.setAttribute("y", String(top + plotHeight - barHeight));
      rect.setAttribute("width", String(Math.max(1, slot - 4)));
      rect.setAttribute("height", String(barHeight));
      var title = document.createElementNS(SVG_NS, "title");
      title.textContent = day.date + ": " + day.count;
      rect.appendChild(title);
      svg.appendChild(rect);
    });
    var line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", "baseline");
    line.setAttribute("x1", "0");
    line.setAttribute("x2", String(width));
    line.setAttribute("y1", String(top + plotHeight));
    line.setAttribute("y2", String(top + plotHeight));
    svg.appendChild(line);
    [
      [days[0].date, 0, "start"],
      [days[days.length - 1].date, width, "end"]
    ].forEach(function (label) {
      var text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("class", "axis");
      text.setAttribute("x", String(label[1]));
      text.setAttribute("y", String(height - 6));
      text.setAttribute("text-anchor", label[2]);
      text.textContent = label[0];
      svg.appendChild(text);
    });
    var maxLabel = document.createElementNS(SVG_NS, "text");
    maxLabel.setAttribute("class", "axis");
    maxLabel.setAttribute("x", "0");
    maxLabel.setAttribute("y", "10");
    maxLabel.textContent = "max " + max + " per day";
    svg.appendChild(maxLabel);
    container.appendChild(svg);

    var table = $("trend-table");
    clear(table);
    days.forEach(function (day) {
      var row = el("tr");
      row.appendChild(el("td", day.date));
      row.appendChild(el("td", day.count));
      table.appendChild(row);
    });
  }

  function renderBreakdown(listId, rows, total) {
    var list = $(listId);
    clear(list);
    if (total === 0) {
      list.appendChild(el("li", "No answers yet."));
      return;
    }
    rows.forEach(function (row) {
      var item = el("li");
      item.appendChild(el("span", row.label));
      item.appendChild(el("span", row.count, "count"));
      var bar = el("progress");
      bar.max = Math.max(1, total);
      bar.value = row.count;
      bar.setAttribute("aria-label", row.label + ": " + row.count);
      item.appendChild(bar);
      list.appendChild(item);
    });
  }

  function fillSelect(select, rows) {
    rows.forEach(function (row) {
      var option = el("option", row.label);
      option.value = row.id;
      select.appendChild(option);
    });
  }

  function loadOverview() {
    return api("/api/admin/overview").then(function (result) {
      if (!guard(result)) return false;
      var data = result.body;
      $("generated-at").textContent = formatDate(data.generatedAt);
      $("generated-at").setAttribute("datetime", data.generatedAt);
      $("latest-signup").textContent = formatDate(data.latestSignupAt);
      $("stat-total").textContent = data.total;
      $("stat-7").textContent = data.last7Days;
      $("stat-30").textContent = data.last30Days;
      $("stat-frustration").textContent = data.frustrationTexts;
      renderChart(data.dailyLast30);
      renderBreakdown("tools-list", data.aiTools, data.total);
      renderBreakdown("features-list", data.capabilities, data.total);
      renderBreakdown("themes-list", data.frustrationThemes, data.frustrationTexts);

      data.aiTools.forEach(function (row) {
        state.toolLabels[row.id] = row.label;
      });
      data.capabilities.forEach(function (row) {
        state.capabilityLabels[row.id] = row.label;
      });
      if (!state.optionsLoaded) {
        fillSelect(
          $("f-tool"),
          data.aiTools.filter(function (row) {
            return row.id !== "not-answered";
          }).concat([{ id: "not-answered", label: "Not answered" }])
        );
        fillSelect($("f-capability"), data.capabilities);
        state.optionsLoaded = true;
      }
      return true;
    });
  }

  // ---------- signups ----------

  function filterParams() {
    var params = new URLSearchParams();
    ["q", "aiTool", "capability", "from", "to", "sort"].forEach(function (name) {
      var field = $("filter-form").elements.namedItem(name);
      var value = field && field.value ? field.value.trim() : "";
      if (value && !(name === "sort" && value === "newest")) params.set(name, value);
    });
    return params;
  }

  function showDetail(id) {
    api("/api/admin/signups/" + encodeURIComponent(id)).then(function (result) {
      if (!guard(result)) return;
      var entry = result.body.entry;
      var list = $("detail-list");
      clear(list);
      [
        ["Signed up", formatDate(entry.createdAt)],
        ["Email", entry.email],
        ["Name", entry.name || "Not given"],
        ["AI tool", entry.aiTool ? state.toolLabels[entry.aiTool] || entry.aiTool : "Not answered"],
        [
          "Planned features",
          entry.capabilities.length
            ? entry.capabilities
                .map(function (c) {
                  return state.capabilityLabels[c] || c;
                })
                .join("; ")
            : "None chosen"
        ],
        ["Frustration", entry.frustration || "Not answered"],
        ["Source", entry.source],
        ["Signup id", entry.id]
      ].forEach(function (pair) {
        list.appendChild(el("dt", pair[0]));
        list.appendChild(el("dd", pair[1]));
      });
      $("detail-dialog").showModal();
    });
  }

  function loadSignups() {
    var params = filterParams();
    $("export-link").setAttribute("href", "/api/admin/export.csv" + (params.toString() ? "?" + params.toString() : ""));
    params.set("page", String(state.page));
    params.set("pageSize", String(state.pageSize));
    return api("/api/admin/signups?" + params.toString()).then(function (result) {
      if (result.status === 400 && result.body && result.body.fields) {
        var messages = Object.keys(result.body.fields).map(function (key) {
          return key + ": " + result.body.fields[key];
        });
        showNotice("Check the filters. " + messages.join(" "));
        return;
      }
      if (!guard(result)) return;
      var data = result.body;
      var body = $("signups-body");
      clear(body);
      var empty = $("empty-state");
      var filtered = filterParams().toString() !== "";
      if (data.total === 0) {
        empty.textContent = filtered ? "No signups match these filters." : "No signups yet. They will appear here as people join.";
        empty.hidden = false;
      } else {
        empty.hidden = true;
      }
      data.items.forEach(function (entry) {
        var row = el("tr");
        row.appendChild(el("td", formatDate(entry.createdAt)));
        row.appendChild(el("td", entry.email));
        row.appendChild(el("td", entry.name || ""));
        row.appendChild(el("td", entry.aiTool ? state.toolLabels[entry.aiTool] || entry.aiTool : ""));
        row.appendChild(el("td", entry.capabilities.length));
        var frustration = entry.frustration || "";
        row.appendChild(el("td", frustration.length > 80 ? frustration.slice(0, 80) + "..." : frustration, "truncate"));
        var actions = el("td");
        var button = el("button", "View", "button button-quiet");
        button.type = "button";
        button.setAttribute("aria-label", "View signup from " + formatDate(entry.createdAt));
        button.addEventListener("click", function () {
          showDetail(entry.id);
        });
        actions.appendChild(button);
        row.appendChild(actions);
        body.appendChild(row);
      });
      var first = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
      var last = Math.min(data.total, data.page * data.pageSize);
      $("results-meta").textContent = "Showing " + first + "-" + last + " of " + data.total + ".";
      var pages = Math.max(1, Math.ceil(data.total / data.pageSize));
      $("page-label").textContent = "Page " + data.page + " of " + pages;
      $("prev-page").disabled = data.page <= 1;
      $("next-page").disabled = data.page >= pages;
    });
  }

  function loadAll() {
    showNotice("");
    return loadOverview().then(function (ok) {
      if (ok) return loadSignups();
      return undefined;
    });
  }

  // ---------- events ----------

  $("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var username = $("username").value.trim();
    var password = $("password").value;
    if (!username || !password) {
      $("login-status").textContent = "Enter your username and password.";
      return;
    }
    $("login-button").disabled = true;
    $("login-status").textContent = "";
    api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function (result) {
        $("login-button").disabled = false;
        $("password").value = "";
        if (result.status === 200 && result.body && result.body.authenticated) {
          showDashboard(result.body.username);
          state.page = 1;
          return loadAll();
        }
        if (result.status === 429) {
          $("login-status").textContent = "Too many sign-in attempts. Please wait and try again.";
        } else if (result.status === 401) {
          $("login-status").textContent = "Incorrect username or password.";
        } else {
          $("login-status").textContent = (result.body && result.body.error) || "Sign-in failed. Please try again.";
        }
        return undefined;
      })
      .catch(function () {
        $("login-button").disabled = false;
        $("login-status").textContent = "Could not reach the server. Please try again.";
      });
  });

  $("logout-button").addEventListener("click", function () {
    api("/api/admin/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(function () {
      showLogin("You have signed out.");
    });
  });

  $("refresh-button").addEventListener("click", function () {
    loadAll();
  });

  $("filter-form").addEventListener("submit", function (event) {
    event.preventDefault();
    state.page = 1;
    showNotice("");
    loadSignups();
  });

  $("reset-button").addEventListener("click", function () {
    $("filter-form").reset();
    state.page = 1;
    showNotice("");
    loadSignups();
  });

  $("prev-page").addEventListener("click", function () {
    if (state.page > 1) {
      state.page -= 1;
      loadSignups();
    }
  });

  $("next-page").addEventListener("click", function () {
    state.page += 1;
    loadSignups();
  });

  api("/api/admin/session")
    .then(function (result) {
      if (result.status === 200 && result.body && result.body.authenticated) {
        showDashboard(result.body.username);
        return loadAll();
      }
      showLogin("");
      return undefined;
    })
    .catch(function () {
      showLogin("");
      showNotice("Could not reach the server.");
    });

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) window.location.reload();
  });
})();
