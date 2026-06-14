export function CreateBoardFab() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
      <a
        href="https://feeduro.com"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/90 backdrop-blur px-4 h-9 text-[12.5px] text-foreground/90 shadow-lg shadow-black/20 hover:bg-card transition-colors"
      >
        Powered by Feeduro
      </a>
    </div>
  );
}
