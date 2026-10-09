/* =========================================================================
   Main
   Wires the API, Search, Display, Details and Navigation modules together.
   ========================================================================= */
(function () {
  const els = {
    navToggle: document.querySelector(".nav-toggle"),
    navLinks: document.querySelector(".nav-links"),
    categoryFilters: document.querySelector(".category-filters"),

    viewBrowse: document.getElementById("view-browse"),
    viewSearch: document.getElementById("view-search"),
    viewDetails: document.getElementById("view-details"),

    carousel: document.getElementById("carousel"),
    browseGrid: document.getElementById("browse-grid"),
    browseHeading: document.getElementById("browse-heading"),

    resultsHeading: document.getElementById("results-heading"),
    searchGrid: document.getElementById("search-grid"),

    detailHero: document.getElementById("detail-hero"),
    detailInfo: document.getElementById("detail-info"),
  };

  // ---- Mobile nav toggle ----
  if (els.navToggle && els.navLinks) {
    els.navToggle.addEventListener("click", () => {
      const isOpen = els.navLinks.classList.toggle("open");
      els.navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    els.navLinks.addEventListener("click", (e) => {
      if (!e.target.closest("a")) return;
      els.navLinks.classList.remove("open");
      els.navToggle.setAttribute("aria-expanded", "false");
    });
  }

  // ---- Category chip clicks ----
  if (els.categoryFilters) {
    els.categoryFilters.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      NavigationModule.goToBrowse(chip.getAttribute("data-category"));
    });
  }

  function setActiveChip(category) {
    if (!els.categoryFilters) return;
    els.categoryFilters.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("active", chip.getAttribute("data-category") === category);
    });
  }

  // ---- Route handlers ----
  async function handleBrowse(category) {
    setActiveChip(category);
    const label = (ApiModule.CATEGORY_TAXA[category] || ApiModule.CATEGORY_TAXA.all).label;
    if (els.browseHeading) els.browseHeading.textContent = label;
    document.title = "Reptile Explorer · Browse";

    ReptileDisplayModule.renderLoading(els.carousel, "Loading featured reptiles…");
    ReptileDisplayModule.renderLoading(els.browseGrid);
    try {
      const reptiles = await ApiModule.getFeaturedReptiles(category);
      ReptileDisplayModule.renderCarousel(els.carousel, reptiles);
      ReptileDisplayModule.renderCardGrid(els.browseGrid, reptiles);
    } catch (err) {
      ReptileDisplayModule.renderError(els.carousel, "Could not load featured reptiles.");
      ReptileDisplayModule.renderError(els.browseGrid, "Could not load reptiles for this category.");
    }
  }

  async function handleSearch(term) {
    SearchModule.setValue(term);
    document.title = `Reptile Explorer · Search: ${term}`;
    if (els.resultsHeading) {
      els.resultsHeading.innerHTML = `Search results for &ldquo;<strong>${ReptileDisplayModule.escapeHtml(
        term
      )}</strong>&rdquo;`;
    }
    ReptileDisplayModule.renderLoading(els.searchGrid, "Searching reptiles…");
    try {
      const results = await SearchModule.performSearch(term);
      ReptileDisplayModule.renderCardGrid(els.searchGrid, results);
    } catch (err) {
      ReptileDisplayModule.renderError(els.searchGrid, "Search failed. Please try again.");
    }
  }

  function handleDetails(id) {
    if (!id) return;
    ReptileDetailsModule.render(
      { heroContainer: els.detailHero, infoContainer: els.detailInfo },
      id
    );
  }

  // ---- Bootstrap ----
  SearchModule.init({ formSelector: "#search-form", inputSelector: "#search-input" });

  NavigationModule.init({
    viewEls: {
      browse: els.viewBrowse,
      search: els.viewSearch,
      details: els.viewDetails,
    },
    routeHandlers: {
      browse: handleBrowse,
      search: handleSearch,
      details: handleDetails,
    },
    navLinkEls: document.querySelectorAll("[data-route]"),
  });
})();
