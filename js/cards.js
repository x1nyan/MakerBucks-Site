/* =====================================================================
   cards.js — SHARED CARD CODE
   ---------------------------------------------------------------------
   Used by both featured.js and showcase.js. Load it AFTER config.js.

   What's in here:
     - project/category/photo helpers
     - card HTML for the front and expanded back
     - expanded flip behavior and photo carousel controls
     - generated CSV loading and parsing

   It adds these to window.MB for the page scripts to use:
    MB.loadProjects()   fetch and parse the CSV (returns a Promise)
    MB.makeCardEl(p)    build a card element for one project
    MB.LOAD_ERROR_HTML  project-data load error message
   Everything else stays private inside this file.
   ===================================================================== */

/** Define shared project parsing, card rendering, and interaction helpers. */
(function initializeCards() {
  'use strict';

  const { CSV_URL, MULTI_WORD_CATEGORIES } = MB.config;


  /* =========================================================
     HELPERS
     ========================================================= */

  /*
    escapeHtml: makes CSV project text safe to insert into the page.
    Without this, a cell containing "<" or a quote could break
    the HTML (or inject code). It swaps those characters for
    their harmless "&...;" versions, which display the same.
  */
  /** Escape HTML-sensitive characters before inserting project text into markup.
   * @param {string} str - Untrusted text from project content.
   * @returns {string} Safe HTML text that displays the original characters.
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|jfif|bmp|svg)(\?.*)?$/i;

  /*
    Photo paths come straight from the CMS-managed Photos column (one path
    per line), so the page just needs to clean up whitespace and put the
    photo named Cover first.
  */
  /** Trim a photo path and normalize Windows separators for browser URLs.
   * @param {string} value - Repository-relative photo path.
   * @returns {string} Normalized path.
   */
  function normalizePath(value) {
    return String(value || '').trim().replace(/\\/g, '/');
  }

  /** Drop duplicate photo paths; the build already puts the cover first.
   * @param {string[]} paths - Photo paths from one CSV cell.
   * @returns {string[]} Unique paths in their original order.
   */
  function sortPhotoPaths(paths) {
    return [...new Set(paths)];
  }

  /** Parse newline-separated CSV photo paths and discard unsupported suffixes.
   * @param {string} cellValue - Contents of one Photos CSV cell.
   * @returns {string[]} Valid photo URLs with Cover first.
   */
  function parsePhotoList(cellValue) {
    const paths = String(cellValue || '')
      .split('\n')
      /** Normalize each individual path before checking its extension. */
      .map(normalizePath)
      /** Keep non-empty paths that end in a recognized image extension. */
      .filter(value => value && IMAGE_EXTENSIONS.test(value));
    return sortPhotoPaths(paths);
  }

  const REQUIRED_PROJECT_FIELDS = [
    ['title', 'Project'],
    ['maker', 'Maker(s)'],
    ['overview', 'Overview'],
    ['scope', 'Scope'],
    ['materials', 'Materials'],
    ['fabrication', 'Fabrication Steps'],
    ['outcome', 'Outcome']
  ];

  /** List required fields absent from a normalized project record.
   * @param {object} project - Parsed project with normalized field names.
   * @returns {string[]} User-facing names of missing fields.
   */
  function getMissingProjectFields(project) {
    const missing = REQUIRED_PROJECT_FIELDS
      /** Find required properties whose values are blank. */
      .filter(([field]) => !String(project[field] || '').trim())
      /** Convert internal property names into readable labels. */
      .map(([, label]) => label);

    return missing;
  }

  /*
    CATEGORIES — READ STRAIGHT FROM THE CATEGORY COLUMN
    ---------------------------------------------------------
    The filter dropdown lists categories parsed from the generated
    CSV. Update the CMS options and CSV converter when adding one.

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
  /** Find category labels that appear as complete, comma-free CSV cells.
   * @param {string[]} cellValues - Category values from project rows.
   * @returns {Set<string>} Lowercase category labels known to be standalone.
   */
  function findStandaloneCategories(cellValues) {
    const standalone = new Set();
    /** Record each complete category without a comma separator. */
    cellValues.forEach(v => {
      const text = String(v || '').trim();
      if (text && !text.includes(',')) standalone.add(text.toLowerCase());
    });
    return standalone;
  }

  /** Split a category cell while preserving known comma-containing labels.
   * @param {string} cellValue - Category cell from the generated CSV.
   * @param {Set<string>} standalone - Known comma-free labels, lowercased.
   * @returns {string[]} Parsed category names, or General when empty.
   */
  function splitCategories(cellValue, standalone) {
    if (!cellValue) return ['General'];

    let text = String(cellValue);
    const found = [];

    // Manual overrides first (normally an empty list)
    /** Apply explicit overrides before parsing comma-separated pieces. */
    MULTI_WORD_CATEGORIES.forEach(name => {
      if (text.includes(name)) {
        found.push(name);
        text = text.split(name).join('');
      }
    });

    const pieces = text.split(',')
      /** Remove surrounding whitespace from each possible category. */
      .map(s => s.trim())
      /** Ignore empty pieces created by adjacent or trailing commas. */
      .filter(Boolean);
    let unknownRun = []; // consecutive pieces that aren't standalone categories

    /** Join consecutive unknown pieces back into one comma-containing name. */
    const flushUnknown = () => {
      if (unknownRun.length) found.push(unknownRun.join(', '));
      unknownRun = [];
    };

    /** Separate known labels and accumulate adjacent unknown label pieces. */
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
    const unique = [...new Map(
      /** Deduplicate labels case-insensitively while preserving their spelling. */
      found.map(c => [c.toLowerCase(), c])
    ).values()];
    return unique.length ? unique : ['General'];
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
  /** Score project detail and media completeness for default sorting.
   * @param {object} p - Normalized project record.
   * @returns {number} Score based on text length, steps, materials, and photos.
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

  /** Build the photo carousel or no-photo placeholder for a card.
   * @param {object} project - Normalized project record.
   * @returns {string} Markup for the card's media area.
   */
  function buildMediaHTML(project) {
    if (project.photoUrls.length > 0) {
      const slides = project.photoUrls
        .map(
          /** Render one image slide with an accessible project-specific label. */
          (url, i) =>
          `<img src="${escapeHtml(url)}"
                class="carousel-slide ${i === 0 ? 'active' : ''}"
                alt="${escapeHtml(project.title)} photo ${i + 1}"
                loading="lazy">`)
        .join('');

      const dots = project.photoUrls.length > 1
        ? `<ul class="carousel-dots">
            ${project.photoUrls.map(
              /** Render one accessible dot button for a carousel slide. */
              (_, i) =>
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
    These functions build card markup from template strings.
    Every project value from the CSV goes through escapeHtml first.
     ========================================================= */

  /*
    backSection: one labeled block on the back of the card.
    If a project value is empty, it shows emptyText in italics
    instead — or nothing at all if emptyText is ''.
  */
  /** Build one labeled detail section, optionally showing empty-state text.
   * @param {string} label - Section heading.
   * @param {string} value - Project content for the section.
   * @param {string} emptyText - Placeholder for empty content, or empty string.
   * @returns {string} Escaped section markup or an empty string.
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
    buildFrontHTML creates the tile face: photo, categories, maker,
    title, overview, and scope. Desktop CSS compacts this preview.
    Sections with no content are left out.
  */
  /** Build the compact front face for one project card.
   * @param {object} project - Normalized project record.
   * @returns {string} Escaped front-face markup.
   */
  function buildFrontHTML(project) {
    const catTags = project.categories
      .map(
        /** Render one escaped category label as a card tag. */
        c => `<span class="cat-tag">${escapeHtml(c)}</span>`
      )
      .join('');

    const frontOverview = project.overview
      ? `<p class="card-desc">${escapeHtml(project.overview)}</p>`
      : '';

    const frontScope = project.scope
      ? `<div class="section-label">Scope</div>
        <div class="section-text scope-text">${escapeHtml(project.scope)}</div>`
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
      left column:  Overview, Scope, Materials, Outcome
      right column: Fabrication Steps
  */
  /** Build the expanded detail face for one project card.
   * @param {object} project - Normalized project record.
   * @returns {string} Escaped detail-face markup.
   */
  function buildBackHTML(project) {
    return `
      <div class="card-face card-back">
        <div class="back-content">
          <div class="back-header">
            <div class="back-title">${escapeHtml(project.title)}</div>
            ${project.maker ? `<p class="back-meta">By: ${escapeHtml(project.maker)}</p>` : ''}
            <p class="back-hint">Click anywhere to close</p>
            <button class="back-close" type="button">Close details</button>
          </div>

          <div class="back-columns">
            <div>
              ${backSection('Overview', project.overview, '')}
              ${backSection('Scope', project.scope, '')}
              ${backSection('Materials', project.materials, 'No materials listed.')}
              ${backSection('Outcome', project.outcome, '')}
            </div>
            <div>
              ${backSection('Fabrication Steps', project.fabrication, 'No fabrication steps listed.')}
            </div>
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
    later, so filtering never has to look at the CSV again:

       data-categories  "robotics|electronics & hardware"
       data-featured    "1" or "0"
      data-search-text every project text field, lowercase, joined
             together — the search box just checks
                        whether this contains what you typed
     ========================================================= */

  /** Create a DOM card with search/filter metadata and its project record.
   * @param {object} project - Normalized project record.
   * @returns {HTMLDivElement} Card element ready to append to a grid or track.
   */
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

  let openState = null; // { card, expanded, overlay } while open
  let busy = false;

  /*
    getTargetBox: works out how big the enlarged card should be
    and where it goes (centered on screen).

    Width:  up to 1100px, but never wider than the screen.
    Height: exactly what the back needs to fit ALL its text.
            To find that out, the back is built invisibly
            off-screen at the target width and measured.
            (Only if a project is taller than the screen does
            the back fall back to scrolling.)
  */
  /** Measure and center the expanded card within the current viewport.
   * @param {object} project - Project whose detail content is measured.
   * @param {number} startHeight - Current card height, used as a minimum.
   * @returns {{width: number, height: number, left: number, top: number}} Target box.
   */
  function getTargetBox(project, startHeight) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = vw <= 700 ? 12 : 24;

    const width = Math.min(1100, vw - margin * 2);

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

  /** Apply a measured card box to an element using pixel dimensions.
   * @param {HTMLElement} el - Element to position and size.
   * @param {{width: number, height: number, left: number, top: number}} box - Target box.
   * @returns {void}
   */
  function setBox(el, box) {
    el.style.top = box.top + 'px';
    el.style.left = box.left + 'px';
    el.style.width = box.width + 'px';
    el.style.height = box.height + 'px';
  }

  /** Scale expanded details to fit, or allow vertical scrolling if too small.
   * @param {HTMLElement} expanded - Expanded card containing the back face.
   * @returns {void}
   */
  function fitBackContent(expanded) {
    const back = expanded.querySelector('.card-back');
    const content = back && back.querySelector('.back-content');
    if (!back || !content) return;

    const styles = getComputedStyle(back);
    const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const availableWidth = Math.max(0, back.clientWidth - paddingX);
    const availableHeight = Math.max(0, back.clientHeight - paddingY);

    const targetScaleY = availableHeight > 0 ? availableHeight / Math.max(content.scrollHeight, 1) : 1;
    const targetScaleX = availableWidth > 0 ? availableWidth / Math.max(content.scrollWidth, 1) : 1;
    const readableMinScale = 0.9;
    const scale = Math.min(1, Math.min(targetScaleX, targetScaleY, 1));

    const needsScroll = scale < readableMinScale;

    back.style.overflowY = needsScroll ? 'auto' : 'hidden';
    back.style.overflowX = 'hidden';

    if (needsScroll) {
      content.style.transform = 'none';
      content.style.width = '100%';
      return;
    }

    content.style.setProperty('--detail-scale', scale.toFixed(3));
    content.style.transform = `scale(${scale})`;
    content.style.width = `${100 / scale}%`;
  }

  /*
    Stop the page behind from scrolling while a card is open.
    Hiding the scrollbar would make the page jump sideways, so
    the scrollbar's width is added as padding to compensate.
  */
  /** Prevent background scrolling and compensate for the hidden scrollbar.
   * @returns {void}
   */
  function lockScroll() {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const pad = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.paddingRight = (pad + scrollbar) + 'px';
    document.body.style.overflow = 'hidden';
  }

  /** Restore the page's original scrolling styles after the card closes.
   * @returns {void}
   */
  function unlockScroll() {
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
  }

  /** Create and animate the accessible expanded view for a project card.
   * @param {HTMLDivElement} card - Original card to expand.
   * @returns {void}
   */
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
    const pageElements = [...document.body.children]
      /** Exclude the overlay and expanded card from background inertness. */
      .filter(element => element !== overlay && element !== expanded);
    /** Make each other page-level element unavailable while the dialog is open. */
    pageElements.forEach(element => { element.inert = true; });

    overlay.classList.add('show');
    setBox(expanded, target);
    expanded.classList.remove('settled');
    expanded.classList.add('flipped');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealDelay = prefersReducedMotion ? 0 : 320;

    /** Fit the detail text and focus its close button after the flip transition. */
    window.setTimeout(function settleExpandedCard() {
      fitBackContent(expanded);
      expanded.classList.add('settled');
      expanded.querySelector('.back-close')?.focus({ preventScroll: true });
    }, revealDelay);

    const titleButton = card.querySelector('.flip-title');
    if (titleButton) titleButton.setAttribute('aria-expanded', 'true');

    openState = { card, expanded, overlay, pageElements };
    busy = false;
    expanded.focus({ preventScroll: true });
  }

  /** Animate the expanded card closed and restore page interaction and focus.
   * @returns {void}
   */
  function closeCard() {
    if (!openState || busy) return;
    busy = true;

    const { card, expanded, overlay, pageElements } = openState;

    // Shrink back to wherever the original card is now, while flipping back.
    // Leave the expanded copy in place until the reverse transition completes,
    // otherwise the browser cancels the animation before it can play.
    const end = card.getBoundingClientRect();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const closeDelay = prefersReducedMotion ? 0 : 300;

    expanded.classList.remove('settled');
    expanded.classList.remove('flipped');
    setBox(expanded, end);
    overlay.classList.remove('show');

    /** Remove temporary elements and restore the original card after the flip. */
    window.setTimeout(function restoreOriginalCard() {
      expanded.remove();
      overlay.remove();
      card.classList.remove('is-open');
      /** Re-enable each page-level element after the modal closes. */
      pageElements.forEach(element => { element.inert = false; });
      unlockScroll();

      const titleButton = card.querySelector('.flip-title');
      if (titleButton) {
        titleButton.setAttribute('aria-expanded', 'false');
        titleButton.focus({ preventScroll: true });
      }

      openState = null;
      busy = false;
    }, closeDelay);
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
  /*
    A photo that fails to load (deleted, renamed, bad upload) is removed
    from its carousel; if none are left the card shows the placeholder.
    Error events don't bubble, so this listens in the capture phase.
  */
  /** Drop a broken carousel slide and keep the carousel consistent. */
  document.addEventListener('error', function handleBrokenSlide(e) {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('carousel-slide')) return;

    const carousel = img.closest('.carousel-container');
    if (!carousel) return;
    const slides = [...carousel.querySelectorAll('.carousel-slide')];
    const index = slides.indexOf(img);
    const wasActive = img.classList.contains('active');
    img.remove();
    carousel.querySelectorAll('.dot')[index]?.closest('li')?.remove();

    const remaining = carousel.querySelectorAll('.carousel-slide');
    if (!remaining.length) {
      carousel.outerHTML = '<div class="no-photo">Photos coming soon</div>';
      return;
    }
    if (remaining.length === 1) {
      carousel.querySelectorAll('.carousel-btn, .carousel-dots').forEach(el => el.remove());
    }
    if (wasActive) {
      remaining[0].classList.add('active');
      carousel.querySelectorAll('.dot')[0]?.classList.add('active');
      carousel.setAttribute('data-index', 0);
      const backdrop = carousel.querySelector('.carousel-backdrop');
      if (backdrop) {
        backdrop.style.backgroundImage =
          `url('${remaining[0].getAttribute('src').replace(/'/g, '%27')}')`;
      }
    } else {
      const activeIndex = [...remaining].findIndex(el => el.classList.contains('active'));
      carousel.setAttribute('data-index', Math.max(activeIndex, 0));
    }
  }, true);

  /** Delegate card clicks to open/close behavior while preserving text selection. */
  document.addEventListener('click', function handleCardClick(e) {
    if (e.target.closest('.carousel-btn') || e.target.closest('.dot')) return;

    const selection = window.getSelection();
    const selecting = selection && selection.toString().length > 0;

    if (openState) {
      if (selecting && openState.expanded.contains(selection.anchorNode)) return;
      closeCard();
      return;
    }

    // Every rendered card uses the same shared flip interaction.
    const card = e.target.closest('.card');
    if (!card) return;
    if (selecting && card.contains(selection.anchorNode)) return;

    openCard(card);
  });

  // Escape key closes an open card
  /** Close the open card with Escape and keep Tab focus on its close control. */
  document.addEventListener('keydown', function handleCardKeyboard(e) {
    if (e.key === 'Escape' && openState) closeCard();
    if (e.key === 'Tab' && openState) {
      const closeButton = openState.expanded.querySelector('.back-close');
      if (closeButton) {
        e.preventDefault();
        closeButton.focus();
      }
    }
  });

  // If the window is resized while open, re-center the card
  /** Re-measure an open card when viewport dimensions change. */
  window.addEventListener('resize', function repositionOpenCard() {
    if (!openState || busy) return;
    const target = getTargetBox(openState.card.project, 0);
    setBox(openState.expanded, target);
    fitBackContent(openState.expanded);
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

  /** Activate a carousel slide and update its dot and blurred backdrop.
   * @param {HTMLElement} carousel - Carousel container to update.
   * @param {number} index - Requested slide index; wraps at either end.
   * @returns {void}
   */
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

  /** Delegate carousel button and dot clicks to the matching slide update. */
  document.addEventListener('click', function handleCarouselClick(e) {
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
      LOAD PROJECTS FROM THE CSV
     ---------------------------------------------------------
    MB.loadProjects() downloads the generated CSV and turns every row
    into project objects. featured.js and showcase.js each call
     it and decide what to show.

     It returns a "Promise": the page writes
       MB.loadProjects().then(projects => { ... })
     and the code inside .then() runs once the data arrives.
    If the CSV cannot be fetched or parsed, the page's .catch()
    runs instead.
     ========================================================= */

  /*
    Both featured.js and showcase.js call MB.loadProjects(). The first
    call starts the download and saves the Promise here; the second
    call gets the same Promise back, so the CSV is only fetched once.
  */
  let loadPromise = null;

  /** Return the shared project-load promise, starting the request only once.
   * @returns {Promise<object[]>} Parsed and validated project records.
   */
  function loadProjects() {
    if (!loadPromise) loadPromise = fetchProjects();
    return loadPromise;
  }

  /** Parse CSV rows while preserving quoted commas and embedded newlines.
   * @param {string} text - CSV source text.
   * @returns {string[][]} Parsed rows and cells.
   */
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index++) {
      const character = text[index];

      if (inQuotes) {
        if (character === '"' && text[index + 1] === '"') {
          field += '"';
          index++;
        } else if (character === '"') {
          inQuotes = false;
        } else {
          field += character;
        }
      } else if (character === '"') {
        inQuotes = true;
      } else if (character === ',') {
        row.push(field);
        field = '';
      } else if (character === '\n') {
        row.push(field.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += character;
      }
    }

    if (field || row.length) {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
    }

    return rows;
  }

  /** Convert generated CSV text into validated normalized project records.
   * @param {string} text - Project CSV text.
   * @returns {Promise<object[]>} Parsed projects, including their sort scores.
   */
  function processCsvText(text) {
    const rows = parseCsv(text.replace(/^\uFEFF/, ''));
    if (!rows.length) return Promise.resolve([]);

    const headers = rows.shift().map(
      /** Normalize header names for case-insensitive column lookup. */
      header => header.trim().toLowerCase()
    );
    /** Find a CSV column index without depending on header capitalization. */
    const column = function findColumnIndex(name) {
      return headers.indexOf(name.toLowerCase());
    };
    const records = rows.map(
      /** Create a getter for the named cells in one CSV row. */
      function createRowGetter(row) {
        /** Read one trimmed-schema column from this row, defaulting to empty. */
        return function readRowValue(name) {
          return row[column(name)] || '';
        };
      }
    );
    const standaloneCats = findStandaloneCategories(
      records.map(
        /** Collect categories only from rows that represent a project. */
        get => get('project') ? get('category') : ''
      )
    );

    const projects = records.map(
      /** Normalize one CSV row; a malformed row is skipped, never fatal. */
      (get, index) => {
      try {
      const title = get('project').trim();
      if (!title) return null;

      const featuredValue = get('featured');
      const project = {
        title,
        maker: get('maker(s)'),
        categories: splitCategories(get('category'), standaloneCats),
        featured: String(featuredValue).toUpperCase() === 'TRUE',
        overview: get('overview'),
        scope: get('scope'),
        materials: get('materials'),
        fabrication: get('fabrication steps'),
        outcome: get('outcome'),
        photoUrls: parsePhotoList(get('photos'))
      };

      const missingFields = getMissingProjectFields(project);
      if (missingFields.length) {
        console.warn(
          `Skipping incomplete CSV row ${index + 2} (${title}): ` +
          missingFields.join(', ')
        );
        return null;
      }

      project.score = contentScore(project);
      return project;
      } catch (error) {
        console.warn(`Skipping malformed CSV row ${index + 2}:`, error);
        return null;
      }
      }
    ).filter(Boolean);

    return Promise.resolve(projects);
  }

  /** Fetch the project CSV, falling back to the generated embedded snapshot.
   * @returns {Promise<object[]>} Parsed project records.
   */
  function fetchProjects() {
    const embeddedCsv = window.MB && typeof window.MB.rawCsv === 'string'
      ? window.MB.rawCsv.trim()
      : '';

    if (window.location.protocol === 'file:' && embeddedCsv) {
      return processCsvText(embeddedCsv);
    }

    return fetch(CSV_URL)
      /** Use the response body or reject unsuccessful HTTP statuses. */
      .then(function readProjectResponse(res) {
        if (!res.ok) {
          if (embeddedCsv) return processCsvText(embeddedCsv);
          throw new Error(`Could not load ${CSV_URL}`);
        }
        return res.text();
      })
      /** Parse the live CSV; use the embedded snapshot if it is empty, unreadable, or has no valid projects. */
      .then(function parseProjectResponse(text) {
        if (!text || !text.trim()) {
          if (embeddedCsv) return processCsvText(embeddedCsv);
          return [];
        }
        let live;
        try {
          live = processCsvText(text);
        } catch (error) {
          live = Promise.reject(error);
        }
        return live.then(function keepNonEmpty(projects) {
          return projects.length || !embeddedCsv ? projects : processCsvText(embeddedCsv);
        });
      })
      /** Use the embedded snapshot after network or parsing failures. */
      .catch(function useEmbeddedProjectData(err) {
        if (embeddedCsv) return processCsvText(embeddedCsv);
        throw err;
      });
  }

  /*
    Shown by a page when project data can't be loaded.
  */
  const LOAD_ERROR_HTML =
    '<div class="error-state">Unable to load project data. ' +
    'Please make sure the local CSV file is available next to index.html.</div>';



  // Share with the page scripts
  MB.loadProjects = loadProjects;
  MB.makeCardEl = makeCardEl;
  MB.LOAD_ERROR_HTML = LOAD_ERROR_HTML;
  MB.parseCsv = parseCsv; // reused by footer.js to read DonorStatement.csv
})();
