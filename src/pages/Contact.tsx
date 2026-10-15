import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { ServicePageLayout, ServiceHero } from "@/components/service/ServicePage";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, contactMailto } from "@/config/contact";

// A plain contact page: one mailto link built from CONTACT_EMAIL (src/config/contact.ts).
// No form, no database, nothing sent by the site itself.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const Contact = () => {
  const href = contactMailto("Hello from Houcine.world");

  return (
    <ServicePageLayout>
      <ServiceHero
        icon={Mail}
        name="Contact"
        promise="Get in touch."
        intro="For a project with Houcine.tech, Houcine.studio, Houcine.education or Houcine.management, write an email."
      />

      <section aria-labelledby="email-title" className="rounded-lg border border-border/50 bg-card/50 p-8 md:p-12">
        <h2 id="email-title" className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
          Email
        </h2>
        {href ? (
          <>
            <p className="text-muted-foreground mb-6">
              Your email app opens with a new message to <span className="text-foreground">{CONTACT_EMAIL}</span>.
            </p>
            <a href={href} className={cn(buttonVariants({ size: "lg" }), "gap-2", focusRing)}>
              <Mail className="w-4 h-4" aria-hidden="true" />
              Write an email
            </a>
          </>
        ) : (
          <p className="text-muted-foreground">Contact details coming soon.</p>
        )}
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
    </ServicePageLayout>
  );
};

export default Contact;
