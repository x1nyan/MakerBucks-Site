/** Apply the saved theme early and connect the header theme switch. */
(function initializeTheme() {
  'use strict';

  const STORAGE_KEY = 'makerbucks-theme';
  const root = document.documentElement;
  let theme = 'light';

  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') theme = savedTheme;
  } catch (error) {
    // Keep the page usable if browser storage is unavailable.
  }

  root.dataset.theme = theme;

  /** Connect the theme control after the page markup has been parsed. */
  document.addEventListener('DOMContentLoaded', function connectThemeControl() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    /** Apply a theme and optionally save the preference in browser storage.
     * @param {'light'|'dark'} nextTheme - Theme to apply.
     * @param {boolean} persist - Whether to save the selection.
     * @returns {void}
     */
    function setTheme(nextTheme, persist) {
      theme = nextTheme;
      root.dataset.theme = theme;
      toggle.setAttribute('aria-checked', String(theme === 'dark'));
      toggle.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

      if (persist) {
        try {
          window.localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
          // The selected theme still applies for this page view.
        }
      }
    }

    setTheme(theme, false);
    /** Toggle between light and dark themes when the switch is clicked. */
    toggle.addEventListener('click', function toggleTheme() {
      setTheme(theme === 'dark' ? 'light' : 'dark', true);
    });
  });
})();