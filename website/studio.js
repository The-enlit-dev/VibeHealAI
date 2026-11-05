/* global document, window */
// Content studio: opens GitHub's web editor with a new blog post ready to edit (DEC-32).
// The post is a Markdown file in site/blog/; Netlify regenerates the site when it is merged.
// Nothing is sent anywhere from this page: it only builds a link to GitHub.

(function () {
  "use strict";

  var form = document.querySelector("[data-studio-new]");
  if (!form) return;
  var repository = form.getAttribute("data-repository") || "";
  var errorBox = form.querySelector("[data-studio-error]");

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "");
  }

  function today() {
    var d = new Date();
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function oneLine(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var title = oneLine(form.elements.namedItem("title").value);
    var description = oneLine(form.elements.namedItem("description").value);
    var slug = slugify(title);

    if (!title || !slug) return showError("Enter a title with at least one letter or number.");
    if (title.length > 90) return showError("The title must be 90 characters or fewer.");
    if (description.length < 50 || description.length > 300) {
      return showError("The description must be 50 to 300 characters. It is shown in search results and on the blog page.");
    }
    showError("");

    var date = today();
    var fileName = date + "-" + slug + ".md";
    var template = [
      "---",
      "title: " + title,
      "description: " + description,
      "date: " + date,
      "author: The VibeHeal team",
      "tags: news",
      "draft: false",
      "---",
      "",
      "Write the opening paragraph here.",
      "",
      "## A section heading",
      "",
      "Use **bold**, *italic*, `code`, [links](/faq/) and lists:",
      "",
      "- first point",
      "- second point",
      ""
    ].join("\n");

    var url =
      repository +
      "/new/main/site/blog?filename=" +
      encodeURIComponent(fileName) +
      "&value=" +
      encodeURIComponent(template);
    window.open(url, "_blank", "noopener");
  });
})();
