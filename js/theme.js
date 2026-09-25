(function () {
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

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

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
    toggle.addEventListener('click', function () {
      setTheme(theme === 'dark' ? 'light' : 'dark', true);
    });
  });
})();