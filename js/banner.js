/* =====================================================================
   banner.js — TITLE BANNER
   ---------------------------------------------------------------------
   Load order in index.html: config.js -> banner.js (-> the rest)

  Fills the banner at the top of index.html using BANNER settings from
  js/config.js: the rotating background photo and title text. The logo
  is loaded separately by logo.js into the centered header. Edit
  config.js to change banner settings; nothing in this file needs to change.
   ===================================================================== */

/** Initialize the banner from configuration and start rotation when appropriate. */
(function initializeBanner() {
  'use strict';

  const { BANNER } = MB.config;

  const heading = document.getElementById('bannerTitle');
  const photo = document.getElementById('bannerImg');
  const photoNext = document.getElementById('bannerImgNext');

  const imageUrls = Array.isArray(BANNER.imageUrls) && BANNER.imageUrls.length
    ? BANNER.imageUrls
    : [BANNER.imageUrl || 'images/Banner.jfif'];

  /** Convert GitHub blob URLs to raw image URLs; leave other URLs unchanged.
   * @param {string} url - Configured local or remote image URL.
   * @returns {string} URL suitable for an image element.
   */
  function toImageUrl(url) {
    const u = String(url || '').trim();
    if (/^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\//i.test(u) && !/[?&]raw=true/i.test(u)) {
      return u + (u.includes('?') ? '&' : '?') + 'raw=true';
    }
    return u;
  }

  /** Set an image element's source, hiding it when the URL is empty or fails.
   * @param {HTMLImageElement} img - Banner image element to update.
   * @param {string} url - Configured image URL.
   * @returns {void}
   */
  function setImage(img, url) {
    const src = toImageUrl(url);
    if (!src) {
      img.hidden = true;
      return;
    }
    /** On failure try the other configured images before hiding this layer. */
    const untried = imageUrls.filter(candidate => candidate !== url);
    img.onerror = function handleImageError() {
      const fallback = untried.shift();
      if (fallback === undefined) {
        img.onerror = null;
        img.hidden = true;
        return;
      }
      img.src = toImageUrl(fallback);
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
  /** Choose a banner image without repeating the immediately previous image.
   * @returns {string} The next configured image URL.
   */
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

  /** Load the next banner image and crossfade it into the visible layer.
   * @returns {void}
   */
  function rotate() {
    const src = toImageUrl(pickNextUrl());
    if (!src) return;

    const loader = new Image();
    /** Reveal the preloaded image and move the outgoing layer behind it. */
    loader.onload = function showLoadedBannerImage() {
      hidden.src = src;
      hidden.hidden = false;
      /** Give the visible, transparent layer a paint before starting the fade. */
      requestAnimationFrame(function prepareBannerCrossfade() {
        requestAnimationFrame(function startBannerCrossfade() {
          hidden.classList.remove('banner-img--next');
          active.classList.add('banner-img--next');
          [active, hidden] = [hidden, active];
        });
      });
    };
    loader.src = src;
  }

  setInterval(rotate, Number(BANNER.intervalMs) || 7000);
})();
