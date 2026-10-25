import { Link } from "react-router-dom";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import {
  ECOSYSTEM_NAME, CONNECTED_PLATFORMS, LEGAL_ENTITY_NAME, LEGAL_CONTACT_EMAIL,
} from "@/data/legal";

const DataDeletion = () => (
  <LegalPageLayout title="Data Deletion">
    <section>
      <h2>1. What this page covers</h2>
      <p>
        This page explains how to ask {LEGAL_ENTITY_NAME} to delete the personal data {ECOSYSTEM_NAME} holds
        about you, and how a brand admin can disconnect a connected account. It sits alongside our{" "}
        <Link to="/privacy">Privacy Policy</Link>, which describes what we collect and why.
      </p>
    </section>

    <section>
      <h2>2. How to ask for deletion</h2>
      <p>
        Send your request by email to {LEGAL_CONTACT_EMAIL}. Please include
        the email address you used with us and, if you can, which form or page you used (for example a
        booking request, a contact form or an email-updates sign-up), so we can find the right records. We
        may ask you to confirm that the address is yours before we delete anything.
      </p>
      <p>The same contact can be used to ask for a copy of your data or to correct it.</p>
    </section>

    <section>
      <h2>3. What can be deleted</h2>
      <ul>
        <li>Booking and contact requests you submitted, with the details you entered.</li>
        <li>Email-updates subscriptions (your address and the page you subscribed from).</li>
        <li>
          For brand workspace members: your workspace account (email and name) and your brand roles. Removing
          these ends your access to the workspace.
        </li>
        <li>
          Data pulled from a brand's connected accounts, for that brand, on request by one of its brand admins.
        </li>
      </ul>
      <p>
        Notification emails about your request that were already delivered to a brand's inbox are outside the
        database; we will delete our copies we can find, but cannot recall an email that was already sent.
      </p>
    </section>

    <section>
      <h2>4. Data kept only in your browser</h2>
      <p>
        The public site stores a random visitor identifier in your browser's local storage to count visits.
        Page-view records linked to that identifier are not linked to your name or email. You can remove the
        identifier at any time by clearing this site's data in your browser settings; a new random identifier
        is created on your next visit.
      </p>
    </section>

    <section>
      <h2>5. Disconnecting a connected account (brand admins)</h2>
      <p>
        A brand admin can disconnect any connected platform at any time in the brand workspace, under
        Settings, Connected Accounts. Disconnecting deletes the stored access tokens for that platform and
        stops any further data from being pulled; the connection then shows as disconnected. Figures that were
        already pulled before you disconnected can be deleted on request (section 2).
      </p>
      <p>
        You can also remove {ECOSYSTEM_NAME}'s access from the platform's own side, in that platform's account
        or app-permission settings. Platforms that can be connected today:
      </p>
      <ul>
        {CONNECTED_PLATFORMS.map((p) => (
          <li key={p.name}>{p.name}</li>
        ))}
      </ul>
      <p>
        For Meta Business Suite, the connection uses an access token that a brand admin created in Meta
        Business Manager; that token can also be revoked there.
      </p>
    </section>

    <section>
      <h2>6. What happens next</h2>
      <p>
        We will reply to the address you wrote from and tell you what was deleted. If some data must be kept
        (for example because the law requires it), we will tell you what and why.
      </p>
    </section>
  </LegalPageLayout>
);

export default DataDeletion;
