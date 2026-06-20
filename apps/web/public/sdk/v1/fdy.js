(() => {
  var BASE_URL = "https://feediyo.com";

  var pendingIdentity = null;
  var inlineIframes = [];

  function sendPendingIdentity() {
    if (!pendingIdentity) return;
    for (var i = 0; i < inlineIframes.length; i++) {
      if (inlineIframes[i].contentWindow) {
        inlineIframes[i].contentWindow.postMessage(
          { type: "fdy:identify", data: pendingIdentity },
          BASE_URL,
        );
      }
    }
  }

  function embed(token, target, options) {
    options = options || {};
    var theme = options.theme || "auto";
    var container = typeof target === "string" ? document.querySelector(target) : target;
    if (!container) return;

    var f = document.createElement("iframe");
    f.src = BASE_URL + "/widget/" + token + "?mode=inline&theme=" + encodeURIComponent(theme);
    f.style.cssText = "width:100%;height:100%;border:none;display:block;";
    f.setAttribute("title", "Feedback");
    f.setAttribute("loading", "lazy");
    f.setAttribute("allow", "clipboard-write");
    f.addEventListener("load", function () {
      if (pendingIdentity && f.contentWindow) {
        f.contentWindow.postMessage({ type: "fdy:identify", data: pendingIdentity }, BASE_URL);
      }
    });
    container.style.overflow = "hidden";
    container.appendChild(f);
    inlineIframes.push(f);
  }

  function autoDetectEmbeds() {
    var containers = document.querySelectorAll("[data-fdy-embed]");
    for (var i = 0; i < containers.length; i++) {
      var el = containers[i];
      var token = el.getAttribute("data-fdy-embed");
      var theme = el.getAttribute("data-fdy-theme") || "auto";
      if (token) embed(token, el, { theme: theme });
    }
  }

  function identify(data) {
    pendingIdentity = data;
    sendPendingIdentity();
  }

  function setTheme(theme) {
    var msg = { type: "fdy:setTheme", theme: theme };
    for (var i = 0; i < inlineIframes.length; i++) {
      if (inlineIframes[i].contentWindow) {
        inlineIframes[i].contentWindow.postMessage(msg, BASE_URL);
      }
    }
  }

  function destroy() {
    for (var i = 0; i < inlineIframes.length; i++) {
      inlineIframes[i].remove();
    }
    inlineIframes = [];
  }

  // ─── Queue processing ────────────────────────────────────────────────────────

  var queue = Array.isArray(window.$fdyq) ? window.$fdyq.slice() : [];

  window.feeduro = { embed, identify, setTheme, destroy };

  // Auto-detect <... data-fdy-embed="TOKEN"> containers
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoDetectEmbeds);
  } else {
    autoDetectEmbeds();
  }

  window.$fdyq = {
    push: (args) => {
      var method = args[0];
      if (typeof window.feeduro[method] === "function") {
        window.feeduro[method].apply(null, args.slice(1));
      }
    },
  };

  for (var i = 0; i < queue.length; i++) {
    var call = queue[i];
    var method = call[0];
    if (typeof window.feeduro[method] === "function") {
      window.feeduro[method].apply(null, call.slice(1));
    }
  }
})();
