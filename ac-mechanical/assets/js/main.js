/* AC Mechanical — front-end behaviour (progressive enhancement; site works without JS) */
(function () {
  "use strict";

  function init() {
    /* ---- Mobile navigation toggle ---- */
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      // Close menu when a link is chosen (mobile)
      nav.addEventListener("click", function (e) {
        if (e.target.closest("a") && nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
      // Close on Escape
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }

    /* ---- Current year in footer ---- */
    var y = new Date().getFullYear();
    var yearEls = document.querySelectorAll("[data-year]");
    for (var i = 0; i < yearEls.length; i++) { yearEls[i].textContent = y; }

    /* ---- RFQ / contact form (demo handler) ----
       No backend is wired in this static build. On submit we validate required
       fields, show a confirmation, and (as a fallback) prepare a mailto draft so
       the enquiry is never lost. Replace this handler with a POST to your form
       endpoint / email service before going live. */
    var form = document.getElementById("rfq-form");
    if (form) {
      var status = document.getElementById("form-status");
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        // Spam honeypot — real users leave this empty
        var hp = form.querySelector('input[name="company_website"]');
        if (hp && hp.value.trim() !== "") { return; }

        if (!form.checkValidity()) { form.reportValidity(); return; }

        var data = new FormData(form);
        var lines = [];
        data.forEach(function (val, key) {
          if (key === "company_website") return;
          if (typeof val === "string" && val.trim() !== "") {
            lines.push(
              key.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + ": " + val
            );
          }
        });

        // Fallback: open an email draft to the procurement inbox
        var to = form.getAttribute("data-mailto") || "";
        var subject = encodeURIComponent("Website enquiry — " + (data.get("project_type") || "Request a Quote"));
        var body = encodeURIComponent(lines.join("\n"));
        if (to) {
          window.setTimeout(function () {
            window.location.href = "mailto:" + to + "?subject=" + subject + "&body=" + body;
          }, 400);
        }

        if (status) {
          status.className = "form-status ok show";
          status.textContent = "Thank you — your request has been prepared. Your email client will open so you can send it to our procurement team, or call our office directly. We respond to bid invitations within one business day.";
          status.setAttribute("role", "status");
        }
        form.reset();
      });
    }
  }

  // Run now if the DOM is already parsed, otherwise wait for it. This makes the
  // script correct regardless of load timing or where the tag is placed.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
