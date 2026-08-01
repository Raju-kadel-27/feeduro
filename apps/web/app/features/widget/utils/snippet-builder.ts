export function buildBoardInlineSnippet(orgToken: string, boardSlug: string, theme: string): string {
  return `<!-- 1. Add this once inside your <head> -->
<script src="https://feeduro.com/sdk/v1/fdy.js" async></script>

<!-- 2. Place this div wherever you want the board to appear in <body> -->
<div
  data-fdy-embed="${orgToken}"
  data-fdy-board="${boardSlug}"
  data-fdy-theme="${theme}"
  style="height:600px;"
></div>`;
}
