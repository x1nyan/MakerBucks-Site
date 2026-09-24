/* =====================================================================
   cards.js — SHARED CARD CODE
   ---------------------------------------------------------------------
   Used by BOTH index.html and featured.html. Load it AFTER config.js.

   What's in here:
     - helpers that clean up sheet data (categories, photo links, ...)
     - building a card's HTML (front + back)
     - the enlarged flip view (click a card -> it flips and grows)
     - the photo carousel arrows/dots
     - loading and parsing the Google Sheet

   It adds these to window.MB for the page scripts to use:
     MB.loadProjects()   download + parse the sheet (returns a Promise)
     MB.makeCardEl(p)    build a card element for one project
     MB.LOAD_ERROR_HTML  the red "couldn't load" message
   Everything else stays private inside this file.
   ===================================================================== */

(function () {
  'use strict';

  const { FULL_URL, SHEET_ID, MULTI_WORD_CATEGORIES } = MB.config;


  /* =========================================================
     HELPERS
     ========================================================= */

  /*
    escapeHtml: makes sheet text safe to insert into the page.
    Without this, a cell containing "<" or a quote could break
    the HTML (or inject code). It swaps those characters for
    their harmless "&...;" versions, which display the same.
  */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /*
    parseUrls: reads the Photos cell. You can put several image
    links in one cell, separated by commas or new lines, and each
    becomes a slide in the carousel. Anything that isn't a web
    link (http/https) is ignored.
  */
  function parseUrls(cellValue) {
    if (!cellValue) return [];
    return String(cellValue)
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http://') || s.startsWith('https://'));
  }

  /*
    CATEGORIES — READ STRAIGHT FROM THE CATEGORY COLUMN
    ---------------------------------------------------------
    The filter dropdown lists exactly the categories that appear
    in column C. Add, rename, or remove a category in the sheet
    and the dropdown changes to match on the next page load.

    The tricky part: one cell can hold several categories
    separated by commas ("Robotics, Electronics & Hardware"), but
    a category's own name can ALSO contain a comma
    ("Props, Costumes & Art"). So the page learns which pieces
    are real categories by looking at the whole column:

      1. findStandaloneCategories() collects every cell that has
         NO comma. Those are definitely whole category names
         (e.g. "Robotics", "Electronics & Hardware").

      2. splitCategories() splits a cell on commas, then:
           - a piece that's a known standalone category stays
             on its own
           - pieces that are NOT known standalones and sit next
             to each other get glued back together with ", "

         Example: "Props, Costumes & Art, Electronics & Hardware"
           pieces:  Props | Costumes & Art | Electronics & Hardware
           known?   no    | no             | yes
           result:  ["Props, Costumes & Art", "Electronics & Hardware"]

    Rare edge case: two different comma-containing categories
    listed right next to each other would get glued together.
    If that ever happens, add the names to MULTI_WORD_CATEGORIES
    in the config and they'll be matched first.

    A blank Category cell becomes "General".
  */
  function findStandaloneCategories(cellValues) {
    const standalone = new Set();
    cellValues.forEach(v => {
      const text = String(v || '').trim();
      if (text && !text.includes(',')) standalone.add(text.toLowerCase());
    });
    return standalone;
  }

  function splitCategories(cellValue, standalone) {
    if (!cellValue) return ['General'];

    let text = String(cellValue);
    const found = [];

    // Manual overrides first (normally an empty list)
    MULTI_WORD_CATEGORIES.forEach(name => {
      if (text.includes(name)) {
        found.push(name);
        text = text.split(name).join('');
      }
    });

    const pieces = text.split(',').map(s => s.trim()).filter(Boolean);
    let unknownRun = []; // consecutive pieces that aren't standalone categories

    const flushUnknown = () => {
      if (unknownRun.length) found.push(unknownRun.join(', '));
      unknownRun = [];
    };

    pieces.forEach(piece => {
      if (standalone.has(piece.toLowerCase())) {
        flushUnknown();
        found.push(piece);
      } else {
        unknownRun.push(piece);
      }
    });
    flushUnknown();

    // Remove accidental duplicates within one cell
    const unique = [...new Map(found.map(c => [c.toLowerCase(), c])).values()];
    return unique.length ? unique : ['General'];
  }

  /*
    slugify: "ABV Meter" -> "abv-meter". Not used on screen yet;
    it's stored on each project so you can later give each one
    a link/anchor (e.g. showcase.html#abv-meter).
  */
  function slugify(str) {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /*
    contentScore: a rough "how complete is this project?" number,
    used by the default sort to push thinner cards to the bottom.

    Points come from:
      - total characters across Overview, Scope, Materials,
        Fabrication Steps, and Outcome
      - +60 per numbered fabrication step ("1.", "2.", ...)
      - +40 per "•" material bullet
      - +300 if the project has at least one photo

    Want photos to matter more (or less)? Change the 300.
    Want step count to matter more? Raise the 60.
  */
  function contentScore(p) {
    const textLength =
      p.overview.length +
      p.scope.length +
      p.materials.length +
      p.fabrication.length +
      p.outcome.length;

    const stepCount = (p.fabrication.match(/^\s*\d+\./gm) || []).length;
    const materialCount = (p.materials.match(/•/g) || []).length;
    const photoBonus = p.photoUrls.length > 0 ? 300 : 0;

    return textLength + stepCount * 60 + materialCount * 40 + photoBonus;
  }


  /* =========================================================
     MEDIA
     ---------------------------------------------------------
     Builds the photo area at the top of a card, as an HTML
     string:
       - 1 photo    -> just the image
       - 2+ photos  -> images + prev/next arrows + dots
       - no photos  -> a striped "Photos coming soon" box
     loading="lazy" means images below the fold don't download
     until the user scrolls near them (faster first load).
     ========================================================= */

  function buildMediaHTML(project) {
    if (project.photoUrls.length > 0) {
      const slides = project.photoUrls
        .map((url, i) =>
          `<img src="${escapeHtml(url)}"
                class="carousel-slide ${i === 0 ? 'active' : ''}"
                alt="${escapeHtml(project.title)} photo ${i + 1}"
                loading="lazy">`)
        .join('');

      const dots = project.photoUrls.length > 1
        ? `<ul class="carousel-dots">
            ${project.photoUrls.map((_, i) =>
              `<li><button class="dot ${i === 0 ? 'active' : ''}"
                    aria-label="Show photo ${i + 1}" type="button"></button></li>`).join('')}
           </ul>`
        : '';

      const navControls = project.photoUrls.length > 1
        ? `<button class="carousel-btn prev" aria-label="Previous photo" type="button">&#10094;</button>
           <button class="carousel-btn next" aria-label="Next photo" type="button">&#10095;</button>
           ${dots}`
        : '';

      // Blurred copy of the first photo, behind everything (see CSS)
      const backdrop =
        `<div class="carousel-backdrop" aria-hidden="true"
              style="background-image: url('${escapeHtml(project.photoUrls[0]).replace(/'/g, '%27')}')"></div>`;

      return `<div class="carousel-container" data-index="0">${backdrop}${slides}${navControls}</div>`;
    }

    return `<div class="no-photo">Photos coming soon</div>`;
  }


  /* =========================================================
     CARD HTML
     ---------------------------------------------------------
     These functions build the inside of each card as text
     (an HTML "template string" using backticks and ${...}).
     Every value from the sheet goes through escapeHtml first.
     ========================================================= */

  /*
    backSection: one labeled block on the back of the card.
    If the sheet cell is empty, it shows emptyText in italics
    instead — or nothing at all if emptyText is ''.
  */
  function backSection(label, value, emptyText) {
    if (value) {
      return `<div class="back-section">
                <div class="section-label">${label}</div>
                <div class="section-text">${escapeHtml(value)}</div>
              </div>`;
    }
    if (emptyText) {
      return `<div class="back-section">
                <div class="section-label">${label}</div>
                <div class="section-text back-empty">${emptyText}</div>
              </div>`;
    }
    return '';
  }

  /*
    buildFrontHTML: what shows in the grid.
      photo, category tags, maker, title, overview, scope
    Sections with no content are simply left out.
  */
  function buildFrontHTML(project) {
    const catTags = project.categories
      .map(c => `<span class="cat-tag">${escapeHtml(c)}</span>`)
      .join('');

    const frontOverview = project.overview
      ? `<p class="card-desc">${escapeHtml(project.overview)}</p>`
      : '';

    const frontScope = project.scope
      ? `<div class="section-label">Scope</div>
         <div class="section-text">${escapeHtml(project.scope)}</div>`
      : '';

    return `
      <div class="card-inner">
        <div class="card-face card-front">
          ${buildMediaHTML(project)}

          <div class="header-tags">
            <div class="cat-tags">${catTags}</div>
            ${project.maker ? `<span class="maker-tag">By: ${escapeHtml(project.maker)}</span>` : ''}
          </div>

          <h3 class="card-title">
            <button class="flip-title" type="button" aria-expanded="false">${escapeHtml(project.title)}</button>
            <span class="flip-hint">Click to see materials &amp; fabrication</span>
          </h3>

          ${frontOverview}
          ${frontScope}
        </div>
      </div>`;
  }

  /*
    buildBackHTML: the details side, only built when a card is
    opened in the enlarged view.
      header: title, maker, "click to close" hint
      left column:  Materials, Outcome
      right column: Fabrication Steps
  */
  function buildBackHTML(project) {
    return `
      <div class="card-face card-back">
        <div class="back-header">
          <div class="back-title">${escapeHtml(project.title)}</div>
          ${project.maker ? `<p class="back-meta">By: ${escapeHtml(project.maker)}</p>` : ''}
          <p class="back-hint">Click anywhere to close</p>
        </div>

        <div class="back-columns">
          <div>
            ${backSection('Materials', project.materials, 'No materials listed.')}
            ${backSection('Outcome', project.outcome, '')}
          </div>
          <div>
            ${backSection('Fabrication Steps', project.fabrication, 'No fabrication steps listed.')}
          </div>
        </div>
      </div>`;
  }


  /* =========================================================
     CREATE CARD
     ---------------------------------------------------------
     Wraps the card HTML in a real <div class="card"> element
     and attaches "data-" attributes to it. These are little
     labels stored on the element that the filter code reads
     later, so filtering never has to look at the sheet again:

       data-categories  "robotics|electronics & hardware"
       data-featured    "1" or "0"
       data-search-text every text field, lowercase, joined
                        together — the search box just checks
                        whether this contains what you typed
     ========================================================= */

  function makeCardEl(project) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.categories = project.categories.join('|').toLowerCase();
    card.dataset.featured = project.featured ? '1' : '0';
    card.dataset.searchText = [
      project.title,
      project.maker,
      project.categories.join(' '),
      project.overview,
      project.scope,
      project.materials,
      project.fabrication,
      project.outcome
    ].join(' ').toLowerCase();

    card.innerHTML = buildFrontHTML(project);
    card.project = project; // remembered so openCard() can build the back
    return card;
  }


  /* =========================================================
     ENLARGED FLIP VIEW (open + close)
     ---------------------------------------------------------
     See the "ENLARGED FLIP VIEW" notes in the CSS for the idea.
     Only one card can be open at a time; these variables track
     it. "busy" blocks clicks while an animation is running so
     a double-click can't tangle things up.
     ========================================================= */

  const ANIMATION_MS = 650; // a bit longer than the CSS transitions

  let openState = null; // { card, expanded, overlay } while open
  let busy = false;

  /*
    getTargetBox: works out how big the enlarged card should be
    and where it goes (centered on screen).

    Width:  up to 900px, but never wider than the screen.
    Height: exactly what the back needs to fit ALL its text.
            To find that out, the back is built invisibly
            off-screen at the target width and measured.
            (Only if a project is taller than the screen does
            the back fall back to scrolling.)
  */
  function getTargetBox(project, startHeight) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = vw <= 700 ? 12 : 32;

    const width = Math.min(900, vw - margin * 2);

    const measure = document.createElement('div');
    measure.innerHTML = buildBackHTML(project);
    const face = measure.firstElementChild;
    Object.assign(face.style, {
      position: 'absolute',
      visibility: 'hidden',
      transform: 'none',
      inset: 'auto',
      top: '0',
      left: '-10000px',
      width: width + 'px',
      height: 'auto',
      overflow: 'visible'
    });
    document.body.appendChild(face);
    const contentHeight = face.offsetHeight;
    face.remove();

    // Never smaller than the card started, never taller than the screen
    const height = Math.min(Math.max(contentHeight, startHeight), vh - margin * 2);

    return {
      width,
      height,
      left: (vw - width) / 2,
      top: (vh - height) / 2
    };
  }

  function setBox(el, box) {
    el.style.top = box.top + 'px';
    el.style.left = box.left + 'px';
    el.style.width = box.width + 'px';
    el.style.height = box.height + 'px';
  }

  /*
    Stop the page behind from scrolling while a card is open.
    Hiding the scrollbar would make the page jump sideways, so
    the scrollbar's width is added as padding to compensate.
  */
  function lockScroll() {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const pad = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.paddingRight = (pad + scrollbar) + 'px';
    document.body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
  }

  function openCard(card) {
    if (openState || busy) return;
    busy = true;

    const start = card.getBoundingClientRect();

    // 1. Blurred overlay
    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    document.body.appendChild(overlay);

    // 2. Copy of the card, placed exactly over the original
    const expanded = document.createElement('div');
    expanded.className = 'expanded-card';
    expanded.setAttribute('role', 'dialog');
    expanded.setAttribute('aria-modal', 'true');
    expanded.setAttribute('aria-label', card.project.title + ' details');
    expanded.tabIndex = -1;

    const inner = document.createElement('div');
    inner.className = 'card-inner';
    inner.appendChild(card.querySelector('.card-front').cloneNode(true)); // keeps the current photo
    inner.insertAdjacentHTML('beforeend', buildBackHTML(card.project));
    expanded.appendChild(inner);

    setBox(expanded, start);
    document.body.appendChild(expanded);

    const target = getTargetBox(card.project, start.height);

    card.classList.add('is-open');
    lockScroll();

    // 3 + 4. Next frame: grow to the center AND flip.
    // (Waiting one frame makes sure the browser has drawn the
    //  starting position first, so there's something to animate from.)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('show');
        setBox(expanded, target);
        expanded.classList.add('flipped');
      });
    });

    const titleButton = card.querySelector('.flip-title');
    if (titleButton) titleButton.setAttribute('aria-expanded', 'true');

    openState = { card, expanded, overlay };
    setTimeout(() => {
      busy = false;
      expanded.classList.add('settled');
      expanded.focus({ preventScroll: true });
    }, ANIMATION_MS);
  }

  function closeCard() {
    if (!openState || busy) return;
    busy = true;

    const { card, expanded, overlay } = openState;

    // Shrink back to wherever the original card is now, while flipping back
    const end = card.getBoundingClientRect();
    expanded.classList.remove('settled');
    expanded.classList.remove('flipped');
    setBox(expanded, end);
    overlay.classList.remove('show');

    setTimeout(() => {
      expanded.remove();
      overlay.remove();
      card.classList.remove('is-open');
      unlockScroll();

      const titleButton = card.querySelector('.flip-title');
      if (titleButton) {
        titleButton.setAttribute('aria-expanded', 'false');
        titleButton.focus({ preventScroll: true });
      }

      openState = null;
      busy = false;
    }, ANIMATION_MS);
  }

  /*
    One click listener for the whole page ("event delegation"),
    so it works for every card, even ones rebuilt by sorting.

      - Carousel arrow or dot?           -> ignore (carousel handles it)
      - A card is open?                  -> any click closes it
      - Clicked a card in the grid?      -> open it
      - Highlighting text on a card?     -> don't open, so text
                                           can still be copied
  */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.carousel-btn') || e.target.closest('.dot')) return;

    const selection = window.getSelection();
    const selecting = selection && selection.toString().length > 0;

    if (openState) {
      if (selecting && openState.expanded.contains(selection.anchorNode)) return;
      closeCard();
      return;
    }

    // Only cards inside a card area open: the main grid
    // (.project-grid) or the featured row (.featured-track)
    const card = e.target.closest('.card');
    if (!card || !card.closest('.project-grid, .featured-track')) return;
    if (selecting && card.contains(selection.anchorNode)) return;

    openCard(card);
  });

  // Escape key closes an open card
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && openState) closeCard();
  });

  // If the window is resized while open, re-center the card
  window.addEventListener('resize', () => {
    if (!openState || busy) return;
    setBox(openState.expanded, getTargetBox(openState.card.project, 0));
  });


  /* =========================================================
     CAROUSEL
     ---------------------------------------------------------
     Each carousel remembers which photo it's on in its
     data-index attribute. goToSlide() removes "active" from
     the current photo/dot and adds it to the new one.

     The "(index + length) % length" math makes it wrap around:
     going "previous" from the first photo lands on the last,
     and "next" from the last lands on the first.

     Like the flip, this uses one document-wide click listener.
     ========================================================= */

  function goToSlide(carousel, index) {
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dots = carousel.querySelectorAll('.dot');
    const current = parseInt(carousel.getAttribute('data-index'), 10) || 0;

    if (slides[current]) slides[current].classList.remove('active');
    if (dots[current]) dots[current].classList.remove('active');

    const next = (index + slides.length) % slides.length;

    if (slides[next]) {
      slides[next].classList.add('active');

      // Swap the blurred background to match the new photo
      const backdrop = carousel.querySelector('.carousel-backdrop');
      if (backdrop) {
        backdrop.style.backgroundImage =
          `url('${slides[next].getAttribute('src').replace(/'/g, '%27')}')`;
      }
    }
    if (dots[next]) dots[next].classList.add('active');

    carousel.setAttribute('data-index', next);
  }

  document.addEventListener('click', function (e) {
    const prevBtn = e.target.closest('.carousel-btn.prev');
    const nextBtn = e.target.closest('.carousel-btn.next');
    const dotBtn = e.target.closest('.dot');

    if (prevBtn) {
      const carousel = prevBtn.closest('.carousel-container');
      const current = parseInt(carousel.getAttribute('data-index'), 10) || 0;
      goToSlide(carousel, current - 1);
    } else if (nextBtn) {
      const carousel = nextBtn.closest('.carousel-container');
      const current = parseInt(carousel.getAttribute('data-index'), 10) || 0;
      goToSlide(carousel, current + 1);
    } else if (dotBtn) {
      const carousel = dotBtn.closest('.carousel-container');
      const dots = Array.from(carousel.querySelectorAll('.dot'));
      goToSlide(carousel, dots.indexOf(dotBtn));
    }
  });


  /* =========================================================
     LOAD PROJECTS FROM THE SHEET
     ---------------------------------------------------------
     MB.loadProjects() downloads the sheet and turns every row
     into a project object. Each page calls it and then decides
     what to show (index.html: everything; featured.html: only
     featured projects).

     It returns a "Promise": the page writes
       MB.loadProjects().then(projects => { ... })
     and the code inside .then() runs once the data arrives.
     If anything fails (no internet, sheet not shared publicly,
     bad link), the page's .catch() runs instead.
     ========================================================= */

  function loadProjects() {
    if (!SHEET_ID) {
      console.error('SHEET_URL does not look like a Google Sheets link:', MB.config.SHEET_URL);
    }

    return fetch(FULL_URL)
      .then(res => res.text())
      .then(text => {
        /*
          Google doesn't send plain JSON. It wraps it like this:
            /*O_o*\/
            google.visualization.Query.setResponse({ ...data... });
          substr(47) chops off the first 47 characters (the wrapper
          start) and slice(0, -2) chops off the ending ");",
          leaving just the { ...data... } part to parse.
        */
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows || [];

        /*
          In each row, row.c is the list of cells (c[0] = column A,
          c[1] = column B, ...) and .v is the cell's value. Empty
          cells come back as null, which is why the code uses "?."
          and "??" — they fall back to '' instead of crashing.

          Rows with no Project name return null and get dropped by
          .filter(Boolean) — that's how blank rows are ignored.

          To add a new column later: add it to the object below
          using cell(<column number>), counting A as 0.
        */

        // First pass over column C: learn which cells are whole category names
        const standaloneCats = findStandaloneCategories(
          rows.map(row => row.c[0]?.v ? row.c[2]?.v : '')
        );

        return rows
          .map(row => {
            const cell = i => (row.c[i]?.v ?? '').toString().trim();

            const title = cell(0);
            if (!title) return null;

            const featuredVal = row.c[3]?.v;
            const featured =
              featuredVal === true || String(featuredVal).toUpperCase() === 'TRUE';

            const project = {
              title,
              maker: cell(1),
              categories: splitCategories(row.c[2]?.v, standaloneCats),
              featured,
              overview: cell(4),
              scope: cell(5),
              materials: cell(6),
              fabrication: cell(7),
              outcome: cell(8),
              photoUrls: parseUrls(row.c[9]?.v),
              pageUrl: cell(10),
              slug: slugify(title)
            };

            project.score = contentScore(project);
            return project;
          })
          .filter(Boolean);
      });
  }

  /*
    Shown by a page when the sheet can't be loaded.
  */
  const LOAD_ERROR_HTML =
    '<div class="error-state">Unable to load project data. ' +
    'Please make sure the Google Sheet is shared with &ldquo;Anyone with the link.&rdquo;</div>';



  // Share with the page scripts
  MB.loadProjects = loadProjects;
  MB.makeCardEl = makeCardEl;
  MB.LOAD_ERROR_HTML = LOAD_ERROR_HTML;
})();
