import LegalPageLayout from "@/components/legal/LegalPageLayout";
import {
  ECOSYSTEM_NAME, ECOSYSTEM_SERVICES, MANAGED_BRANDS, CONNECTED_PLATFORMS,
  LEGAL_ENTITY_NAME, LEGAL_CONTACT_EMAIL,
} from "@/data/legal";

const Privacy = () => (
  <LegalPageLayout title="Privacy Policy">
    <section>
      <h2>1. Who this policy covers</h2>
      <p>
        This policy covers {ECOSYSTEM_NAME}, the public site, and its brand workspace, operated by{" "}
        {LEGAL_ENTITY_NAME}. {ECOSYSTEM_NAME} is made up of {ECOSYSTEM_SERVICES.length} services —{" "}
        {ECOSYSTEM_SERVICES.map((s) => s.name).join(", ")} — and manages one or more independent brands
        under Houcine.management. The brands currently managed are:
      </p>
      <ul>
        {MANAGED_BRANDS.map((b) => (
          <li key={b.name}>
            <strong className="text-foreground">{b.name}</strong> — {b.description}
          </li>
        ))}
      </ul>
      <p>More brands may be added over time; this policy applies to all of them.</p>
    </section>

    <section>
      <h2>2. Information you give us directly</h2>
      <h3>Booking and contact requests</h3>
      <p>
        When you submit a booking or contact request through the public site, we collect the information
        you provide in that form: your name, email address, and (if you choose to share it) phone number,
        along with details relevant to the request itself — such as event type, event date, and location
        for a booking — and any message you write. This is stored so the relevant brand's team can follow
        up with you, and a one-time notification email is sent to that brand's inbox when you submit.
      </p>
      <h3>Email updates</h3>
      <p>
        If you choose to subscribe for updates on one of our pages, we store the email address you provide
        and which page you subscribed from, so we know you'd like to hear from us.
      </p>
    </section>

    <section>
      <h2>3. Information collected automatically</h2>
      <p>
        We keep basic, first-party analytics on the public site — the pages you visit, a general device
        category (mobile, tablet, or desktop), and the page that referred you — to understand how the site
        is used. This isn't tied to your name or email; it's linked only to a randomly generated identifier
        stored in your browser's local storage (not a cookie), so we can avoid double-counting the same
        visit. This data stays on our own infrastructure — we don't use third-party advertising or
        cross-site tracking networks.
      </p>
      <p>
        Separately, the brand workspace may use an optional analytics tool (PostHog) to record how a
        brand's own admin team uses the workspace dashboard (for example, which internal pages they open).
        This only applies to workspace/admin usage, is off by default, and is unrelated to public site
        visitors.
      </p>
    </section>

    <section>
      <h2>4. If you're a brand admin: your workspace data</h2>
      <p>
        Workspace access is by invitation. We store your account email and name, and the brand(s) and role
        you've been granted — from basic viewing access up to full brand-admin control. Through the
        workspace, brand admins manage their brand's bookings, notifications, internal messages, and
        connected third-party accounts (below). Every brand's data is kept separate from every other
        brand's — see "Who can see what" below.
      </p>
    </section>

    <section>
      <h2>5. Connected third-party accounts</h2>
      <p>
        A brand admin can connect their brand's own social/music accounts to pull basic public-facing
        analytics into that brand's dashboard. Each platform is connected separately, on purpose, and only
        pulls what's listed below — nothing more:
      </p>
      <ul>
        {CONNECTED_PLATFORMS.map((p) => (
          <li key={p.name}>
            <strong className="text-foreground">{p.name}</strong> ({p.connectionMethod}) — {p.dataPulled}
          </li>
        ))}
      </ul>
      <p>
        This data is used only to show that brand's own connected-platform metrics on that brand's
        dashboard. We don't sell it, share it with other brands, or use it for advertising.
      </p>
      <h3>How the underlying access tokens are protected</h3>
      <p>
        The access tokens that let us read this data are stored in a database table that is completely
        walled off from the app itself: no user account, admin or otherwise, has a path to read it through
        the application — only trusted server-side functions, using a private key that never reaches your
        browser, can use them, and only to make the specific read-only calls listed above. The underlying
        database storage is encrypted at rest by our hosting provider. Connecting, reconnecting, and
        disconnecting an account is recorded in an internal activity log for accountability.
      </p>
    </section>

    <section>
      <h2>6. Who can see what</h2>
      <p>
        Access is role-based and brand-scoped, enforced at the database level (not just in the app's
        interface):
      </p>
      <ul>
        <li>A brand's own admins and team members can see that brand's bookings, messages, notifications, and connected-platform analytics — never another brand's.</li>
        <li>The platform's super admin can see across all brands, for operating the ecosystem as a whole.</li>
        <li>Site visitors and clients have no login and cannot see any brand's workspace data.</li>
      </ul>
    </section>

    <section>
      <h2>7. How long we keep data</h2>
      <p>
        Booking requests, contact submissions, subscriptions, and connected-platform data are kept until
        deleted by a brand admin, disconnected, or removed at your request (see below). We don't currently
        apply an automatic expiry to this data. The one exception is the short-lived, one-time security
        token generated while you connect a third-party account (used only to prevent tampering with that
        one connection attempt) — that expires automatically within minutes and is purged.
      </p>
    </section>

    <section>
      <h2>8. Your choices</h2>
      <ul>
        <li><strong className="text-foreground">Disconnect a platform:</strong> A brand admin can disconnect any connected platform at any time from Settings → Connected Accounts. This immediately stops that platform's data from refreshing and revokes our stored access to it.</li>
        <li><strong className="text-foreground">Request deletion or a copy of your data:</strong> If you submitted a booking, contact form, or subscribed for updates, you can ask us to delete or send you that information by contacting {LEGAL_CONTACT_EMAIL}.</li>
      </ul>
    </section>

    <section>
      <h2>9. Children's privacy</h2>
      <p>
        Our services are not directed at children, and we do not knowingly collect personal data from
        children.
      </p>
    </section>

    <section>
      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy as the service changes. We'll update the "Last updated" date above when
        we do.
      </p>
    </section>

    <section>
      <h2>11. Contact</h2>
      <p>
        Questions about this policy, or requests about your data, can be sent to {LEGAL_CONTACT_EMAIL}.
      </p>
    </section>
  </LegalPageLayout>
);

export default Privacy;
