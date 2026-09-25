/* =====================================================================
   cards.js — SHARED CARD CODE
   ---------------------------------------------------------------------
   Used by both featured.js and showcase.js. Load it AFTER config.js.

   What's in here:
      - helpers that clean up CSV data (categories, photo folders, ...)
     - building a card's HTML (front + back)
     - the enlarged flip view (click a card -> it flips and grows)
     - the photo carousel arrows/dots
    - loading and parsing the local CSV

   It adds these to window.MB for the page scripts to use:
    MB.loadProjects()   download + parse the CSV (returns a Promise)
     MB.makeCardEl(p)    build a card element for one project
     MB.LOAD_ERROR_HTML  the red "couldn't load" message
   Everything else stays private inside this file.
   ===================================================================== */

(function () {
  'use strict';

  const { CSV_URL, MULTI_WORD_CATEGORIES } = MB.config;


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

  const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|jfif|bmp|svg)(\?.*)?$/i;

  /*
    Photo folders are relative to index.html. The static server exposes
    each folder as a small directory listing, so the carousel can use
    every image without storing remote URLs in the CSV.
  */
  function normalizePath(value) {
    return String(value || '').trim().replace(/\\/g, '/');
  }

  function sortPhotoPaths(paths) {
    return [...new Set(paths)].sort((a, b) => {
      const aCover = /(?:^|\/|\\)cover\.[^/\\]+$/i.test(a);
      const bCover = /(?:^|\/|\\)cover\.[^/\\]+$/i.test(b);
      if (aCover !== bCover) return aCover ? -1 : 1;
      return a.localeCompare(b);
    });
  }

  async function listFolderImagePaths(folderPath) {
    const value = normalizePath(folderPath).replace(/^\.\//, '').replace(/\/+$/, '');
    if (!value) return [];

    if (IMAGE_EXTENSIONS.test(value)) {
      return [value];
    }

    try {
      const response = await fetch(`${value}/`);
      if (response.ok) {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const paths = [...doc.querySelectorAll('a[href]')]
          .map(link => link.getAttribute('href'))
          .filter(Boolean)
          .filter(href => IMAGE_EXTENSIONS.test(href))
          .map(href => `${value}/${decodeURIComponent(href).split('/').pop()}`);

        if (paths.length) return sortPhotoPaths(paths);
      }
    } catch (error) {
      // A static server may not expose directory listings; we keep the rest of the code working.
    }

    const coverExtensions = [
      'jpg', 'JPG', 'png', 'PNG', 'jpeg', 'JPEG',
      'jfif', 'JFIF', 'webp', 'WEBP', 'avif', 'AVIF',
      'gif', 'GIF', 'bmp', 'BMP', 'svg', 'SVG'
    ];
    for (const extension of coverExtensions) {
      const coverPath = `${value}/Cover.${extension}`;
      try {
        const response = await fetch(coverPath, { method: 'HEAD' });
        if (response.ok) return [coverPath];
      } catch (error) {
        // Continue trying supported cover image extensions.
      }
    }
    return [];
  }

  async function parsePhotoFolder(folderPath) {
    const value = normalizePath(folderPath);
    if (!value) return [];

    if (IMAGE_EXTENSIONS.test(value)) {
      return [value];
    }

    return listFolderImagePaths(value);
  }

  const REQUIRED_PROJECT_FIELDS = [
    ['title', 'Project'],
    ['maker', 'Maker(s)'],
    ['overview', 'Overview'],
    ['scope', 'Scope'],
    ['materials', 'Materials'],
    ['fabrication', 'Fabrication Steps'],
    ['outcome', 'Outcome'],
    ['imageFolderPath', 'Image Folder Path']
  ];

  function getMissingProjectFields(project) {
    const missing = REQUIRED_PROJECT_FIELDS
      .filter(([field]) => !String(project[field] || '').trim())
      .map(([, label]) => label);

    if (!project.photoUrls.length && window.location.protocol !== 'file:') {
      missing.push('cover image');
    }
    return missing;
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
    const pageElements = [...document.body.children]
      .filter(element => element !== overlay && element !== expanded);
    pageElements.forEach(element => { element.inert = true; });

    overlay.classList.add('show');
    setBox(expanded, target);
    fitBackContent(expanded);
    expanded.classList.remove('settled');
    expanded.classList.add('flipped');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealDelay = prefersReducedMotion ? 0 : 260;

    window.setTimeout(() => {
      expanded.classList.add('settled');
      expanded.querySelector('.back-close')?.focus({ preventScroll: true });
    }, revealDelay);

    const titleButton = card.querySelector('.flip-title');
    if (titleButton) titleButton.setAttribute('aria-expanded', 'true');

    openState = { card, expanded, overlay, pageElements };
    busy = false;
    expanded.focus({ preventScroll: true });
  }

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

    window.setTimeout(() => {
      expanded.remove();
      overlay.remove();
      card.classList.remove('is-open');
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
  document.addEventListener('click', function (e) {
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
  document.addEventListener('keydown', e => {
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
  window.addEventListener('resize', () => {
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
      LOAD PROJECTS FROM THE CSV
     ---------------------------------------------------------
     MB.loadProjects() downloads the sheet and turns every row
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
    call gets the same Promise back, so the sheet is only fetched once.
  */
  let loadPromise = null;

  function loadProjects() {
    if (!loadPromise) loadPromise = fetchProjects();
    return loadPromise;
  }

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

  function processCsvText(text) {
    const rows = parseCsv(text.replace(/^\uFEFF/, ''));
    if (!rows.length) return Promise.resolve([]);

    const headers = rows.shift().map(header => header.trim().toLowerCase());
    const column = name => headers.indexOf(name.toLowerCase());
    const records = rows.map(row => name => row[column(name)] || '');
    const standaloneCats = findStandaloneCategories(
      records.map(get => get('project') ? get('category') : '')
    );

    return Promise.all(
      records.map(async (get, index) => {
        const title = get('project').trim();
        if (!title) return null;

        const featuredValue = get('featured');
        const imageFolderPath = get('image folder path').trim();
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
          imageFolderPath,
          photoUrls: await parsePhotoFolder(imageFolderPath)
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
      })
    ).then(items => items.filter(Boolean));
  }

  function fetchProjects() {
    const embeddedCsv = window.MB && typeof window.MB.rawCsv === 'string'
      ? window.MB.rawCsv.trim()
      : '';

    if (window.location.protocol === 'file:' && embeddedCsv) {
      return processCsvText(embeddedCsv);
    }

    return fetch(CSV_URL)
      .then(res => {
        if (!res.ok) {
          if (embeddedCsv) return processCsvText(embeddedCsv);
          throw new Error(`Could not load ${CSV_URL}`);
        }
        return res.text();
      })
      .then(text => {
        if (!text || !text.trim()) {
          if (embeddedCsv) return processCsvText(embeddedCsv);
          return [];
        }
        return processCsvText(text);
      })
      .catch(err => {
        if (embeddedCsv) return processCsvText(embeddedCsv);
        throw err;
      });
  }

  /*
    Shown by a page when the sheet can't be loaded.
  */
  const LOAD_ERROR_HTML =
    '<div class="error-state">Unable to load project data. ' +
    'Please make sure the local CSV file is available next to index.html.</div>';



  // Share with the page scripts
  MB.loadProjects = loadProjects;
  MB.makeCardEl = makeCardEl;
  MB.LOAD_ERROR_HTML = LOAD_ERROR_HTML;
})();
