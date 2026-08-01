export function buildBoardInlineSnippet(orgToken: string, boardSlug: string, theme: string): string {
  return `<!-- Place this div where you want the board to appear -->
<div data-fdy-embed="${orgToken}" data-fdy-board="${boardSlug}" data-fdy-theme="${theme}" style="height:600px;"></div>
<script src="https://feeduro.com/sdk/v1/fdy.js" async></script>`;
}
