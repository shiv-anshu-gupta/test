/**
 * Lazy-load MathJax only when needed
 * Improves initial page load performance by not loading MathJax until first use
 */

let mathJaxPromise = null;
let isMathJaxReady = false;

/**
 * Load MathJax on-demand (lazy loading)
 * @returns {Promise} Resolves when MathJax is ready
 */
export function loadMathJax() {
  if (isMathJaxReady) {
    console.log("[MathJax] ✅ Already loaded");
    return Promise.resolve(window.MathJax);
  }

  if (!mathJaxPromise) {
    console.log("[MathJax] 📥 Loading MathJax...");

    // ✅ Load from CDN dynamically
    mathJaxPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "mathjax-script";
      script.async = true;
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";

      script.onload = () => {
        console.log("[MathJax] ✅ Loaded successfully");

        // MathJax needs time to initialize
        if (window.MathJax?.startup) {
          window.MathJax.startup.promise.then(() => {
            console.log("[MathJax] ✅ Initialization complete");
            isMathJaxReady = true;
            resolve(window.MathJax);
          });
        } else {
          isMathJaxReady = true;
          resolve(window.MathJax);
        }
      };

      script.onerror = () => {
        console.error("[MathJax] ❌ Failed to load");
        reject(new Error("Failed to load MathJax"));
      };

      document.head.appendChild(script);
    });
  }

  return mathJaxPromise;
}

/**
 * Render LaTeX equations after MathJax is loaded
 * @param {HTMLElement} element - Element containing LaTeX
 * @returns {Promise} Resolves when rendering is complete
 */
export async function renderLatex(element) {
  try {
    // ✅ Load MathJax if not already loaded
    await loadMathJax();

    if (window.MathJax?.typesetPromise) {
      console.log("[MathJax] 🔄 Rendering LaTeX...");
      const startTime = performance.now();

      await window.MathJax.typesetPromise([element]);

      const elapsed = performance.now() - startTime;
      console.log(`[MathJax] ✅ Rendering complete in ${elapsed.toFixed(2)}ms`);
    }
  } catch (error) {
    console.error("[MathJax] ❌ Rendering failed:", error);
  }
}

/**
 * Check if MathJax is already loaded
 * @returns {boolean} True if MathJax is loaded and ready
 */
export function isMathJaxLoaded() {
  return isMathJaxReady && window.MathJax?.typesetPromise;
}
