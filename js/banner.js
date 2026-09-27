/* =====================================================================
   banner.js — TITLE BANNER
   ---------------------------------------------------------------------
   Load order in index.html: config.js -> banner.js (-> the rest)

  Fills the banner at the top of index.html using BANNER settings from
  js/config.js: the rotating background photo and title text. The logo
  is loaded separately by logo.js into the centered header. Edit
  config.js to change banner settings; nothing in this file needs to change.
   ===================================================================== */

(function () {
  'use strict';

  const { BANNER } = MB.config;

  const heading = document.getElementById('bannerTitle');
  const photo = document.getElementById('bannerImg');
  const photoNext = document.getElementById('bannerImgNext');

  const imageUrls = Array.isArray(BANNER.imageUrls) && BANNER.imageUrls.length
    ? BANNER.imageUrls
    : [BANNER.imageUrl || 'images/Banner.jfif'];

  function toImageUrl(url) {
    const u = String(url || '').trim();
    if (/^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\//i.test(u) && !/[?&]raw=true/i.test(u)) {
      return u + (u.includes('?') ? '&' : '?') + 'raw=true';
    }
    return u;
  }

  function setImage(img, url) {
    const src = toImageUrl(url);
    if (!src) {
      img.hidden = true;
      return;
    }
    img.onerror = () => {
      img.hidden = true;
    };
    img.src = src;
    img.hidden = false;
  }

  if (BANNER.title) {
    heading.textContent = BANNER.title;
    document.title = BANNER.title;
  }

  if (!imageUrls.length) return;

  /*
    Picks the next image at random, avoiding an immediate repeat of the
    one currently showing (unless there's only one photo to choose from).
  */
  let lastIndex = -1;
  function pickNextUrl() {
    if (imageUrls.length === 1) return imageUrls[0];
    let index = Math.floor(Math.random() * imageUrls.length);
    if (index === lastIndex) index = (index + 1) % imageUrls.length;
    lastIndex = index;
    return imageUrls[index];
  }

  setImage(photo, pickNextUrl());

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (imageUrls.length < 2 || prefersReducedMotion) return;

  /*
    Rotates the banner photo every BANNER.intervalMs. Two stacked <img>
    elements crossfade: the hidden one loads the next photo, then swaps
    to visible (opacity 0 -> 1) while the current one fades out, per the
    .banner-img / .banner-img--next transition in showcase.css.
  */
  let active = photo;
  let hidden = photoNext;

  function rotate() {
    const src = toImageUrl(pickNextUrl());
    if (!src) return;

    const loader = new Image();
    loader.onload = () => {
      hidden.src = src;
      hidden.hidden = false;
      requestAnimationFrame(() => {
        hidden.classList.remove('banner-img--next');
        active.classList.add('banner-img--next');
        [active, hidden] = [hidden, active];
      });
    };
    loader.src = src;
  }

  setInterval(rotate, Number(BANNER.intervalMs) || 7000);
})();
