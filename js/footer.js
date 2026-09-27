/* =====================================================================
   footer.js — DONOR STATEMENT
   ---------------------------------------------------------------------
   Load order in index.html: cards.js -> footer.js

  Fills in the sponsor text at the bottom of the page from the generated
  DonorStatement.csv (edited through the Pages CMS "Footer" form). The
  paragraph's existing text stays put if the CSV can't be loaded.
   ===================================================================== */

(function () {
  'use strict';

  const el = document.querySelector('.footer-sponsor');
  if (!el) return;

  const FOOTER_CSV_URL = 'DonorStatement.csv';

  /*
    Turns **bold** markers into <strong> tags. The rest of the text is
    escaped first so a statement can never inject HTML into the page.
  */
  function renderStatement(text) {
    const escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    el.innerHTML = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function readStatement(csvText) {
    const rows = MB.parseCsv(String(csvText || '').replace(/^\uFEFF/, ''));
    if (!rows.length) return '';

    const headers = rows[0].map(header => header.trim().toLowerCase());
    const column = headers.indexOf('statement');
    if (column === -1 || !rows[1]) return '';
    return rows[1][column] || '';
  }

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
    .then(res => (res.ok ? res.text() : Promise.reject(new Error(`Could not load ${FOOTER_CSV_URL}`))))
    .then(text => (text && text.trim()) ? applyCsvText(text) : applyCsvText(embeddedCsv))
    .catch(() => applyCsvText(embeddedCsv));
})();
