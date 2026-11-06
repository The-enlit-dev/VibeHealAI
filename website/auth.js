/* global document, window */
// Sign-in for the public website, using Clerk (DEC-31, DEC-32).
// Clerk's own scripts load first (deferred, from the Clerk Frontend API host in brand.json).
// If they fail to load, the header shows no account controls and signed-in pages say so.
// All elements are created with createElement and textContent.
//
// Pages opt in with data-auth-page="account" | "members" | "studio" on a container holding:
//   [data-auth-state]   status line          [data-auth-mount]   where Clerk's sign-in/profile mounts
//   [data-auth-content] revealed when allowed [data-requires-role] role needed (from Clerk publicMetadata.role)
// Everything on these pages is in the public HTML: hiding it is a convenience, not a security boundary.

(function () {
  "use strict";

  var clerk = window.Clerk;
  var header = document.getElementById("auth-controls");
  var pageRoot = document.querySelector("[data-auth-page]");

  function find(selector) {
    return pageRoot ? pageRoot.querySelector(selector) : null;
  }

  function setPageStatus(text) {
    var status = find("[data-auth-state]");
    if (!status) return;
    status.textContent = text;
    status.hidden = !text;
  }

  if (!clerk || typeof clerk.load !== "function") {
    setPageStatus("Sign-in is not available right now. Please try again later.");
    return;
  }

  // ---------- helpers ----------

  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function el(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function button(label, className, onClick) {
    var element = el("button", className, label);
    element.type = "button";
    element.addEventListener("click", onClick);
    return element;
  }

  function link(label, href, className) {
    var element = el("a", className, label);
    element.href = href;
    return element;
  }

  function role() {
    var meta = clerk.user && clerk.user.publicMetadata;
    return meta && typeof meta.role === "string" ? meta.role : "";
  }

  function formatDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  // ---------- header ----------

  var headerState = null;
  var headerUserButton = null;

  function renderHeader() {
    if (!header) return;
    var state = clerk.isSignedIn ? "in:" + role() : "out";
    if (state === headerState) return;
    headerState = state;

    if (headerUserButton) {
      clerk.unmountUserButton(headerUserButton);
      headerUserButton = null;
    }
    clear(header);

    if (clerk.isSignedIn) {
      header.appendChild(link("Members", "/members/", "auth-link"));
      if (role() === "admin") header.appendChild(link("Studio", "/studio/", "auth-link"));
      headerUserButton = el("div", "auth-user");
      header.appendChild(headerUserButton);
      clerk.mountUserButton(headerUserButton, { userProfileMode: "navigation", userProfileUrl: "/account/" });
    } else {
      header.appendChild(
        button("Sign in", "auth-button", function () {
          clerk.openSignIn({ forceRedirectUrl: window.location.href });
        })
      );
      header.appendChild(
        button("Sign up", "auth-button auth-button-primary", function () {
          clerk.openSignUp({ forceRedirectUrl: window.location.href });
        })
      );
    }
    header.hidden = false;
  }

  // ---------- signed-in pages ----------

  var mounted = null; // { kind: "signIn" | "profile", node }

  function unmount() {
    if (!mounted) return;
    if (mounted.kind === "signIn") clerk.unmountSignIn(mounted.node);
    if (mounted.kind === "profile") clerk.unmountUserProfile(mounted.node);
    clear(mounted.node);
    mounted = null;
  }

  function mount(kind) {
    var node = find("[data-auth-mount]");
    if (!node || (mounted && mounted.kind === kind)) return;
    unmount();
    if (kind === "signIn") clerk.mountSignIn(node, { forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href });
    if (kind === "profile") clerk.mountUserProfile(node);
    mounted = { kind: kind, node: node };
  }

  function renderWaitlistStatus() {
    var boxes = pageRoot ? pageRoot.querySelectorAll("[data-waitlist-status]") : [];
    Array.prototype.forEach.call(boxes, function (box) {
      clear(box);
      if (!clerk.user) {
        box.hidden = true;
        return;
      }
      var joined = clerk.user.unsafeMetadata && clerk.user.unsafeMetadata.waitlistJoinedAt;
      var text = el("p");
      if (joined) {
        text.textContent = "You joined the early-access waitlist on " + formatDate(joined) + ".";
      } else {
        text.textContent = "You haven't joined the early-access waitlist from this account. ";
        text.appendChild(link("Join the waitlist", "/#waitlist"));
      }
      box.appendChild(text);
      box.hidden = false;
    });
  }

  function renderPage() {
    if (!pageRoot) return;
    var kind = pageRoot.getAttribute("data-auth-page");
    var content = find("[data-auth-content]");
    var requiredRole = content ? content.getAttribute("data-requires-role") : null;

    if (!clerk.isSignedIn) {
      if (content) content.hidden = true;
      setPageStatus(kind === "account" ? "Sign in to manage your account." : "Sign in to continue.");
      mount("signIn");
      renderWaitlistStatus();
      return;
    }

    if (kind === "account") {
      setPageStatus("");
      mount("profile");
      renderWaitlistStatus();
      return;
    }

    unmount();
    if (requiredRole && role() !== requiredRole) {
      if (content) content.hidden = true;
      setPageStatus("Your account does not have access to this page.");
      return;
    }

    setPageStatus("");
    var greeting = find("[data-auth-greeting]");
    if (greeting) {
      var user = clerk.user;
      var name = (user && (user.firstName || (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress))) || "";
      greeting.textContent = name ? "Welcome, " + name + "." : "Welcome.";
    }
    renderWaitlistStatus();
    if (content) content.hidden = false;
  }

  // ---------- start ----------

  function renderAll() {
    renderHeader();
    renderPage();
  }

  // Other scripts (app.js) wait on this promise to read the signed-in user.
  window.vibehealAuth = clerk
    .load({ ui: { ClerkUI: window.__internal_ClerkUICtor }, telemetry: { disabled: true } })
    .then(function () {
      renderAll();
      clerk.addListener(renderAll);
      return clerk;
    });

  window.vibehealAuth.catch(function () {
    if (header) header.hidden = true;
    setPageStatus("Sign-in is not available right now. Please try again later.");
  });
})();
