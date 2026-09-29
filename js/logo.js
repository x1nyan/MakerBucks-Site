/* =====================================================================
   logo.js — HEADER LOGO
   ---------------------------------------------------------------------
   Loads the logo in its own header bar above the banner.
   Edit the logo path and alt text in js/config.js.
   ===================================================================== */

/** Load the configured logo into the site header. */
(function initializeLogo() {
  'use strict';

  const { HEADER_LOGO } = MB.config;
  const logo = document.getElementById('siteLogo');

  /** Convert a GitHub blob URL into a browser-loadable raw image URL.
   * @param {string} url - Configured image path or URL.
   * @returns {string} Image URL with GitHub's raw query when needed.
   */
  function toImageUrl(url) {
    const u = String(url || '').trim();
    if (/^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\//i.test(u) && !/[?&]raw=true/i.test(u)) {
      return u + (u.includes('?') ? '&' : '?') + 'raw=true';
    }
    return u;
  }

  /** Set the logo image and accessible text, or hide it for an empty URL.
   * @param {HTMLImageElement} img - Header logo element.
   * @param {string} url - Configured logo image path or URL.
   * @returns {void}
   */
  function setImage(img, url) {
    const src = toImageUrl(url);
    if (!src) {
      img.hidden = true;
      return;
    }
    /** Hide the logo and report the failed URL if loading fails. */
    img.onerror = function handleLogoError() {
      img.hidden = true;
      console.warn('Header logo could not be loaded:', src);
    };
    img.src = src;
    img.alt = HEADER_LOGO.logoAlt || '';
    img.hidden = false;
  }

  setImage(logo, HEADER_LOGO.logoUrl);
})();
