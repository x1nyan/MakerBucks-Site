/* =====================================================================
   config.js — SETTINGS SHARED BY BOTH PAGES
   ---------------------------------------------------------------------
  This is the settings file for the local CSV data and banner.

   It creates one global object, window.MB ("MakerBucks"), that the
   other scripts read from:
     MB.config  -> the settings below (this file)
     MB.*       -> card-building tools (added by cards.js)
   Keeping everything under one name avoids clashing with any other
   scripts on the page.
   ===================================================================== */

window.MB = window.MB || {};

(function () {
  'use strict';

  /* =========================================================
     CONFIG
     ---------------------------------------------------------
     CSV_URL points to the project data file next to index.html.
     PHOTO_ROOT is the folder containing one slug-named folder per
     project, with filenames listed in the CSV Photos column.
     ========================================================= */

  const CSV_URL = 'Makerbucks Database - Sheet1.csv';
  const PHOTO_ROOT = 'images/projects';

  /*
    OPTIONAL manual override for category names that contain a
    comma. You normally DON'T need to touch this: the page works
    these out from the Category column on its own (see
    splitCategories below). Only add a name here if the automatic
    detection ever splits a category the wrong way.
  */
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
     Leave logoUrl as '' to show no logo.
     ========================================================= */

  const BANNER = {
    title: 'WPI MakerBucks Showroom',
    // Put your banner photos in a folder such as images/banner/
    // and add the relative paths here.
    // Example:
    // images/banner/1.jpg,
    // images/banner/2.jpg,
    // images/banner/3.jpg
    
    //fix later won't interates too fast, want a slower fade in and out
    imageUrls: [
      'images/Banner.jfif'
    ],
    intervalMs: 7000,
    fadeMs: 3500
  };

  const HEADER_LOGO = {
    logoUrl: 'images/Gears-05.png',
    logoAlt: 'WPI MakerBucks logo'
  };

  // Share these with the other scripts
  MB.config = {
    BANNER,
    HEADER_LOGO,
    CSV_URL,
    PHOTO_ROOT,
    MULTI_WORD_CATEGORIES
  };
})();
