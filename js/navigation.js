/* =========================================================================
   Navigation Module
   Hash-based router that switches between the Browse, Search and Details
   views and keeps the browser's back/forward buttons working.
   ========================================================================= */
const NavigationModule = (function () {
  let views = {}; // { browse: HTMLElement, search: HTMLElement, details: HTMLElement }
  let handlers = {}; // { browse: fn(params), search: fn(params), details: fn(params) }
  let navLinks = [];

  function init({ viewEls, routeHandlers, navLinkEls }) {
    views = viewEls;
    handlers = routeHandlers;
    navLinks = navLinkEls || [];
    window.addEventListener("hashchange", route);
    route(); // initial load
  }

  function parseHash() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const [pathPart, queryPart] = hash.split("?");
    const segments = pathPart.split("/").filter(Boolean);
    const params = new URLSearchParams(queryPart || "");
    return { name: segments[0] || "browse", segments, params };
  }

  function route() {
    const { name, segments, params } = parseHash();
    showView(name);
    highlightNav(name);

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    if (name === "search" && handlers.search) {
      handlers.search(params.get("q") || "");
    } else if (name === "details" && handlers.details) {
      handlers.details(segments[1]);
    } else if (handlers.browse) {
      handlers.browse(params.get("category") || "all");
    }
  }

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      el.hidden = key !== name;
    });
  }

  function highlightNav(name) {
    navLinks.forEach((link) => {
      const target = link.getAttribute("data-route");
      link.classList.toggle("active", target === name);
    });
  }

  function goToBrowse(category = "all") {
    window.location.hash = category && category !== "all"
      ? `#/browse?category=${encodeURIComponent(category)}`
      : "#/browse";
  }

  function goToSearch(term) {
    window.location.hash = `#/search?q=${encodeURIComponent(term)}`;
  }

  function goToDetails(id) {
    window.location.hash = `#/details/${id}`;
  }

  return { init, goToBrowse, goToSearch, goToDetails };
})();
