/* =====================================================================
   footer.js — DONOR STATEMENT
   ---------------------------------------------------------------------
   Load order in index.html: cards.js -> footer.js

  Fills in the sponsor text at the bottom of the page from the generated
  DonorStatement.csv (edited through the Pages CMS "Footer" form). The
  paragraph's existing text stays put if the CSV can't be loaded.
   ===================================================================== */

/** Load the donor statement CSV and render its safe, formatted text. */
(function initializeFooter() {
  'use strict';

  const el = document.querySelector('.footer-sponsor');
  if (!el) return;

  const FOOTER_CSV_URL = 'DonorStatement.csv';

  /*
    Turns **bold** markers into <strong> tags. The rest of the text is
    escaped first so a statement can never inject HTML into the page.
  */
  /** Escape donor text and convert supported double-asterisk markers to bold.
   * @param {string} text - Donor statement from the CSV.
   * @returns {void}
   */
  function renderStatement(text) {
    const escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    el.innerHTML = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  /** Extract the Statement cell from the first data row of footer CSV text.
   * @param {string} csvText - Generated donor statement CSV.
   * @returns {string} The statement text, or an empty string if unavailable.
   */
  function readStatement(csvText) {
    const rows = MB.parseCsv(String(csvText || '').replace(/^\uFEFF/, ''));
    if (!rows.length) return '';

    const headers = rows[0].map(
      /** Normalize headers so the Statement column lookup ignores casing. */
      header => header.trim().toLowerCase()
    );
    const column = headers.indexOf('statement');
    if (column === -1 || !rows[1]) return '';
    return rows[1][column] || '';
  }

  /** Render a non-empty statement parsed from CSV text.
   * @param {string} csvText - Generated or embedded fallback CSV.
   * @returns {void}
   */
  function applyCsvText(csvText) {
    const statement = readStatement(csvText);
    if (statement) renderStatement(statement);
  }

  const embeddedCsv = window.MB && typeof window.MB.rawFooterCsv === 'string'
    ? window.MB.rawFooterCsv.trim()
    : '';

  if (window.location.protocol === 'file:' && embeddedCsv) {
    applyCsvText(embeddedCsv);
    return;
  }

  fetch(FOOTER_CSV_URL)
    /** Read a successful response, rejecting unsuccessful HTTP status codes. */
    .then(function readFooterResponse(res) {
      return res.ok ? res.text() : Promise.reject(new Error(`Could not load ${FOOTER_CSV_URL}`));
    })
    /** Use the embedded copy when the fetched CSV is empty. */
    .then(function applyFooterResponse(text) {
      return text && text.trim() ? applyCsvText(text) : applyCsvText(embeddedCsv);
    })
    /** Fall back to embedded donor text when the network request fails. */
    .catch(function useEmbeddedFooter() {
      applyCsvText(embeddedCsv);
    });
})();
