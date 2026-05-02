(() => {
  var BASE_URL = "https://feediyo.com";
  var PANEL_ID = "fdy-panel";
  var BTN_ID = "fdy-btn";

  var iframeEl = null;
  var panelEl = null;
  var btnEl = null;
  var isOpen = false;
  var pendingIdentity = null;
  var initialized = false;

  // ─── Styles ─────────────────────────────────────────────────────────────────

  function buildStyles(position) {
    var side = position === "left" ? "left" : "right";
    return [
      "#" + PANEL_ID + "{",
      "position:fixed;",
      side + ":20px;",
      "bottom:88px;",
      "width:380px;",
      "height:580px;",
      "z-index:2147483646;",
      "border-radius:12px;",
      "overflow:hidden;",
      "box-shadow:0 8px 32px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.08);",
      "border:1px solid rgba(0,0,0,0.09);",
      "transform:translateY(16px) scale(0.97);",
      "opacity:0;",
      "pointer-events:none;",
      "transition:transform 0.22s cubic-bezier(0.16,1,0.3,1),opacity 0.18s ease;",
      "}",
      "#" + PANEL_ID + ".fdy-open{",
      "transform:translateY(0) scale(1);",
      "opacity:1;",
      "pointer-events:auto;",
      "}",
      "#" + BTN_ID + "{",
      "position:fixed;",
      side + ":20px;",
      "bottom:20px;",
      "width:52px;",
      "height:52px;",
      "border-radius:50%;",
      "background:#6d28d9;",
      "border:none;",
      "cursor:pointer;",
      "z-index:2147483647;",
      "box-shadow:0 4px 16px rgba(109,40,217,0.38);",
      "display:flex;",
      "align-items:center;",
      "justify-content:center;",
      "padding:0;",
      "transition:transform 0.15s ease,box-shadow 0.15s ease,background 0.15s ease;",
      "}",
      "#" + BTN_ID + ":hover{",
      "transform:scale(1.07);",
      "box-shadow:0 6px 22px rgba(109,40,217,0.5);",
      "}",
      "#" + BTN_ID + ":active{transform:scale(0.97);}",
    ].join("");
  }

  var SVG_CHAT =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
  var SVG_CLOSE =
    '<svg width="20" height="20" viewBox="0 0 24 24" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  // ─── Core ────────────────────────────────────────────────────────────────────

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      panelEl.classList.add("fdy-open");
      btnEl.innerHTML = SVG_CLOSE;
      btnEl.setAttribute("aria-label", "Close feedback");
    } else {
      panelEl.classList.remove("fdy-open");
      btnEl.innerHTML = SVG_CHAT;
      btnEl.setAttribute("aria-label", "Open feedback");
    }
  }

  function sendPendingIdentity() {
    if (pendingIdentity && iframeEl && iframeEl.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: "fdy:identify", data: pendingIdentity }, BASE_URL);
    }
  }

  function init(token, options) {
    if (initialized) return;
    initialized = true;

    options = options || {};
    var position = options.position === "left" ? "left" : "right";
    var theme = options.theme || "auto";

    // Inject styles
    var styleEl = document.createElement("style");
    styleEl.id = "fdy-styles";
    styleEl.textContent = buildStyles(position);
    document.head.appendChild(styleEl);

    // Build iframe panel
    panelEl = document.createElement("div");
    panelEl.id = PANEL_ID;
    panelEl.setAttribute("role", "dialog");
    panelEl.setAttribute("aria-label", "Feedback");

    iframeEl = document.createElement("iframe");
    iframeEl.src = BASE_URL + "/widget/" + token + "?theme=" + encodeURIComponent(theme);
    iframeEl.style.cssText =
      "width:100%;height:100%;border:none;display:block;background:transparent;";
    iframeEl.setAttribute("title", "Feedback");
    iframeEl.setAttribute("loading", "lazy");
    iframeEl.setAttribute("allow", "clipboard-write");
    iframeEl.addEventListener("load", sendPendingIdentity);

    panelEl.appendChild(iframeEl);
    document.body.appendChild(panelEl);

    // Build trigger button
    btnEl = document.createElement("button");
    btnEl.id = BTN_ID;
    btnEl.setAttribute("aria-label", "Open feedback");
    btnEl.setAttribute("aria-haspopup", "dialog");
    btnEl.innerHTML = SVG_CHAT;
    btnEl.addEventListener("click", toggle);
    document.body.appendChild(btnEl);

    // Close panel when pressing Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) toggle();
    });
  }

  function identify(data) {
    pendingIdentity = data;
    sendPendingIdentity();
  }

  // ─── Queue processing ────────────────────────────────────────────────────────

  var queue = Array.isArray(window.$fdyq) ? window.$fdyq.slice() : [];

  window.feediyo = { init: init, identify: identify };

  // Make future calls via the still-existing proxy hit the real functions
  window.$fdyq = {
    push: (args) => {
      var method = args[0];
      if (typeof window.feediyo[method] === "function") {
        window.feediyo[method].apply(null, args.slice(1));
      }
    },
  };

  for (var i = 0; i < queue.length; i++) {
    var call = queue[i];
    var method = call[0];
    if (typeof window.feediyo[method] === "function") {
      window.feediyo[method].apply(null, call.slice(1));
    }
  }
})();
