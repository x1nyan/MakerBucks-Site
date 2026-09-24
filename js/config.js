/* =====================================================================
   config.js — SETTINGS SHARED BY BOTH PAGES
   ---------------------------------------------------------------------
   This is the ONLY file you need to edit to point the site at a
   different Google Sheet. Both index.html and featured.html load it.

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
     SHEET_URL: paste the Google Sheet's full link here, exactly
     as you copy it from the browser or the Share button, e.g.
       https://docs.google.com/spreadsheets/d/<id>/edit?usp=sharing

     The code pulls what it needs out of that link:
       - the spreadsheet ID (the long code after /d/)
       - the tab, if the link includes "gid=" (Google adds this
         when you copy the link while viewing a specific tab).
         With no gid, the first tab is used.
     ========================================================= */

  const SHEET_URL =
    'https://docs.google.com/spreadsheets/d/1A3suZI9d214BswXTqZHHBaLbkmP4bNgEHilgmp-g-8E/edit?usp=sharing';

  // The long code between "/d/" and the next "/"
  const SHEET_ID = (SHEET_URL.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/) || [])[1] || '';

  // The tab number after "gid=" (in the ?query or the #hash), if there is one
  const SHEET_GID = (SHEET_URL.match(/[?#&]gid=(\d+)/) || [])[1] || '';

  /*
    Optional: a tab NAME to read instead. Leave empty ('') to use
    the tab from the link (gid), or the first tab if there isn't one.
  */
  const SHEET_TITLE = '';

  /*
    Google Sheet columns:
    A = Project
    B = Maker(s)
    C = Category
    D = Featured
    E = Overview
    F = Scope
    G = Materials
    H = Fabrication Steps
    I = Outcome
    J = Photos
    K = Url
  */

  // A2:K = start at row 2 (skipping the header row), columns A through K.
  const SHEET_RANGE = 'A2:K';

  /*
    The "gviz/tq" address is Google's public query endpoint. Instead of
    the normal spreadsheet page, it returns just the cell data as JSON.
    tqx=out:json   -> ask for JSON
    sheet=... / gid=... -> which tab (SHEET_TITLE if set, else the
                           gid from the link, else the first tab)
    range=...      -> which cells
  */
  const FULL_URL =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json` +
    (SHEET_TITLE
      ? `&sheet=${encodeURIComponent(SHEET_TITLE)}`
      : (SHEET_GID ? `&gid=${SHEET_GID}` : '')) +
    `&range=${SHEET_RANGE}`;

  /*
    OPTIONAL manual override for category names that contain a
    comma. You normally DON'T need to touch this: the page works
    these out from the Category column on its own (see
    splitCategories below). Only add a name here if the automatic
    detection ever splits a category the wrong way.
  */
  const MULTI_WORD_CATEGORIES = [];



  // Share these with the other scripts
  MB.config = {
    SHEET_URL,
    SHEET_ID,
    FULL_URL,
    MULTI_WORD_CATEGORIES
  };
})();
