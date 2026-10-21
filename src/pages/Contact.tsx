import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { ServicePageLayout, ServiceHero } from "@/components/service/ServicePage";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, SERVICE_EMAILS, contactMailto } from "@/config/contact";

// A plain contact page: mailto links built from src/config/contact.ts, one per service, plus the
// general address and public phone number. No form, no database, nothing sent by the site itself.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const SERVICE_ROWS = [
  { label: "General enquiries & administration", email: CONTACT_EMAIL },
  { label: "Houcine.tech", email: SERVICE_EMAILS.tech },
  { label: "Houcine.studio", email: SERVICE_EMAILS.studio },
  { label: "Houcine.management", email: SERVICE_EMAILS.management },
  { label: "Houcine.education", email: SERVICE_EMAILS.education },
  { label: "La Rosa View", email: SERVICE_EMAILS.larosaview },
] as const;

const Contact = () => (
  <ServicePageLayout>
    <ServiceHero
      icon={Mail}
      name="Contact"
      promise="Get in touch."
      intro="Each part of the ecosystem has its own address, so your message reaches the right place directly."
    />

    <section aria-labelledby="email-title" className="rounded-lg border border-border/50 bg-card/50 p-8 md:p-12">
      <h2 id="email-title" className="text-2xl md:text-3xl font-bold font-display text-foreground mb-6">
        Email
      </h2>
      <ul className="divide-y divide-border/50">
        {SERVICE_ROWS.map(({ label, email }) => {
          const href = contactMailto(email, `${label} enquiry`);
          return (
            <li key={label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4">
              <span className="text-foreground">{label}</span>
              {href ? (
                <a href={href} className={cn("text-accent underline hover:text-accent/80 rounded", focusRing)}>
                  {email}
                </a>
              ) : (
                <span className="text-muted-foreground">Contact details coming soon.</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>

    <section aria-labelledby="phone-title" className="rounded-lg border border-border/50 bg-card/50 p-8 md:p-12">
      <h2 id="phone-title" className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
        Phone
      </h2>
      <a
        href={`tel:${CONTACT_PHONE_TEL}`}
        className={cn("inline-flex items-center gap-2 text-lg text-foreground hover:text-accent transition-colors rounded", focusRing)}
      >
        <Phone className="w-5 h-5 text-accent" aria-hidden="true" />
        {CONTACT_PHONE_DISPLAY}
      </a>
    </section>

    <section aria-labelledby="bookings-title">
      <h2 id="bookings-title" className="text-2xl font-bold font-display text-foreground mb-4">
        DJ bookings
      </h2>
      <p className="text-muted-foreground">
        To book DJ La Rosa View, use the{" "}
        <Link to="/booking" className={cn("text-accent underline hover:text-accent/80 rounded", focusRing)}>
          booking request form
        </Link>
        .
      </p>
    </section>

    <section aria-labelledby="pricing-title">
      <h2 id="pricing-title" className="text-2xl font-bold font-display text-foreground mb-4">
        Pricing & payment
      </h2>
      <p className="text-muted-foreground">
        Prices across the ecosystem are starting prices in EUR or USD; final pricing depends on
        each project's scope. Accepted payment methods are Revolut and Société Générale.
      </p>
    </section>
  </ServicePageLayout>
);

export default Contact;
