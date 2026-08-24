import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    q: "Do paid plans have a free trial?",
    a: "The Free Forever plan is your trial, with no time limit and no credit card. Use it as long as you need. When you're ready for more boards, integrations, or white-label, upgrading takes 30 seconds.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes, any time. Upgrade and you're charged the difference for the rest of the billing period. Downgrade or cancel and you keep everything until the period ends. No penalties, no awkward calls with sales.",
  },
  {
    q: "What happens if I hit my board limit on Starter?",
    a: "You'll be prompted to upgrade before creating the next board. Every board and post you already have stays fully accessible. We never hide your data or lock features you were already using.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes. 30-day money-back guarantee on all paid plans. If Feeduro isn't working for your team, email support.feeduro@gmail.com and you'll get a full refund. No forms, no waiting.",
  },
  {
    q: "Is my data secure?",
    a: "Encrypted at rest and in transit. GDPR compliant. We never sell or share your data with third parties. You can export your full workspace or delete it permanently at any time. Your data is yours.",
  },
  {
    q: "Do you offer discounts for startups or non-profits?",
    a: "Yes. Early-stage startups and registered non-profits get 50% off any paid plan. Just email support.feeduro@gmail.com with a short description of what you're building. We'll sort it out.",
  },
];

export function PricingFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">Common questions</h2>
      <div className="divide-y divide-border">
        {FAQS.map((faq, i) => (
          <div key={faq.q}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between py-4 text-left text-base font-medium"
            >
              {faq.q}
              <ChevronDownIcon
                className={`ml-4 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  open === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {open === i && (
              <p className="pb-5 text-base leading-relaxed text-muted-foreground">{faq.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
