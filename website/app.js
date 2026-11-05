/* global document, window */
// Waitlist form behaviour for the public website.
// On the hosted site, signups go to Netlify Forms (form "waitlist", URL-encoded POST).
// On the local preview (npm run site:dev on localhost), they go to the waitlist
// service's JSON API, which validates everything again.
// All text is set with textContent.

(function () {
  "use strict";

  var form = document.getElementById("waitlist-form");
  if (!form) return;

  var endpoint = form.getAttribute("data-endpoint") || "/api/waitlist";
  var netlifyAction = form.getAttribute("action") || "/";
  var formName = form.getAttribute("name") || "waitlist";
  var LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
  var useLocalApi = LOCAL_HOSTS.indexOf(window.location.hostname) !== -1;
  var submitButton = document.getElementById("submit-button");
  var statusBox = document.getElementById("form-status");
  var frustration = document.getElementById("frustration");
  var frustrationCount = document.getElementById("frustration-count");

  var FIELD_IDS = ["email", "name", "aiTool", "frustration", "capabilities", "consent"];
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var MESSAGES = {
    success: "Thanks! You're on the early-access list. We'll only contact you about early access to this project.",
    network: "We couldn't reach the signup service. Check your connection and try again.",
    unavailable: "The waitlist is not reachable right now. Please try again later.",
    generic: "Something went wrong. Please try again in a moment.",
    rateLimited: "Too many attempts. Please try again in a few minutes."
  };

  function errorElement(name) {
    return document.getElementById(name + "-error");
  }

  function setFieldError(name, message) {
    var element = errorElement(name);
    var input = name === "capabilities" ? null : document.getElementById(name);
    if (element) {
      element.textContent = message || "";
      element.hidden = !message;
    }
    if (input) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function clearErrors() {
    FIELD_IDS.forEach(function (name) {
      setFieldError(name, "");
    });
  }

  function setStatus(kind, message) {
    statusBox.className = "form-status" + (kind ? " is-" + kind : "");
    statusBox.textContent = message;
    statusBox.focus();
  }

  function setBusy(isBusy) {
    submitButton.disabled = isBusy;
    form.setAttribute("aria-busy", isBusy ? "true" : "false");
    submitButton.textContent = isBusy ? "Sending..." : "Join the waitlist";
  }

  function checkedCapabilities() {
    var boxes = form.querySelectorAll('input[name="capabilities"]:checked');
    return Array.prototype.map.call(boxes, function (box) {
      return box.value;
    });
  }

  function validate(values) {
    var errors = {};
    if (!values.email) errors.email = "Please enter your email address.";
    else if (values.email.length > 254 || !EMAIL_PATTERN.test(values.email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (values.name.length > 80) errors.name = "Must be 80 characters or fewer.";
    if (values.frustration.length > 500) errors.frustration = "Must be 500 characters or fewer.";
    if (!values.consent) {
      errors.consent = "Please tick the box so we can contact you about early access.";
    }
    return errors;
  }

  // Read fields by id: form.name is a built-in property of forms, not the input.
  function readValues() {
    return {
      email: document.getElementById("email").value.trim().toLowerCase(),
      name: document.getElementById("name").value.trim(),
      aiTool: document.getElementById("aiTool").value,
      frustration: document.getElementById("frustration").value.trim(),
      capabilities: checkedCapabilities(),
      consent: document.getElementById("consent").checked,
      company: document.getElementById("company").value
    };
  }

  function applyServerFieldErrors(fields) {
    Object.keys(fields || {}).forEach(function (name) {
      if (FIELD_IDS.indexOf(name) !== -1) setFieldError(name, String(fields[name]));
    });
  }

  function focusFirstError() {
    for (var i = 0; i < FIELD_IDS.length; i += 1) {
      var element = errorElement(FIELD_IDS[i]);
      if (element && !element.hidden) {
        var input = document.getElementById(FIELD_IDS[i]) || form.querySelector('[name="capabilities"]');
        if (input) input.focus();
        return;
      }
    }
  }

  function parseJsonSafely(response) {
    return response.json().catch(function () {
      return null;
    });
  }

  // Netlify Forms takes one value per field, so the chosen features are joined with commas.
  function netlifyBody(values) {
    var params = new URLSearchParams();
    params.append("form-name", formName);
    params.append("email", values.email);
    params.append("name", values.name);
    params.append("aiTool", values.aiTool);
    params.append("frustration", values.frustration);
    params.append("capabilities", values.capabilities.join(", "));
    params.append("consent", values.consent ? "yes" : "");
    params.append("company", values.company);
    return params.toString();
  }

  function submit(values) {
    if (useLocalApi) {
      return fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(values)
      });
    }
    return fetch(netlifyAction, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "same-origin",
      cache: "no-store",
      body: netlifyBody(values)
    }).then(function (response) {
      // Netlify answers a successful submission with an HTML page, not JSON.
      return {
        status: response.ok ? 200 : response.status,
        json: function () {
          return Promise.resolve(response.ok ? { status: "ok" } : null);
        }
      };
    });
  }

  frustration.addEventListener("input", function () {
    frustrationCount.textContent = String(frustration.value.length);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearErrors();
    statusBox.className = "form-status";
    statusBox.textContent = "";

    var values = readValues();
    var errors = validate(values);
    var names = Object.keys(errors);
    if (names.length > 0) {
      names.forEach(function (name) {
        setFieldError(name, errors[name]);
      });
      setStatus("error", "Please fix the highlighted fields.");
      focusFirstError();
      return;
    }

    setBusy(true);
    submit(values)
      .then(function (response) {
        return parseJsonSafely(response).then(function (body) {
          return { status: response.status, body: body };
        });
      })
      .then(function (result) {
        setBusy(false);
        if (result.status === 200 && result.body && result.body.status === "ok") {
          form.reset();
          frustrationCount.textContent = "0";
          // Stop repeat submissions from this page; the server also ignores duplicate emails.
          submitButton.disabled = true;
          setStatus("success", MESSAGES.success);
          return;
        }
        if (result.status === 400 && result.body && result.body.fields) {
          applyServerFieldErrors(result.body.fields);
          setStatus("error", result.body.error || "Please fix the highlighted fields.");
          focusFirstError();
          return;
        }
        if (result.status === 429) {
          setStatus("error", MESSAGES.rateLimited);
          return;
        }
        if (result.status === 404 || result.status === 405 || result.status === 415) {
          setStatus("error", MESSAGES.unavailable);
          return;
        }
        setStatus("error", (result.body && result.body.error) || MESSAGES.generic);
      })
      .catch(function () {
        setBusy(false);
        setStatus("error", MESSAGES.network);
      });
  });
})();
