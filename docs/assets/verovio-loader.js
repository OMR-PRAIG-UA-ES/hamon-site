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
          resolve(new window.verovio.toolkit());
        };
      };
      s.onerror = () => reject(new Error("failed to load Verovio from CDN"));
      document.head.appendChild(s);
    });
    return tkPromise;
  }

  const SCALE = 40;

  window.HamonVerovio = {
    /** Render a MusicXML or MEI string to an SVG string (page 1), or throw.
     *  `widthPx` is the target on-screen width: we set Verovio's pageWidth to match so
     *  the single system is engraved to fill that width (not a fixed size the browser
     *  then shrinks). Verovio auto-detects the input format, so a merged MEI renders
     *  like a realized MusicXML chart. */
    async render(musicxml, widthPx) {
      const tk = await load();
      const w = Math.max(700, Math.round((widthPx || 1100) * 100 / SCALE));
      tk.setOptions({
        pageWidth: w, scale: SCALE, adjustPageHeight: true, breaks: "none",
        footer: "none", header: "none",
        pageMarginLeft: 20, pageMarginRight: 20, pageMarginTop: 10, pageMarginBottom: 10,
      });
      tk.loadData(musicxml);
      if (tk.getPageCount() < 1) throw new Error("nothing to render");
      return tk.renderToSVG(1);
    },
  };
})();
