/* =====================================================================
   banner.js — TITLE BANNER
   ---------------------------------------------------------------------
   Load order in index.html: config.js -> banner.js (-> the rest)

   Fills the banner at the top of index.html using the settings in
   js/config.js (MB.config.BANNER): the background photo, the logo in
   the corner, and the title text. Edit config.js to change them;
   nothing in this file needs to change.
   ===================================================================== */

(function () {
  'use strict';

  const { BANNER } = MB.config;

  const heading = document.getElementById('bannerTitle');
  const photo = document.getElementById('bannerImg');

  const imageUrls = Array.isArray(BANNER.imageUrls) && BANNER.imageUrls.length
    ? BANNER.imageUrls
    : [BANNER.imageUrl || 'images/Banner.jfif'];

  function randomBannerImage() {
    if (!imageUrls.length) return '';
    const index = Math.floor(Math.random() * imageUrls.length);
    return imageUrls[index];
  }

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

  if (imageUrls.length > 0) {
    setImage(photo, randomBannerImage());
  }
})();
