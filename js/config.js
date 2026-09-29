/* =====================================================================
  config.js — SHARED SITE SETTINGS
   ---------------------------------------------------------------------
    This is the settings file for the generated project CSV and banner.

   It creates one global object, window.MB ("MakerBucks"), that the
   other scripts read from:
     MB.config  -> the settings below (this file)
     MB.*       -> card-building tools (added by cards.js)
   Keeping everything under one name avoids clashing with any other
   scripts on the page.
   ===================================================================== */

window.MB = window.MB || {};

/** Publish shared site settings for the browser modules. */
(function initializeConfig() {
  'use strict';

  /* =========================================================
     CONFIG
     ---------------------------------------------------------
    CSV_URL points to the generated project data file next to index.html.
      Pages CMS project forms are the editable source; a GitHub Action
      rebuilds this CSV from data/projects/.
     ========================================================= */

  const CSV_URL = 'MakerBucks_Database.csv';

  const PROJECT_SUBMISSION_FORM_URL = '';
  const MULTI_WORD_CATEGORIES = [];

  /* =========================================================
     TITLE BANNER
     ---------------------------------------------------------
     The banner at the top of the page. Each image can be:
       - a path to an image in this repo, e.g. 'images/banner.jpg'
         (relative to index.html), or
       - a full link to an image on GitHub, e.g.
         'https://raw.githubusercontent.com/<user>/<repo>/main/images/banner.jpg'
         or the github.com ".../blob/..." link from the file's page
         (the code adds "?raw=true" for you so it loads as an image).
    The header logo is configured separately under HEADER_LOGO.
     ========================================================= */

  const BANNER = {
    title: 'WPI MakerBucks Showroom',
    // Put your banner photos in a folder such as images/banner/
    // and add the relative paths here.
    
    
    imageUrls: [
      'images/Banner Photos/Banner.jfif',
      'images/Banner Photos/baner2.JPG',
      'images/Banner Photos/baner3.JPG',
      'images/Banner Photos/baner4.JPG'
    ],
    intervalMs: 7000
  };

  const HEADER_LOGO = {
    logoUrl: 'images/Website Assets/Gears-05.png',
    logoAlt: 'WPI MakerBucks logo'
  };

  // Share these with the other scripts
  MB.config = {
    BANNER,
    HEADER_LOGO,
    CSV_URL,
    PROJECT_SUBMISSION_FORM_URL,
    MULTI_WORD_CATEGORIES
  };
})();
