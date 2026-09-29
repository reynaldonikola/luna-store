(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------- Mobile navigation ---------------- */
  var navToggle = document.getElementById("nav-toggle");
  var mainNav = document.getElementById("main-nav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.addEventListener("click", function (event) {
      if (event.target.tagName === "A") {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------- Header glass state on scroll ---------------- */
  var siteHeader = document.querySelector(".site-header");

  if (siteHeader) {
    var updateHeaderState = function () {
      siteHeader.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    updateHeaderState();
  }

  /* ---------------- Catalog filter (smooth fade transition) ---------------- */
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll(".filter-btn"));
  var productCards = Array.prototype.slice.call(document.querySelectorAll(".product-card"));
  var noResults = document.getElementById("no-results");
  var catalogCount = document.getElementById("catalog-count");
  var totalProducts = productCards.length;
  var filterTimers = new WeakMap();

  function applyFilter(category) {
    var visibleCount = 0;
    var toHide = [];
    var toShow = [];

    productCards.forEach(function (card) {
      var pendingTimer = filterTimers.get(card);
      if (pendingTimer) {
        window.clearTimeout(pendingTimer);
        filterTimers.delete(card);
      }

      var matches = category === "all" || card.getAttribute("data-category") === category;
      var isHidden = card.classList.contains("is-hidden");

      if (matches) {
        visibleCount += 1;
        if (isHidden) {
          toShow.push(card);
        }
      } else if (!isHidden) {
        toHide.push(card);
      }
    });

    if (prefersReducedMotion) {
      toHide.forEach(function (card) {
        card.classList.add("is-hidden");
      });
      toShow.forEach(function (card) {
        card.classList.remove("is-hidden");
      });
    } else {
      toHide.forEach(function (card) {
        card.classList.add("is-filtering-out");
        var timer = window.setTimeout(function () {
          card.classList.add("is-hidden");
          filterTimers.delete(card);
        }, 260);
        filterTimers.set(card, timer);
      });
      toShow.forEach(function (card) {
        card.classList.remove("is-hidden");
        // Force reflow so the removal of is-filtering-out transitions in.
        void card.offsetWidth;
        card.classList.remove("is-filtering-out");
      });
    }

    if (noResults) {
      noResults.classList.toggle("is-visible", visibleCount === 0);
    }

    if (catalogCount) {
      catalogCount.textContent =
        "Mostrando " + visibleCount + " de " + totalProducts + " productos";
    }
  }

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      filterButtons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", "false");
      });
      button.setAttribute("aria-pressed", "true");
      applyFilter(button.getAttribute("data-filter"));
    });
  });

  /* ---------------- FAQ accordion ---------------- */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll(".faq-item"));

  faqItems.forEach(function (item) {
    var question = item.querySelector(".faq-question");
    var answer = item.querySelector(".faq-answer");
    if (!question || !answer) {
      return;
    }

    question.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");

      faqItems.forEach(function (other) {
        var otherAnswer = other.querySelector(".faq-answer");
        var otherQuestion = other.querySelector(".faq-question");
        other.classList.remove("is-open");
        if (otherQuestion) {
          otherQuestion.setAttribute("aria-expanded", "false");
        }
        if (otherAnswer) {
          otherAnswer.style.maxHeight = "";
        }
      });

      if (!isOpen) {
        item.classList.add("is-open");
        question.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  /* ---------------- Back to top ---------------- */
  var backToTop = document.getElementById("back-to-top");

  if (backToTop) {
    var toggleBackToTop = function () {
      backToTop.classList.toggle("is-visible", window.scrollY > 480);
    };

    window.addEventListener("scroll", toggleBackToTop, { passive: true });
    toggleBackToTop();

    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------- Scroll reveal (headings + cards across the page) ---------------- */
  var revealSelectors = [
    ".section-heading",
    ".category-card",
    ".product-card",
    ".step-card",
    ".benefit-card",
    ".faq-item",
    ".experience",
    ".final-cta"
  ];
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll(revealSelectors.join(",")));

  if (revealTargets.length && "IntersectionObserver" in window && !prefersReducedMotion) {
    var parentCounters = new Map();

    revealTargets.forEach(function (el) {
      var parent = el.parentElement;
      var count = parentCounters.get(parent) || 0;
      el.classList.add("reveal");
      el.style.animationDelay = (count % 6) * 80 + "ms";
      parentCounters.set(parent, count + 1);
    });

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    revealTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------------- Magnetic / luminous hover on primary CTAs ---------------- */
  if (canHover && !prefersReducedMotion) {
    var magneticButtons = Array.prototype.slice.call(document.querySelectorAll(".btn-primary"));

    magneticButtons.forEach(function (btn) {
      btn.addEventListener("mousemove", function (event) {
        var rect = btn.getBoundingClientRect();
        var relX = event.clientX - rect.left;
        var relY = event.clientY - rect.top;
        var px = (relX / rect.width) * 100;
        var py = (relY / rect.height) * 100;
        btn.style.setProperty("--mx", px + "%");
        btn.style.setProperty("--my", py + "%");

        var offsetX = ((relX / rect.width) - 0.5) * 8;
        var offsetY = ((relY / rect.height) - 0.5) * 8;
        btn.style.transform = "translate(" + offsetX + "px, " + (offsetY - 2) + "px)";
      });

      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* ---------------- Subtle hero parallax on scroll ---------------- */
  var heroVisual = document.getElementById("hero-visual");

  if (heroVisual && !prefersReducedMotion) {
    var ticking = false;

    var updateParallax = function () {
      var offset = window.scrollY;
      if (offset < window.innerHeight) {
        heroVisual.style.transform = "translateY(" + offset * 0.12 + "px)";
      }
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------------- Footer year ---------------- */
  var yearEl = document.getElementById("current-year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
