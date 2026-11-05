/* global document, window */
// Sign-in for the public website, using Clerk (DEC-31).
// Clerk's own scripts load first (deferred, from the Clerk Frontend API host in brand.json).
// If they fail to load, this script does nothing and the site works as before.
// All elements are created with createElement and textContent.

(function () {
  "use strict";

  var container = document.getElementById("auth-controls");
  var clerk = window.Clerk;
  if (!container || !clerk || typeof clerk.load !== "function") return;

  var userButtonSlot = null;
  var lastSignedIn = null;

  function button(label, className, onClick) {
    var element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = label;
    element.addEventListener("click", onClick);
    return element;
  }

  function render() {
    var signedIn = Boolean(clerk.isSignedIn);
    if (signedIn === lastSignedIn) return;
    lastSignedIn = signedIn;

    if (userButtonSlot) {
      clerk.unmountUserButton(userButtonSlot);
      userButtonSlot = null;
    }
    while (container.firstChild) container.removeChild(container.firstChild);

    if (signedIn) {
      userButtonSlot = document.createElement("div");
      userButtonSlot.className = "auth-user";
      container.appendChild(userButtonSlot);
      clerk.mountUserButton(userButtonSlot);
    } else {
      container.appendChild(
        button("Sign in", "auth-button", function () {
          clerk.openSignIn();
        })
      );
      container.appendChild(
        button("Sign up", "auth-button auth-button-primary", function () {
          clerk.openSignUp();
        })
      );
    }
    container.hidden = false;
  }

  clerk
    .load({ ui: { ClerkUI: window.__internal_ClerkUICtor }, telemetry: { disabled: true } })
    .then(function () {
      render();
      clerk.addListener(render);
    })
    .catch(function () {
      container.hidden = true;
    });
})();
