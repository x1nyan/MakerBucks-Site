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
  const banner = document.querySelector('.banner');
  const photo = document.getElementById('bannerImg');
  let photoNext = document.getElementById('bannerImgNext');

  if (!photoNext) {
    photoNext = document.createElement('img');
    photoNext.id = 'bannerImgNext';
    photoNext.className = 'banner-img banner-img--next';
    photoNext.alt = '';
    banner.appendChild(photoNext);
  }

  const imageUrls = Array.isArray(BANNER.imageUrls) && BANNER.imageUrls.length
    ? BANNER.imageUrls
    : [BANNER.imageUrl || 'images/Banner.jfif'];
  const intervalMs = Number(BANNER.intervalMs) || 5000;
  const fadeMs = Number(BANNER.fadeMs) || 2200;

  let currentIndex = 0;
  let timerId = null;
  let activePhoto = photo;
  let nextPhoto = photoNext;

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
      console.warn('Banner image could not be loaded:', src);
    };
    img.src = src;
    img.hidden = false;
  }

  function showSlide(index) {
    const nextUrl = imageUrls[index % imageUrls.length];
    const nextSrc = toImageUrl(nextUrl);

    if (!nextSrc) return;

    const nextImage = new Image();
    nextImage.onload = () => {
      nextPhoto.src = nextSrc;
      nextPhoto.hidden = false;
      nextPhoto.style.transition = `opacity ${fadeMs}ms ease-in-out`;
      activePhoto.style.transition = `opacity ${fadeMs}ms ease-in-out`;

      nextPhoto.style.opacity = '1';
      activePhoto.style.opacity = '0';

      setTimeout(() => {
        activePhoto.src = nextSrc;
        activePhoto.style.opacity = '1';
        nextPhoto.style.opacity = '0';

        const temp = activePhoto;
        activePhoto = nextPhoto;
        nextPhoto = temp;
      }, fadeMs);
    };
    nextImage.src = nextSrc;
  }

  function scheduleNext() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      currentIndex = (currentIndex + 1) % imageUrls.length;
      showSlide(currentIndex);
    }, intervalMs);
  }

  if (BANNER.title) {
    heading.textContent = BANNER.title;
    document.title = BANNER.title;
  }

  if (imageUrls.length > 0) {
    setImage(activePhoto, imageUrls[currentIndex]);
    activePhoto.style.opacity = '1';
    nextPhoto.style.opacity = '0';
    scheduleNext();
  }

  banner.addEventListener('mouseenter', () => clearInterval(timerId));
  banner.addEventListener('mouseleave', scheduleNext);
})();
