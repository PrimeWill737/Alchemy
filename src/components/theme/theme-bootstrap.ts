/** Runs before React; keep in sync with ThemeProvider localStorage key. */
export const THEME_STORAGE_KEY = "crm-theme";

export const THEME_BOOTSTRAP_INLINE = `
(function(){
  try {
    var k = ${JSON.stringify(THEME_STORAGE_KEY)};
    var t = localStorage.getItem(k);
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
      return;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
})();
`;
