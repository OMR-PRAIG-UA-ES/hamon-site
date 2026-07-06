/* Verovio is loaded from CDN and used ONLY to paint an illustrative score.
   It never touches the HAMON data or the loss measurements (those are text,
   computed by hamonpy). If the CDN or rendering fails, callers fall back to
   text — the experiment is unaffected. */
(function () {
  const CDN = "https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js";
  let tkPromise = null;

  function load() {
    if (tkPromise) return tkPromise;
    tkPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CDN;
      s.async = true;
      s.onload = () => {
        if (!window.verovio || !window.verovio.module) { reject(new Error("verovio global missing")); return; }
        window.verovio.module.onRuntimeInitialized = () => {
          const tk = new window.verovio.toolkit();
          tk.setOptions({
            pageWidth: 2200, scale: 38, adjustPageHeight: true,
            footer: "none", header: "none", breaks: "auto",
            pageMarginLeft: 20, pageMarginRight: 20, pageMarginTop: 10, pageMarginBottom: 10,
          });
          resolve(tk);
        };
      };
      s.onerror = () => reject(new Error("failed to load Verovio from CDN"));
      document.head.appendChild(s);
    });
    return tkPromise;
  }

  window.HamonVerovio = {
    /** Render a MusicXML or MEI string to an SVG string (page 1), or throw.
     *  Verovio auto-detects the input format, so a merged MEI (real score + HAMON
     *  <harm>/<fb> overlay) renders the same way as a realized MusicXML chart. */
    async render(musicxml) {
      const tk = await load();
      tk.loadData(musicxml);
      if (tk.getPageCount() < 1) throw new Error("nothing to render");
      return tk.renderToSVG(1);
    },
  };
})();
