import { GalleryVerticalEnd } from "lucide-react";
import { Link } from "react-router";

export function meta() {
  return [
    { title: "Terms of Service — Feediyo" },
    { name: "description", content: "Terms governing your use of Feediyo." },
  ];
}

const LAST_UPDATED = "April 30, 2025";
const CONTACT_EMAIL = "support@feediyo.com";

export default function Terms() {
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-10 text-foreground">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Acceptance</h2>
            <p className="text-muted-foreground leading-relaxed">
              By creating an account or using the Feediyo service ("Service"), you agree to these
              Terms of Service ("Terms"). If you are using the Service on behalf of an organisation,
              you represent that you have authority to bind that organisation to these Terms.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. What Feediyo does</h2>
            <p className="text-muted-foreground leading-relaxed">
              Feediyo is a feedback management platform. It lets product teams create feedback
              boards, collect feature requests and bug reports from their users, manage a public
              changelog, and visualise work on a roadmap. Feedback can be collected through:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-muted-foreground">
              <li>
                A hosted public board at{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {"{workspace}"}.feediyo.com
                </code>
              </li>
              <li>A JavaScript widget embedded in your own product</li>
              <li>Your own custom domain (on eligible plans)</li>
              <li>The Feediyo REST API</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Accounts and workspaces</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate information when creating an account. You are responsible
              for maintaining the security of your account credentials and for all activity that
              occurs under your account. Notify us immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              if you suspect unauthorised access.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Each workspace has an owner (the person who created it) and may have additional team
              members with admin or member roles. The workspace owner is responsible for all
              activity within that workspace, including activity by invited members.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Acceptable use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-muted-foreground">
              <li>Use the Service for any illegal or unauthorised purpose</li>
              <li>Upload content that is defamatory, abusive, or infringes third-party rights</li>
              <li>
                Attempt to probe, scan, or test the vulnerability of the Service or circumvent any
                security measures
              </li>
              <li>Use the Service to transmit spam, malware, or any malicious code</li>
              <li>Resell or sublicense the Service without our prior written consent</li>
              <li>
                Use automated means to scrape or extract data beyond what the official API permits
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Subscriptions and payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              Feediyo offers a free plan and paid subscription plans (Starter and Professional).
              Paid plans are billed on a monthly or annual basis through DodoPayments.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Subscriptions auto-renew at the end of each billing period unless cancelled before the
              renewal date. You can cancel at any time from your workspace billing settings.
              Cancellation takes effect at the end of the current billing period — you retain access
              until then.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              All fees are exclusive of applicable taxes. We reserve the right to change pricing
              with at least 30 days notice to affected subscribers.
            </p>

            <h3 className="font-medium">Refunds</h3>
            <p className="text-muted-foreground leading-relaxed">
              We offer refunds within 7 days of initial payment for new subscriptions if the Service
              does not work as described and the issue cannot be resolved. Annual plan refunds after
              7 days are handled on a case-by-case basis. Contact{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              to request a refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Free plan</h2>
            <p className="text-muted-foreground leading-relaxed">
              The free plan is provided without charge and is subject to usage limits (such as the
              number of boards). We reserve the right to modify or discontinue free plan features
              with reasonable notice. We do not offer SLAs or guaranteed uptime commitments on the
              free plan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Widget and JavaScript SDK</h2>
            <p className="text-muted-foreground leading-relaxed">
              Feediyo provides a JavaScript snippet and SDK for embedding feedback collection into
              your product. By installing the widget, you grant Feediyo permission to serve the
              script and store feedback submitted through it. You are responsible for:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-muted-foreground">
              <li>Disclosing to your users that feedback is processed by Feediyo</li>
              <li>Obtaining any consents required by applicable law</li>
              <li>
                Keeping your widget token and signing secret confidential — do not expose these in
                public repositories or client-side code
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. API access</h2>
            <p className="text-muted-foreground leading-relaxed">
              API tokens grant programmatic access to your workspace. You are responsible for
              keeping your API tokens confidential. Do not embed tokens in public repositories or
              client-side code. Revoke compromised tokens immediately from Settings → API Tokens.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Your content</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all content you upload or create in Feediyo (feedback posts,
              changelogs, workspace settings, etc.). By using the Service, you grant Feediyo a
              limited, worldwide, royalty-free licence to store, process, and display your content
              solely for the purpose of providing the Service to you.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You represent that you have the right to upload any content you submit and that it
              does not violate any applicable law or third-party rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Intellectual property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Feediyo and its logo, design, and underlying software are the intellectual property of
              Feediyo. These Terms do not grant you any rights to use the Feediyo name, logo, or
              trademarks without our prior written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Service availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We aim for high availability but do not guarantee uninterrupted access to the Service.
              We may temporarily suspend access for maintenance, security incidents, or
              circumstances beyond our control. We will endeavour to provide advance notice of
              planned maintenance where possible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may delete your workspace at any time from account settings. We may suspend or
              terminate your access if you breach these Terms, with or without prior notice
              depending on the severity of the breach. Upon termination, your data will be deleted
              in accordance with our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">13. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless Feediyo and its team members from
              any claims, damages, losses, liabilities, costs, or expenses (including reasonable
              legal fees) arising from: (a) your use of the Service; (b) content you submit or
              transmit through the Service; (c) your violation of these Terms; or (d) your violation
              of any third-party rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">14. Disclaimers and limitation of liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" without warranties of any kind, express or implied. To
              the maximum extent permitted by law, Feediyo shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of (or inability
              to use) the Service, even if we have been advised of the possibility of such damages.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our total liability for any claim arising out of these Terms or your use of the
              Service shall not exceed the amount you paid to us in the 3 months preceding the
              claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">15. Governing law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of Nepal,
              without regard to conflict of law principles. Any disputes arising under these Terms
              shall be subject to the exclusive jurisdiction of the courts of Nepal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">16. Changes to these Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes at
              least 14 days in advance by email or in-app notice. Continued use of the Service after
              the effective date of updated Terms constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">17. General</h2>
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Severability.</span> If any provision of
              these Terms is found to be unenforceable, the remaining provisions will continue in
              full force and effect.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Entire agreement.</span> These Terms,
              together with our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              , constitute the entire agreement between you and Feediyo regarding the Service and
              supersede any prior agreements.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">No waiver.</span> Our failure to enforce
              any right or provision of these Terms will not be considered a waiver of those rights.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Assignment.</span> You may not assign or
              transfer these Terms without our prior written consent. We may assign our rights and
              obligations under these Terms without restriction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">18. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about these Terms? Reach us at{" "}
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
