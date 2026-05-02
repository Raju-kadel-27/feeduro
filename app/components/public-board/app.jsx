const { useState, useMemo, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  theme: "dark",
  accent: "violet",
  density: "comfortable",
  showSidebar: true,
} /*EDITMODE-END*/;

const ACCENTS = {
  violet: "262 83% 58%",
  blue: "221 83% 53%",
  emerald: "160 84% 39%",
  rose: "347 77% 50%",
  amber: "38 92% 50%",
};

// Seed data — mirrors screenshot
const FEEDBACK = [
  {
    id: 1,
    author: { name: "Sam Wilson", av: "av-1", initials: "SW" },
    board: { name: "Board 3", label: "Bugs" },
    title: "Fix login error on Safari",
    body: "When trying to log in using Safari on macOS, the page sometimes hangs after entering credentials. Works fine on Chrome.",
    status: "reviewing",
    comments: 2,
    likes: 3,
  },
  {
    id: 2,
    author: { name: "Alex Chen", av: "av-2", initials: "AC" },
    board: { name: "Board 1", label: "Features" },
    title: "Add dark mode",
    body: "It would be great to have a dark mode option. Working in low-light environments makes the bright interface uncomfortable. Many apps offer this now and it's becoming an expected feature.",
    status: "planned",
    comments: 2,
    likes: 3,
  },
  {
    id: 3,
    author: { name: "Sam Wilson", av: "av-1", initials: "SW" },
    board: { name: "Board 1", label: "Features" },
    title: "Faster page load times",
    body: "Some pages feel slow to load, especially when there's a lot of data. Would love to see performance improvements.",
    status: "pending",
    comments: 1,
    likes: 2,
  },
  {
    id: 4,
    author: { name: "Emily Roberts", av: "av-3", initials: "ER" },
    board: { name: "Board 1", label: "Features" },
    title: "Mobile-friendly interface",
    body: "The experience on mobile devices could be improved. Menus are hard to tap and some pages don't scale well on smaller screens.",
    status: "inprogress",
    comments: 1,
    likes: 2,
  },
];

const BOARDS = [
  { id: "all", name: "All Feedback", dot: "#ffffff" },
  { id: "b1", name: "Board 1 [ Features ]", dot: "#22c55e" },
  { id: "b2", name: "Board 2 [ Bugs ]", dot: "#ef4444" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Top nav
function TopNav({ tab, setTab }) {
  const tabs = ["Feedback", "Roadmap", "Updates"];
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <a href="#" className="flex items-center gap-2.5 group">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background text-[12px] font-bold">
              s
            </span>
            <span className="text-[14px] font-semibold tracking-tight">sasasa</span>
          </a>
          <nav className="flex items-center gap-1 ml-2">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "relative px-3 h-14 text-[13.5px] transition-colors",
                  tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
                {tab === t && (
                  <span className="absolute left-3 right-3 bottom-0 h-px bg-foreground" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search..."
              className="h-8 w-[220px] rounded-md border border-border bg-card/60 pl-8 pr-10 text-[12.5px] placeholder:text-muted-foreground focus:border-border focus:bg-card outline-none"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </div>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <BellIcon className="h-4 w-4" />
          </Button>
          <button className="h-8 w-8 rounded-full av-me ring-2 ring-background overflow-hidden grid place-items-center text-[11px] font-semibold text-white">
            U
          </button>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter row
function Filters({ active, toggle, sort, setSort }) {
  return (
    <div className="flex flex-wrap items-center gap-1 pb-1">
      {["pending", "reviewing", "planned", "inprogress", "completed", "closed"].map((id) => (
        <FilterChip key={id} id={id} active={active.has(id)} onClick={() => toggle(id)} />
      ))}
      <div className="mx-2 h-5 w-px bg-border" />
      <button
        onClick={() => setSort(sort === "top" ? "new" : "top")}
        className="inline-flex items-center gap-2 rounded-full border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 px-3 h-8 text-xs"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        <span className="capitalize">{sort}</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback card
function FeedbackCard({ item, onLike, onComment }) {
  const { author, board, title, body, status, comments, likes, liked } = item;
  return (
    <article className="group relative px-1 py-5">
      <div className="flex items-start gap-3.5">
        <Avatar className={author.av}>{author.initials}</Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="font-semibold text-foreground">{author.name}</span>
            <span className="text-muted-foreground">in</span>
            <BoardInline name={board.name} label={board.label} />
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-foreground">{title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>

          <div className="mt-3 flex items-center justify-between">
            <StatusPill id={status} />
            <div className="flex items-center gap-1">
              <button
                onClick={onComment}
                className="inline-flex items-center gap-1.5 rounded-md px-2 h-7 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/60"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{comments}</span>
              </button>
              <button
                onClick={onLike}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 h-7 text-[12px] hover:bg-muted/60",
                  liked ? "text-rose-400" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                <span>{likes}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
function Sidebar({ board, setBoard, onGiveFeedback }) {
  return (
    <aside className="w-[280px] shrink-0 pl-2">
      <Button className="w-full h-10 rounded-full" onClick={onGiveFeedback}>
        <Megaphone className="h-4 w-4" />
        Give Feedback
      </Button>

      <div className="mt-6">
        <div className="px-2 text-[11px] tracking-wider text-muted-foreground/80 uppercase">
          Boards
        </div>
        <ul className="mt-2 flex flex-col">
          {BOARDS.map((b) => {
            const active = board === b.id;
            return (
              <li key={b.id}>
                <button
                  onClick={() => setBoard(b.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] transition-colors",
                    active ? "bg-muted text-foreground" : "text-foreground/85 hover:bg-muted/60",
                  )}
                >
                  <SolidDot color={b.dot} />
                  <span className="truncate">{b.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-7">
        <div className="px-2 text-[11px] tracking-wider text-muted-foreground/80 uppercase">
          Actions
        </div>
        <ul className="mt-2 flex flex-col">
          <li>
            <button className="w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] text-foreground/80 hover:bg-muted/60 hover:text-foreground">
              <LinkIcon className="h-3.5 w-3.5" />
              Copy link
            </button>
          </li>
          <li>
            <button className="w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] text-foreground/80 hover:bg-muted/60 hover:text-foreground">
              <ShareIcon className="h-3.5 w-3.5" />
              Share
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating CTA
function CreateBoardFab() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
      <button className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/90 backdrop-blur px-4 h-9 text-[12.5px] text-foreground/90 shadow-lg shadow-black/40 hover:bg-card">
        <PlusIcon className="h-3.5 w-3.5" />
        Create your own board
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Give-feedback modal (lightweight)
function FeedbackModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [boardId, setBoardId] = useState("b1");
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-[92vw] rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Give feedback</h3>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon size={16}>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </Icon>
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Board
            </label>
            <select
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-ring/60"
            >
              <option value="b1">Board 1 — Features</option>
              <option value="b2">Board 2 — Bugs</option>
              <option value="b3">Board 3 — Bugs</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short, clear summary"
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-ring/60 placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Details
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What happened? What did you expect?"
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[13px] outline-none focus:border-ring/60 placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSubmit({ title, body, boardId });
              onClose();
            }}
            disabled={!title.trim()}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState("Feedback");
  const [active, setActive] = useState(new Set());
  const [sort, setSort] = useState("top");
  const [board, setBoard] = useState("all");
  const [items, setItems] = useState(() => FEEDBACK);
  const [modal, setModal] = useState(false);

  // Apply theme + accent + radius from tweaks
  useEffect(() => {
    const root = document.documentElement;
    if (tweaks.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.setProperty("--primary", ACCENTS[tweaks.accent] || ACCENTS.violet);
    root.style.setProperty("--ring", ACCENTS[tweaks.accent] || ACCENTS.violet);
  }, [tweaks.theme, tweaks.accent]);

  const toggle = (id) => {
    setActive((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtered = useMemo(() => {
    let list = items;
    if (active.size) list = list.filter((i) => active.has(i.status));
    if (board !== "all") {
      const want = board === "b1" ? "Board 1" : "Board 2";
      list = list.filter((i) => i.board.name === want);
    }
    if (sort === "new") list = [...list].reverse();
    return list;
  }, [items, active, board, sort]);

  const onLike = (id) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, liked: !i.liked, likes: i.likes + (i.liked ? -1 : 1) } : i,
      ),
    );
  const onComment = (id) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, comments: i.comments + 1 } : i)));

  const submit = (payload) => {
    const id = Math.max(...items.map((i) => i.id)) + 1;
    setItems((prev) => [
      {
        id,
        author: { name: "You", av: "av-me", initials: "U" },
        board:
          payload.boardId === "b2"
            ? { name: "Board 2", label: "Bugs" }
            : { name: "Board 1", label: "Features" },
        title: payload.title || "Untitled",
        body: payload.body || "",
        status: "pending",
        comments: 0,
        likes: 1,
        liked: true,
      },
      ...prev,
    ]);
  };

  const density =
    tweaks.density === "compact"
      ? "divide-y divide-border/60 [&>article]:py-3.5"
      : "divide-y divide-border/60";

  return (
    <div className="min-h-screen">
      <TopNav tab={tab} setTab={setTab} />

      <main className="mx-auto max-w-[1280px] px-6 pt-6 pb-32">
        <div className={cn("flex gap-10", !tweaks.showSidebar && "justify-center")}>
          {/* Feed column */}
          <section className="min-w-0 flex-1 max-w-[680px]">
            <Filters active={active} toggle={toggle} sort={sort} setSort={setSort} />

            <div className={cn("mt-2", density)}>
              {filtered.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  onLike={() => onLike(item.id)}
                  onComment={() => onComment(item.id)}
                />
              ))}
              {!filtered.length && (
                <div className="grid place-items-center py-20 text-sm text-muted-foreground">
                  No feedback matches the current filters.
                </div>
              )}
            </div>
          </section>

          {/* Sidebar */}
          {tweaks.showSidebar && (
            <Sidebar board={board} setBoard={setBoard} onGiveFeedback={() => setModal(true)} />
          )}
        </div>
      </main>

      <CreateBoardFab />
      <FeedbackModal open={modal} onClose={() => setModal(false)} onSubmit={submit} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance">
          <TweakRadio
            label="Theme"
            value={tweaks.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
          <TweakSelect
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            options={[
              { value: "violet", label: "Violet" },
              { value: "blue", label: "Blue" },
              { value: "emerald", label: "Emerald" },
              { value: "rose", label: "Rose" },
              { value: "amber", label: "Amber" },
            ]}
          />
          <TweakRadio
            label="Density"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakToggle
            label="Show sidebar"
            value={tweaks.showSidebar}
            onChange={(v) => setTweak("showSidebar", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
