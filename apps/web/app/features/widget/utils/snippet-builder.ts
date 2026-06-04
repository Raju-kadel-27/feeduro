export function buildSnippet(token: string, position: string, theme: string): string {
  return `<script>
  window.$fdyq = window.$fdyq || [];
  window.feediyo = window.feediyo || new Proxy({}, { get: (_, p) => (...a) => window.$fdyq.push([p, ...a]) });
  document.head.appendChild(Object.assign(document.createElement('script'), { src: 'https://feediyo.com/sdk/v1/fdy.js', async: true }));
  window.feediyo.init('${token}', { position: '${position}', theme: '${theme}' });
</script>`;
}

export function buildBoardInlineSnippet(embedToken: string, theme: string): string {
  return `<!-- Place this div where you want the board to appear -->
<div data-fdy-embed="${embedToken}" data-fdy-theme="${theme}" style="height:600px;"></div>
<script src="https://feediyo.com/sdk/v1/fdy.js" async></script>`;
}
