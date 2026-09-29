/* =====================================================================
   featured.js — FEATURED PROJECTS ROW (on index.html)
   ---------------------------------------------------------------------
   Load order in index.html: config.js -> cards.js -> featured.js

   Fills the "Featured Projects" section near the top of index.html
  with projects marked TRUE in the generated CSV's Featured column, in a
   side-scrolling row with arrow buttons. The section hides itself if
   nothing is featured. Search and filters only affect the main grid,
   not this row.
   ===================================================================== */

/** Load and display projects marked Featured in the generated CSV. */
(function initializeFeaturedProjects() {
  'use strict';

  const { makeCardEl } = MB;


  /* =========================================================
     STATE + DOM
     ---------------------------------------------------------
    allProjects holds every project loaded from the generated CSV; only ones
     with featured === true are shown.
     ========================================================= */

  let allProjects = [];

  const featuredSection = document.getElementById('featuredSection');
  const track = document.getElementById('featuredTrack');
  const scrollBtns = document.getElementById('scrollBtns');
  const scrollPrev = document.getElementById('scrollPrev');
  const scrollNext = document.getElementById('scrollNext');


  /* =========================================================
     RENDER FEATURED
     ---------------------------------------------------------
    Keeps only projects whose Featured value is TRUE, puts the
     most detailed ones first (same content score as the main
     page), and builds a card for each into the scrolling row.
     ========================================================= */

  /** Filter, sort, and render featured cards or hide the empty section.
   * @returns {void}
   */
  function renderFeatured() {
    const featured = allProjects
      /** Keep only projects enabled for the featured section. */
      .filter(p => p.featured)
      /** Rank featured projects by detail score, then title. */
      .sort((a, b) => (b.score - a.score) || a.title.localeCompare(b.title));

    track.innerHTML = '';

    // Nothing marked TRUE? Hide the whole Featured section.
    featuredSection.hidden = featured.length === 0;
    if (featured.length === 0) return;

    /** Create and append one card for each featured project. */
    featured.forEach(project => track.appendChild(makeCardEl(project)));
    updateScrollButtons();
  }


  /* =========================================================
     SCROLL ARROWS
     ---------------------------------------------------------
     Each arrow scrolls the row by one card (card width + gap).
     updateScrollButtons() hides both arrows when everything
     already fits, and greys out an arrow at either end.
     It re-runs whenever the row is scrolled or the window
     is resized.
     ========================================================= */

  /** Calculate the horizontal distance needed to advance one featured card.
   * @returns {number} Card width plus its track gap, or a viewport-based fallback.
   */
  function scrollStep() {
    const card = track.querySelector('.card');
    if (!card) return track.clientWidth * 0.8;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  /** Update arrow visibility and disabled state from the track scroll position.
   * @returns {void}
   */
  function updateScrollButtons() {
    const maxScroll = track.scrollWidth - track.clientWidth;
    scrollBtns.hidden = maxScroll <= 2;
    scrollPrev.disabled = track.scrollLeft <= 2;
    scrollNext.disabled = track.scrollLeft >= maxScroll - 2;
  }

  /** Scroll the featured track back by one card. */
  scrollPrev.addEventListener('click', function scrollToPreviousCard() {
    track.scrollBy({ left: -scrollStep() });
  });
  /** Scroll the featured track forward by one card. */
  scrollNext.addEventListener('click', function scrollToNextCard() {
    track.scrollBy({ left: scrollStep() });
  });
  track.addEventListener('scroll', updateScrollButtons, { passive: true });
  window.addEventListener('resize', updateScrollButtons);


  /* =========================================================
     START
     ---------------------------------------------------------
    Load the generated CSV (see MB.loadProjects in cards.js), then fill
     the row with the featured projects.
     ========================================================= */

  MB.loadProjects()
    /** Save the shared project list and render the featured subset. */
    .then(function renderLoadedFeaturedProjects(projects) {
      allProjects = projects;
      renderFeatured();
    })
    /** Show the shared load error when project data cannot be retrieved. */
    .catch(function showFeaturedLoadError() {
      track.innerHTML = MB.LOAD_ERROR_HTML;
    });
})();
