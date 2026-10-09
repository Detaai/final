/* =========================================================================
   Search Module
   Owns the search box UI and turns user queries into navigation events.
   ========================================================================= */
const SearchModule = (function () {
  let inputEl = null;
  let formEl = null;

  function init({ formSelector, inputSelector }) {
    formEl = document.querySelector(formSelector);
    inputEl = document.querySelector(inputSelector);
    if (!formEl || !inputEl) return;

    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      submitSearch();
    });
  }

  function submitSearch() {
    const term = (inputEl.value || "").trim();
    if (!term) {
      inputEl.focus();
      return;
    }
    NavigationModule.goToSearch(term);
  }

  /** Called by the Navigation Module so the box reflects the active query. */
  function setValue(term) {
    if (inputEl) inputEl.value = term || "";
  }

  /** Runs the actual API lookup for a query; used by the search view. */
  async function performSearch(term) {
    return ApiModule.searchReptiles(term);
  }

  return { init, setValue, performSearch };
})();
