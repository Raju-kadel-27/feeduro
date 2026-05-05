import { GalleryVerticalEnd } from "lucide-react";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "Privacy Policy — Feediyo" },
    { name: "description", content: "How Feediyo collects, uses, and protects your data." },
  ];
}

const LAST_UPDATED = "April 30, 2025";
const CONTACT_EMAIL = "privacy@feediyo.com";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-sm">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Feediyo
          </Link>
          <Link
            to="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-10 text-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Who we are</h2>
            <p className="text-muted-foreground leading-relaxed">
              Feediyo ("we", "us", or "our") is a feedback management platform that helps product
              teams collect, organise, and act on user feedback. Our service is available at{" "}
              <a href="https://feediyo.com" className="text-primary hover:underline">
                feediyo.com
              </a>{" "}
              and through embeddable widgets installed on our customers' products.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This policy explains what personal data we collect, why we collect it, and your rights
              over it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Data we collect</h2>

            <h3 className="font-medium">Account and profile data</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you sign up — directly or through Google OAuth — we collect your name, email
              address, and profile picture. We use this solely to create and identify your account.
            </p>

            <h3 className="font-medium">Workspace and product data</h3>
            <p className="text-muted-foreground leading-relaxed">
              We store everything you create inside Feediyo: workspace names and settings, feedback
              boards, posts, comments, votes, changelog entries, roadmap items, team member records,
              and API tokens you generate.
            </p>

            <h3 className="font-medium">End-user data (submitted via widget or public board)</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you install the Feediyo widget on your product, your end-users may submit feedback
              through it. That feedback (post content, email if provided, votes, and comments) is
              stored in your Feediyo workspace. You are responsible for informing your own users
              that their submissions are processed by Feediyo. We act as a data processor for this
              category of data.
            </p>

            <h3 className="font-medium">Payment data</h3>
            <p className="text-muted-foreground leading-relaxed">
              We do not store credit card or bank details. Payments are handled directly by our
              payment processor — Dodo Payments. We only store your subscription plan,
              status, and billing period.
            </p>

            <h3 className="font-medium">Technical and usage data</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our infrastructure runs on Cloudflare Workers. Like any web service, we receive
              standard HTTP request data (IP address, browser type, referring URL) as part of
              serving requests. We use session cookies to keep you signed in.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. How we use your data</h2>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>To provide, operate, and maintain the Feediyo service</li>
              <li>To authenticate your identity (email/password or Google OAuth)</li>
              <li>To process subscription payments through Dodo Payments</li>
              <li>
                To send transactional emails you explicitly trigger — such as team invitation emails
              </li>
              <li>To enforce usage limits based on your subscription plan</li>
              <li>
                To diagnose errors and improve reliability — we may review logs that contain request
                metadata
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We do not use your data for advertising, and we do not sell or rent your data to third
              parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Legal basis for processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Where applicable (e.g. under GDPR), we process your personal data on the following
              legal bases:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>
                <span className="text-foreground font-medium">Contract performance</span> —
                processing necessary to create your account, deliver the service, and fulfil our
                subscription agreement with you
              </li>
              <li>
                <span className="text-foreground font-medium">Legitimate interests</span> —
                improving reliability, diagnosing errors, and preventing abuse, where these
                interests are not overridden by your rights
              </li>
              <li>
                <span className="text-foreground font-medium">Legal obligation</span> — retaining
                financial records as required by applicable law
              </li>
              <li>
                <span className="text-foreground font-medium">Consent</span> — where you have
                explicitly opted in (e.g. marketing communications, if any)
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Third-party services</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Service</th>
                    <th className="text-left py-2 pr-4 font-medium">Purpose</th>
                    <th className="text-left py-2 font-medium">Data shared</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4">Google</td>
                    <td className="py-2 pr-4">OAuth sign-in</td>
                    <td className="py-2">Name, email, profile picture</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">DodoPayments</td>
                    <td className="py-2 pr-4">Payment processing</td>
                    <td className="py-2">Email, subscription details</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Cloudflare</td>
                    <td className="py-2 pr-4">Hosting, CDN, DDoS protection</td>
                    <td className="py-2">All request traffic</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. International data transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Feediyo is hosted on Cloudflare's global infrastructure and uses MySQL-compatible
              database services. Your data may be stored and processed in the United States or other
              countries where our service providers operate.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Where data is transferred from the European Economic Area (EEA) or the United Kingdom
              to countries that have not received an adequacy decision, we rely on appropriate
              safeguards such as Standard Contractual Clauses (SCCs) approved by the European
              Commission, or transfers to service providers that participate in the EU-U.S. Data
              Privacy Framework (e.g. Dodo Payments, Cloudflare).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Cookies and sessions</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use a single session cookie to keep you authenticated. We do not use tracking
              cookies, analytics cookies, or third-party advertising cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Data retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account
              or workspace, we will permanently delete the associated data within 30 days, except
              where we are required to retain it for legal or financial record-keeping obligations
              (e.g. payment records, which may be retained for up to 7 years).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Your rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your account and associated data</li>
              <li>
                Export your workspace data in a portable format (available in Settings → Data &amp;
                Import)
              </li>
              <li>Object to or restrict certain processing</li>
              <li>Withdraw consent at any time where processing is based on consent</li>
              <li>
                Lodge a complaint with your local data protection authority (e.g. the ICO in the UK,
                or the supervisory authority in your EU member state)
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              To exercise any of these rights, email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Children's privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Feediyo is not directed at children under the age of 13. We do not knowingly collect
              personal data from children under 13. If you believe a child under 13 has provided us
              with personal data, please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              All data is transmitted over HTTPS. Passwords are hashed and never stored in plain
              text. API tokens are stored as hashed values. We apply access controls so that
              workspace data is only accessible to authenticated members of that workspace. No
              method of transmission or storage is 100% secure; we cannot guarantee absolute
              security but take commercially reasonable measures to protect your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">12. Business transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              If Feediyo is involved in a merger, acquisition, or sale of all or a portion of its
              assets, your personal data may be transferred as part of that transaction. We will
              notify you by email or a prominent notice in the app before your data is transferred
              and becomes subject to a different privacy policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">13. Data Processing Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you use Feediyo to process personal data on behalf of your own users (e.g. via the
              widget or public board), you may require a Data Processing Agreement (DPA) to satisfy
              your obligations under GDPR or similar regulations. Please contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              to request a DPA.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">14. Changes to this policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. We will notify you of material changes by
              email or by a notice in the app. The "Last updated" date at the top of this page
              always reflects the most recent revision.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or how we handle your data, please
              contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Feediyo</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
