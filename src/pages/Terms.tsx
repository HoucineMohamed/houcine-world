import { Link } from "react-router-dom";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import {
  ECOSYSTEM_NAME, ECOSYSTEM_SERVICES, MANAGED_BRANDS, CONNECTED_PLATFORMS,
  LEGAL_ENTITY_NAME, GOVERNING_JURISDICTION, LEGAL_CONTACT_EMAIL,
} from "@/data/legal";

const Terms = () => (
  <LegalPageLayout title="Terms of Service">
    <section>
      <h2>1. What this service is</h2>
      <p>
        {ECOSYSTEM_NAME} is a multi-service ecosystem operated by {LEGAL_ENTITY_NAME}, made up of{" "}
        {ECOSYSTEM_SERVICES.map((s) => s.name).join(", ")}. Through Houcine.management, it also manages one
        or more independent creative brands, each with its own public presence and booking flow. The brands
        currently managed are:
      </p>
      <ul>
        {MANAGED_BRANDS.map((b) => (
          <li key={b.name}>
            <strong className="text-foreground">{b.name}</strong> — {b.description}
          </li>
        ))}
      </ul>
      <p>
        By using this site, submitting a booking or contact request, or using the brand workspace, you
        agree to these Terms.
      </p>
    </section>

    <section>
      <h2>2. Booking requests</h2>
      <p>
        Submitting a booking or contact request through this site is a <strong className="text-foreground">request</strong>,
        not a confirmed booking. It does not guarantee availability, pricing, or that the brand will accept
        it — a member of that brand's team will contact you directly using the details you provided to
        confirm (or decline) the request and work out any further arrangements.
      </p>
      <p>
        Cancellation, rescheduling, deposits, and payment terms are arranged directly between you and the
        brand you're booking, not through this site — we don't currently enforce or automate a
        cancellation/rescheduling policy here, so any such terms are whatever you and the brand agree to
        separately.
      </p>
    </section>

    <section>
      <h2>3. Acceptable use</h2>
      <p>When using this site or the brand workspace, you agree not to:</p>
      <ul>
        <li>Submit false, misleading, or fraudulent information in a booking, contact form, or subscription.</li>
        <li>Attempt to access another brand's workspace data, or any part of the workspace you haven't been granted access to.</li>
        <li>Use the site to send abusive, harassing, or unlawful content through any form or message.</li>
        <li>Interfere with the normal operation of the site or workspace, or attempt to circumvent its access controls.</li>
      </ul>
    </section>

    <section>
      <h2>4. Connected third-party accounts</h2>
      <p>
        The brand workspace lets a brand's own admin connect that brand's accounts on the following
        platforms to pull basic analytics into their dashboard: {CONNECTED_PLATFORMS.map((p) => p.name).join(", ")}.
        See our <Link to="/privacy">Privacy Policy</Link> for exactly what data is pulled from each.
      </p>
      <p>
        You may only connect an account you own or are otherwise authorized to manage on behalf of the
        brand — connecting a third-party account through this workspace is an affirmative act by that
        account's owner or authorized manager, whether done through that platform's own sign-in flow
        (OAuth) or by pasting an access token generated directly from that platform's own business tools.
        You can disconnect any connected account at any time from the workspace's Settings page, which
        stops us from reading further data from it.
      </p>
    </section>

    <section>
      <h2>5. Workspace accounts</h2>
      <p>
        Access to the brand workspace is invitation-based and role-based — you're responsible for keeping
        your workspace credentials secure, and for activity that happens under your account. Access levels
        range from basic viewing to full brand-admin control over a specific brand; only the platform's
        super admin has access across every brand.
      </p>
    </section>

    <section>
      <h2>6. Content and ownership</h2>
      <p>
        Each brand retains ownership of its own content, media, and the analytics data pulled from its
        connected accounts. The {ECOSYSTEM_NAME} site, workspace software, and their design remain the
        property of {LEGAL_ENTITY_NAME}.
      </p>
    </section>

    <section>
      <h2>7. Disclaimers</h2>
      <p>
        This site and workspace are provided "as is," without warranties of any kind. We don't guarantee
        that third-party platform integrations, analytics, or booking availability will always be accurate,
        uninterrupted, or error-free — third-party platforms can change or restrict their own APIs at any
        time, outside our control.
      </p>
    </section>

    <section>
      <h2>8. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {LEGAL_ENTITY_NAME} is not liable for any indirect,
        incidental, or consequential damages arising from your use of this site, the booking process, or
        the brand workspace.
      </p>
    </section>

    <section>
      <h2>9. Changes to these Terms</h2>
      <p>
        We may update these Terms as the service changes. We'll update the "Last updated" date above when
        we do; continuing to use the site or workspace after a change means you accept the updated Terms.
      </p>
    </section>

    <section>
      <h2>10. Governing law</h2>
      <p>These Terms are governed by the laws of {GOVERNING_JURISDICTION}.</p>
    </section>

    <section>
      <h2>11. Contact</h2>
      <p>Questions about these Terms can be sent to {LEGAL_CONTACT_EMAIL}.</p>
    </section>
  </LegalPageLayout>
);

export default Terms;
