/* =====================================================================
   logo.js — HEADER LOGO
   ---------------------------------------------------------------------
   Loads the logo in its own header bar above the banner.
   Edit the logo path and alt text in js/config.js.
   ===================================================================== */

(function () {
  'use strict';

  const { HEADER_LOGO } = MB.config;
  const logo = document.getElementById('siteLogo');

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
      console.warn('Header logo could not be loaded:', src);
    };
    img.src = src;
    img.alt = HEADER_LOGO.logoAlt || '';
    img.hidden = false;
  }

  setImage(logo, HEADER_LOGO.logoUrl);
})();
