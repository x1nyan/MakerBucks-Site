/* =====================================================================
   featured.js — FEATURED PROJECTS ROW (on index.html)
   ---------------------------------------------------------------------
   Load order in index.html: config.js -> cards.js -> featured.js

   Fills the "Featured Projects" section near the top of index.html
   with projects marked TRUE in the sheet's Featured column, in a
   side-scrolling row with arrow buttons. The section hides itself if
   nothing is featured. Search and filters only affect the main grid,
   not this row.
   ===================================================================== */

(function () {
  'use strict';

  const { makeCardEl } = MB;


  /* =========================================================
     STATE + DOM
     ---------------------------------------------------------
     allProjects holds every row from the sheet; only the ones
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
     Keeps only projects whose Featured cell is TRUE, puts the
     most detailed ones first (same content score as the main
     page), and builds a card for each into the scrolling row.
     ========================================================= */

  function renderFeatured() {
    const featured = allProjects
      .filter(p => p.featured)
      .sort((a, b) => (b.score - a.score) || a.title.localeCompare(b.title));

    track.innerHTML = '';

    // Nothing marked TRUE? Hide the whole Featured section.
    featuredSection.hidden = featured.length === 0;
    if (featured.length === 0) return;

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

  function scrollStep() {
    const card = track.querySelector('.card');
    if (!card) return track.clientWidth * 0.8;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function updateScrollButtons() {
    const maxScroll = track.scrollWidth - track.clientWidth;
    scrollBtns.hidden = maxScroll <= 2;
    scrollPrev.disabled = track.scrollLeft <= 2;
    scrollNext.disabled = track.scrollLeft >= maxScroll - 2;
  }

  scrollPrev.addEventListener('click', () => track.scrollBy({ left: -scrollStep() }));
  scrollNext.addEventListener('click', () => track.scrollBy({ left: scrollStep() }));
  track.addEventListener('scroll', updateScrollButtons, { passive: true });
  window.addEventListener('resize', updateScrollButtons);


  /* =========================================================
     START
     ---------------------------------------------------------
     Load the sheet (see MB.loadProjects in cards.js), then fill
     the row with the featured projects.
     ========================================================= */

  MB.loadProjects()
    .then(projects => {
      allProjects = projects;
      renderFeatured();
    })
    .catch(err => {
      track.innerHTML = MB.LOAD_ERROR_HTML;
      console.error(err);
    });
})();
