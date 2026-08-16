type FaqItem = {
  question: string;
  answer: string;
};

const FAQS: FaqItem[] = [
  {
    question: "Why use Feeduro instead of bolting on Canny or Productboard?",
    answer:
      "Most tools treat feedback, roadmap, and changelog as separate products you stitch together yourself. Feeduro is all three in one loop — a request comes in, gets linked to a roadmap item, ships as a changelog entry, and the user who asked for it gets notified automatically. No tab-switching, no manual updates, no users left wondering if anyone read their post.",
  },
  {
    question: "How quickly will I see my first real piece of feedback?",
    answer:
      "Most teams collect their first submission within hours of going live. Add the widget to your app, share your board URL with a few users, and feedback starts flowing the same day. There are no onboarding calls, no week-long implementations — just paste a script tag and you're in.",
  },
  {
    question: "What exactly happens the moment I ship something a user asked for?",
    answer:
      "When you publish a changelog entry linked to a roadmap item, Feeduro automatically notifies every user who voted on the original request. They get told their feedback shipped — without you lifting a finger. That one touchpoint is one of the highest-leverage retention moves you can make, and it's fully automatic.",
  },
  {
    question: "Do you charge per seat as my team grows?",
    answer:
      "No — Feeduro charges per workspace, not per person. Bring in your entire product, support, and marketing team at no extra cost. The price you see is the price you pay, regardless of how many teammates you add.",
  },
  {
    question: "How does the in-app widget work?",
    answer:
      "The widget is a small JavaScript snippet you embed in your product. It opens a feedback panel in context — users never leave your app to submit ideas or check the roadmap. You can pass the user's identity to the widget so submissions are automatically tied to real accounts, not anonymous guests.",
  },
  {
    question: "Can I merge duplicate posts and pool their votes?",
    answer:
      "Yes. When similar requests come in from different users, you can merge them into a single post. All votes consolidate, all voters get notified as one group when the feature ships. No more splitting signal across five variations of the same request.",
  },
  {
    question: "Do users need an account to submit feedback or vote?",
    answer:
      "Your call. You can allow completely anonymous submissions — which tends to surface input from users who'd never bother to sign up. Or you can require authentication to keep feedback tied to known accounts. Either mode works, and you can change it at any time.",
  },
  {
    question: "Can I filter or segment feedback by customer plan or company?",
    answer:
      "Yes. When you pass user attributes through the widget or API, you can filter your board by plan tier, company size, or any custom property you track. That means you can separate enterprise requests from free-tier noise and weight decisions accordingly — not just by vote count.",
  },
  {
    question: "How do you handle spam or low-quality submissions?",
    answer:
      "You have full moderation control. Submissions can be held for review before going public, and you can set the board to private so only invited users can post. You can also require authentication, which eliminates most spam by itself. For the rare bad actor, individual posts and users can be removed instantly.",
  },
  {
    question: "What does migrating from another tool actually look like?",
    answer:
      "Faster than you'd expect. We'll help you bring over your existing posts and votes — reach out via the in-app chat and we'll walk through it together. Most teams finish in a single afternoon. Your data moves; your users don't notice a thing.",
  },
  {
    question: "Is there an API, and what can I actually do with it?",
    answer:
      "Feeduro has a full REST API and real-time webhooks. Common use cases: auto-creating posts from support tickets, syncing vote data to your data warehouse, triggering internal Slack alerts when a high-vote request crosses a threshold, or building internal tooling on top of your feedback data. If your workflow needs it, the API can handle it.",
  },
  {
    question: "Is Feeduro the right fit whether I'm early-stage or scaling?",
    answer:
      "It works at both ends. Early-stage founders use it to discover what users actually want before building the wrong thing. Growing teams use it to manage hundreds of requests a week without losing track of who asked for what. The feedback-roadmap-changelog loop scales with you — the same workflow that works at 50 users works at 50,000.",
  },
];

function FaqItem({ question, answer }: FaqItem) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-xl font-semibold text-foreground select-none marker:hidden [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform duration-200 group-open:rotate-45">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </summary>
      <p className="pb-7 text-lg leading-relaxed text-muted-foreground">{answer}</p>
    </details>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="py-24 px-6 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Frequently asked, plainly answered.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Setup, pricing, the widget, migration, and how feedback, roadmap, and changelog
            actually fit together.
          </p>
        </div>
        <div>
          {FAQS.map((item) => (
            <FaqItem key={item.question} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
