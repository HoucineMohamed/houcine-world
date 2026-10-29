// Boot watchdog (docs/fallback.md). A plain script loaded by index.html just before the app's own script.
// If the app cannot start at all -- its main script fails to download, or it fails before drawing anything --
// the page would stay empty. In that case only, the visitor is sent to /maintenance.html, a self-contained
// page, with the address they asked for so "Try again" brings them back. Once the app has drawn anything, this
// does nothing: errors inside the running app are handled by its own error boundaries (src/main.tsx and
// src/components/PublicShell.tsx). Nothing is logged or sent anywhere.
(function () {
  "use strict";
  var root = document.getElementById("root");
  if (!root) return;
  var done = false;

  function mounted() {
    return root.childElementCount > 0;
  }

  function fallback() {
    if (done || mounted()) return;
    done = true;
    var here = location.pathname + location.search + location.hash;
    location.replace("/maintenance.html?return=" + encodeURIComponent(here));
  }

  // The app's own main script (or a module it needs at start) could not be downloaded or run. Only files of
  // this site count: a failing outside script (analytics, a browser extension) never sends anyone away.
  window.addEventListener(
    "error",
    function (event) {
      var t = event.target;
      if (!t || t === window || done || mounted()) return;
      var own = (t.src || t.href || "").indexOf(location.origin + "/") === 0;
      var entry = (t.tagName === "SCRIPT" && t.type === "module") || (t.tagName === "LINK" && t.rel === "modulepreload");
      if (own && entry) setTimeout(fallback, 1000);
    },
    true,
  );

  // Last safety net: the page and its scripts have loaded (so the app has run) and, a few seconds later, it has
  // still drawn nothing: it failed while starting.
  window.addEventListener("load", function () {
    setTimeout(fallback, 6000);
  });
})();
