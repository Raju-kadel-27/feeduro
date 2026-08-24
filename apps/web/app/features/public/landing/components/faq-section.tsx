import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQS: FaqItem[] = [
  {
    question: "Why use Feeduro instead of bolting on Canny or Productboard?",
    answer:
      "Because you're tired of copying feedback from one tool into a roadmap doc, then manually writing a changelog when something ships, then hoping users notice. Feeduro is one loop. Feedback comes in, links to your roadmap, ships as a changelog entry, and the user who asked gets notified. All without you touching anything between steps.",
  },
  {
    question: "How quickly will I see my first piece of real feedback?",
    answer:
      "Usually the same day you install the widget. Drop the script tag in, share your board URL with a handful of users, and submissions start appearing within hours. No onboarding calls, no implementation sprint. Paste, share, done.",
  },
  {
    question: "What exactly happens the moment I ship something a user asked for?",
    answer:
      "Something most SaaS teams never do automatically: the user gets told. The moment you publish a changelog entry tied to that feature, every person who voted on the original request gets a notification. They see it shipped. They feel heard. That's the moment users go from 'I sent feedback into a void' to 'these people actually listen.' One notification. Huge for retention.",
  },
  {
    question: "Do you charge per seat as my team grows?",
    answer:
      "No. One price per workspace, no matter how many people you invite. Add your product manager, your support lead, your designer, whoever needs to see what users are asking for. The number on the pricing page is the number you pay.",
  },
  {
    question: "How does the in-app widget work?",
    answer:
      "It's a script tag. Drop it in your app, pass in the current user's name and email if you want submissions tied to real accounts, and you're done. Users get a feedback panel that lives inside your product. They never bounce to an external URL. Their ideas stay in context, and so does your brand.",
  },
  {
    question: "Can I merge duplicate posts and pool their votes?",
    answer:
      "Yes, and it matters more than people expect. When five users ask for the same thing in slightly different words, their votes are split. Merge those posts and the signal consolidates. Now you see true demand. When it ships, all five get notified as one group. Nobody falls through the cracks.",
  },
  {
    question: "Do users need an account to submit feedback or vote?",
    answer:
      "Up to you. Anonymous mode gets you input from users who'd never bother creating an account but still have opinions worth hearing. Authenticated mode ties every post and vote to a real identity, which makes filtering by plan or company possible. Most teams start anonymous and switch once they want richer data.",
  },
  {
    question: "Can I filter or segment feedback by customer plan or company?",
    answer:
      "Yes. Pass user attributes through the widget and you can slice your board any way you want: free users vs. paying customers, small teams vs. enterprise, new signups vs. two-year loyalists. A feature request from a high-value customer stops getting buried under twenty votes from users who'll never pay.",
  },
  {
    question: "How do you handle spam or low-quality submissions?",
    answer:
      "You're in control. Boards can be public or private. Submissions can sit in a review queue before going live. Requiring authentication kills most spam on its own. For anything that slips through, posts and users can be removed instantly. In practice, feedback boards attract people who genuinely care about your product. Bad submissions are rarer than you'd think.",
  },
  {
    question: "What does migrating from another tool actually look like?",
    answer:
      "Honestly, pretty painless. Tell us where you're coming from and we'll help you move your posts and votes over. Most teams are fully live in an afternoon. Reach out via in-app chat and we'll walk you through it. Your users won't notice a thing.",
  },
  {
    question: "Is there an API, and what can I actually do with it?",
    answer:
      "Full REST API plus webhooks. Auto-create feedback posts from support tickets. Push vote counts into your data warehouse. Trigger a Slack alert when a high-priority request hits a threshold. Build internal dashboards on top of your feedback data. If your workflow touches feedback, the API can plug into it.",
  },
  {
    question: "Is Feeduro a good fit whether I'm early-stage or scaling fast?",
    answer:
      "It was built for both. Early on, it helps you stop guessing what to build and start hearing directly from the people using your product. As you scale, it helps you manage hundreds of requests without losing track of who asked for what or who needs to be notified when something ships. The same loop that works at 50 users is the one that works at 50,000.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            FAQ
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked, plainly answered.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Setup, pricing, the widget, migration, and how feedback, roadmap, and changelog
            actually fit together.
          </p>
        </div>

        <div className="divide-y divide-border">
          {FAQS.map((faq, i) => (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left text-base font-medium"
              >
                {faq.question}
                <ChevronDownIcon
                  className={`ml-4 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <p className="pb-5 text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
