/* =====================================================================
   showcase.js — MAIN PAGE (index.html)
   ---------------------------------------------------------------------
   Load order in index.html: config.js -> cards.js -> featured.js -> showcase.js

   Handles everything specific to the main page:
     search box, filter dropdown, sort menu, and the project grid.
  Card building, the flip view, and loading the CSV come from
   cards.js (through window.MB).
   ===================================================================== */

/** Initialize search, filters, sorting, and the main project grid. */
(function initializeShowcase() {
  'use strict';

  const { makeCardEl } = MB;

  const projectSubmissionLink = document.getElementById('projectSubmissionLink');
  const submissionFormUrl = MB.config.PROJECT_SUBMISSION_FORM_URL;
  if (projectSubmissionLink && submissionFormUrl) {
    projectSubmissionLink.href = submissionFormUrl;
    projectSubmissionLink.hidden = false;
  }


  /* =========================================================
     STATE
     ---------------------------------------------------------
     These variables remember what the user has chosen so far.
     Every filter/sort function reads from them.
     ========================================================= */

  // allProjects:         every project loaded from the generated CSV
  // selectedCategories:  lowercase names of checked categories
  //                      (a Set, so each name appears only once)
  // featuredOnly:        true when "★ Featured only" is checked
  // currentSort:         value of the sort dropdown
  // searchDebounceTimer: used to wait until typing pauses (see below)

  let allProjects = [];
  let selectedCategories = new Set();
  let featuredOnly = false;
  let currentSort = 'detail';
  let searchDebounceTimer = null;


  /* =========================================================
     DOM
     ---------------------------------------------------------
     Grab references to page elements once, up front, so the
     rest of the code doesn't have to look them up repeatedly.
     Each id matches an id="..." in the HTML above.
     ========================================================= */

  const container = document.getElementById('projectContainer');
  const filterDropdown = document.getElementById('filterDropdown');
  const filterToggle = document.getElementById('filterToggle');
  const filterToggleLabel = document.getElementById('filterToggleLabel');
  const filterPanel = document.getElementById('filterPanel');
  const featuredCheckbox = document.getElementById('featuredCheckbox');
  const categoryOptions = document.getElementById('categoryOptions');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const noResultsClearBtn = document.getElementById('noResultsClearBtn');
  const noResultsState = document.getElementById('noResultsState');
  const resultsSummary = document.getElementById('resultsSummary');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const sortSelect = document.getElementById('sortSelect');


  /* =========================================================
     FILTER DROPDOWN
     ---------------------------------------------------------
     renderCategoryOptions: creates one checkbox per category
    actually found in the generated CSV (alphabetical) inside the
     dropdown panel. Checking a box adds that category to
     selectedCategories; unchecking removes it. Multiple can
     be checked at once, and a card shows if it matches ANY
     checked category.

     updateFilterLabel: keeps the dropdown button's text in
     sync with what's selected, e.g.
       "Filter: All categories"
       "Filter: Robotics"
       "Filter: 3 selected"
       "Filter: ★ Featured, Robotics"
     ========================================================= */

  /** Create one filter checkbox for each category in the loaded projects.
   * @param {Iterable<string>} categories - Unique display category names.
   * @returns {void}
   */
  function renderCategoryOptions(categories) {
    categoryOptions.innerHTML = '';

    Array.from(categories)
      .sort(
        /** Compare category labels alphabetically for stable display. */
        (a, b) => a.localeCompare(b)
      )
      .forEach(
        /** Build and append a checkbox that updates the selected filters. */
        cat => {
        const label = document.createElement('label');
        label.className = 'filter-option';

        const box = document.createElement('input');
        box.type = 'checkbox';
        box.value = cat.toLowerCase();
        box.dataset.display = cat;

        /** Add or remove this category from the active filter set. */
        box.addEventListener('change', function updateSelectedCategory() {
          if (box.checked) selectedCategories.add(box.value);
          else selectedCategories.delete(box.value);
          applyFilters();
        });

        label.appendChild(box);
        label.appendChild(document.createTextNode(cat));
        categoryOptions.appendChild(label);
        }
      );
  }

  /** Update the filter button label to reflect active category and featured filters.
   * @returns {void}
   */
  function updateFilterLabel() {
    const checkedNames = Array.from(
      categoryOptions.querySelectorAll('input:checked')
    ).map(
      /** Read the user-facing category label from each checked input. */
      b => b.dataset.display
    );

    const parts = [];
    if (featuredOnly) parts.push('★ Featured');

    if (checkedNames.length === 1) parts.push(checkedNames[0]);
    else if (checkedNames.length > 1) parts.push(`${checkedNames.length} categories`);

    filterToggleLabel.textContent = parts.length
      ? `Filter: ${parts.join(', ')}`
      : 'Filter: All categories';

    filterToggle.classList.toggle('has-active', parts.length > 0);
  }

  // Open/close the panel. aria-expanded tells screen readers its state.
  /** Show or hide the category panel and synchronize its accessibility state.
   * @param {boolean} open - Whether the filter panel should be visible.
   * @returns {void}
   */
  function setPanelOpen(open) {
    filterPanel.hidden = !open;
    filterToggle.setAttribute('aria-expanded', String(open));
  }

  /** Toggle the category panel from its control button. */
  filterToggle.addEventListener('click', function toggleFilterPanel() {
    setPanelOpen(filterPanel.hidden);
  });

  // Clicking anywhere outside the dropdown closes it.
  /** Close the category panel when a click lands outside its container. */
  document.addEventListener('click', function closeFilterOnOutsideClick(e) {
    if (!filterPanel.hidden && !filterDropdown.contains(e.target)) {
      setPanelOpen(false);
    }
  });

  // Pressing Escape closes it and puts focus back on the button.
  /** Close the category panel and restore focus when Escape is pressed. */
  document.addEventListener('keydown', function closeFilterOnEscape(e) {
    if (e.key === 'Escape' && !filterPanel.hidden) {
      setPanelOpen(false);
      filterToggle.focus();
    }
  });

  /** Apply the featured-only state when its checkbox changes. */
  featuredCheckbox.addEventListener('change', function updateFeaturedFilter() {
    featuredOnly = featuredCheckbox.checked;
    applyFilters();
  });


  /* =========================================================
     SORTING
     ---------------------------------------------------------
     Returns a sorted copy of the project list (the original
     order is left alone). Sort compare functions return a
     negative/positive number to decide which item goes first;
     the "||" chains act as tie-breakers, e.g. for 'featured':
       1st: featured projects before non-featured
       2nd: if tied, higher content score first
       3rd: if still tied, alphabetical by title
     ========================================================= */

  /** Return a copy of the projects ordered by the selected sort mode.
   * @param {Array<object>} list - Project records to sort.
   * @returns {Array<object>} A sorted copy; the input array is unchanged.
   */
  function sortProjects(list) {
    const sorted = list.slice();

    switch (currentSort) {
      case 'az':
        sorted.sort(
          /** Compare project titles in ascending order. */
          (a, b) => a.title.localeCompare(b.title)
        );
        break;

      case 'za':
        sorted.sort(
          /** Compare project titles in descending order. */
          (a, b) => b.title.localeCompare(a.title)
        );
        break;

      case 'maker':
        sorted.sort(
          /** Compare maker names in ascending order. */
          (a, b) => (a.maker || '').localeCompare(b.maker || '')
        );
        break;

      case 'featured':
        sorted.sort(
          /** Rank featured projects first, then score, then title. */
          (a, b) =>
            (b.featured - a.featured) ||
            (b.score - a.score) ||
            a.title.localeCompare(b.title)
        );
        break;

      case 'detail':
      default:
        // Most content first; thinner cards sink to the bottom
        sorted.sort(
          /** Rank by detail score, using title as a stable tie-breaker. */
          (a, b) =>
            (b.score - a.score) ||
            a.title.localeCompare(b.title)
        );
        break;
    }

    return sorted;
  }


  /* =========================================================
     RENDER ALL
     ---------------------------------------------------------
     Wipes the container and rebuilds every card in sorted
     order. Only runs on first load and when the sort changes.
     Then re-applies the current filters so hidden cards stay
     hidden.
     ========================================================= */

  /** Rebuild the grid in sorted order and reapply the current filters.
   * @returns {void}
   */
  function renderAll() {
    container.innerHTML = '';
    sortProjects(allProjects).forEach(
      /** Create and append one card for each sorted project. */
      project => {
      container.appendChild(makeCardEl(project));
      }
    );
    applyFilters();
  }


  /* =========================================================
     FILTERING
     ---------------------------------------------------------
     Runs whenever the search text or a filter changes.
     It loops over every card and checks three things:

       matchesCategory - no category checked, OR the card has
                         at least one of the checked categories
       matchesFeatured - "Featured only" off, OR card is featured
       matchesSearch   - search box empty, OR the card's search
                         text contains what was typed

     A card is shown only if all three pass; otherwise it gets
     the "is-hidden" class (display: none). Afterward it updates
     the "Showing X of Y" line, the no-results message, the
     dropdown's label, and whether "Clear filters" is visible.
     ========================================================= */

  /** Show matching cards and update counts, labels, and empty states.
   * @returns {void}
   */
  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const anyCategoryFilter = selectedCategories.size > 0;
    let visibleCount = 0;

    container.querySelectorAll('.card').forEach(
      /** Evaluate the active filters and update one card's visibility. */
      card => {
      const cardCats = card.dataset.categories.split('|');

      const matchesCategory =
        !anyCategoryFilter || cardCats.some(
          /** Match when the card has any selected category. */
          c => selectedCategories.has(c)
        );
      const matchesFeatured =
        !featuredOnly || card.dataset.featured === '1';
      const matchesSearch =
        !query || card.dataset.searchText.includes(query);

      const show = matchesCategory && matchesFeatured && matchesSearch;
      card.classList.toggle('is-hidden', !show);
      if (show) visibleCount++;
      }
    );

    const activeFilterCount = selectedCategories.size + (featuredOnly ? 1 : 0);

    clearFiltersBtn.classList.toggle('visible', activeFilterCount > 0 || query.length > 0);
    noResultsState.style.display = visibleCount === 0 && allProjects.length ? 'block' : 'none';
    searchClearBtn.classList.toggle('visible', query.length > 0);
    updateFilterLabel();

    resultsSummary.textContent = allProjects.length
      ? `Showing ${visibleCount} of ${allProjects.length} projects`
      : '';
  }


  /* =========================================================
     CLEAR FILTERS
     ---------------------------------------------------------
     Unchecks everything, empties the search box, and shows
     all cards again.
     ========================================================= */

  /** Clear search and filter state, then restore every project card.
   * @returns {void}
   */
  function clearAllFilters() {
    selectedCategories.clear();
    featuredOnly = false;
    featuredCheckbox.checked = false;
    searchInput.value = '';
    categoryOptions.querySelectorAll('input').forEach(
      /** Uncheck one category control while clearing filter state. */
      b => { b.checked = false; }
    );
    applyFilters();
  }


  /* =========================================================
     EVENT WIRING
     ---------------------------------------------------------
     Connects the remaining buttons and inputs to the
     functions above.
     ========================================================= */

  clearFiltersBtn.addEventListener('click', clearAllFilters);
  noResultsClearBtn.addEventListener('click', clearAllFilters);

  /*
    Search "debounce": instead of filtering on every single
    keystroke, wait until the user pauses typing for 150ms.
    Each new keystroke cancels the previous timer and starts
    a fresh one, so filtering only runs once typing settles.
  */
  /** Debounce text search until the user pauses typing. */
  searchInput.addEventListener('input', function debounceSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(applyFilters, 150);
  });

  /** Clear the search query and return focus to its input. */
  searchClearBtn.addEventListener('click', function clearSearchInput() {
    searchInput.value = '';
    searchInput.focus();
    applyFilters();
  });

  /** Update the sort mode and rebuild cards in the selected order. */
  sortSelect.addEventListener('change', function changeSortOrder() {
    currentSort = sortSelect.value;
    renderAll();
  });

  /* =========================================================
     START
     ---------------------------------------------------------
    Load the generated CSV (see MB.loadProjects in cards.js), then build
     the category checkboxes and the grid.
     ========================================================= */

  MB.loadProjects()
    /** Build category controls and render the loaded project list. */
    .then(function renderLoadedProjects(projects) {
      allProjects = projects;

      if (allProjects.length === 0) {
        container.innerHTML =
          '<div class="empty-state">No projects found.</div>';
        return;
      }

      /*
        Collect each unique category once for the filter dropdown.
        Keys are lowercase so "robotics" and "Robotics" count as the
        same category; the value keeps the first spelling seen for
        the checkbox label.
      */
      const displayCats = new Map();
      allProjects.forEach(
        /** Collect all category labels used by the loaded projects. */
        p => {
        p.categories.forEach(
          /** Preserve the first spelling of each case-insensitive category. */
          c => {
          if (!displayCats.has(c.toLowerCase())) displayCats.set(c.toLowerCase(), c);
          }
        );
        }
      );

      renderCategoryOptions(displayCats.values());
      renderAll();
    })
    /** Show the shared data-load error when the project request fails. */
    .catch(function showProjectLoadError() {
      container.innerHTML = MB.LOAD_ERROR_HTML;
    });
})();
