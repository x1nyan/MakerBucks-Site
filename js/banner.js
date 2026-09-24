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
  const logo = document.getElementById('bannerLogo');

  /*
    toImageUrl: GitHub has two kinds of links to a file.
      github.com/<user>/<repo>/blob/main/images/x.jpg
        -> opens a web PAGE about the file (won't work as an image)
      github.com/<user>/<repo>/blob/main/images/x.jpg?raw=true
        -> sends the actual image file
    If a "blob" link is missing "?raw=true", this adds it. Any other
    link or repo path (e.g. images/x.jpg) is left as it is.
  */
  function toImageUrl(url) {
    const u = String(url || '').trim();
    if (/^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\//i.test(u) && !/[?&]raw=true/i.test(u)) {
      return u + (u.includes('?') ? '&' : '?') + 'raw=true';
    }
    return u;
  }

  /*
    setImage: gives an <img> its link. If there's no link, or the
    image fails to load (wrong name, typo, not uploaded yet), the
    <img> is hidden so no broken-image icon shows. The banner still
    appears with its dark background and title.
  */
  function setImage(img, url) {
    const src = toImageUrl(url);
    if (!src) {
      img.hidden = true;
      return;
    }
    img.onerror = () => {
      img.hidden = true;
      console.warn('Banner image could not be loaded:', src);
    };
    img.src = src;
  }

  if (BANNER.title) {
    heading.textContent = BANNER.title;
    document.title = BANNER.title; // browser tab text too
  }

  setImage(photo, BANNER.imageUrl);
  setImage(logo, BANNER.logoUrl);
  logo.alt = BANNER.logoAlt || '';
})();
