import { BookOpen, Construction } from "lucide-react";
import {
  ServicePageLayout, ServiceHero, ServiceSection, ContactCta,
} from "@/components/service/ServicePage";
import { SERVICE_EMAILS, PAYMENT_POLICY_TEXT } from "@/config/contact";

// Houcine.education, rebuilt as a restrained, honest under-construction page (program: master
// redesign, section 11). The previous version was a full mock digital-bookstore -- shopping cart,
// checkout flow, and fabricated reviews -- all removed: no fake purchase flow, no invented courses,
// students or testimonials while the service isn't launched.

const Reads = () => (
  <ServicePageLayout>
    <ServiceHero
      icon={BookOpen}
      name="Houcine.education"
      promise="An educational service, in development."
      intro="Houcine.education is being built as a curated resource for learners exploring technology, design and business. It is not yet open."
    />

    <ServiceSection id="status" title="Status">
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <Construction className="w-8 h-8 text-accent mx-auto mb-4" aria-hidden="true" />
        <p className="text-lg font-semibold text-foreground mb-1">Under construction</p>
        <p className="text-muted-foreground max-w-md mx-auto">
          There is nothing to browse or buy here yet. No courses, enrollment, reviews or
          purchases are available while this service is being built.
        </p>
      </div>
    </ServiceSection>

    <ServiceSection id="pricing" title="When it launches">
      <p className="text-muted-foreground max-w-xl">{PAYMENT_POLICY_TEXT} Nothing is available
        to purchase yet, and no launch date is set.
      </p>
    </ServiceSection>

    <ContactCta
      title="Want to know when it launches?"
      text="Get in touch and we'll let you know once Houcine.education is ready."
      subject="Houcine.education enquiry"
      email={SERVICE_EMAILS.education}
    />
  </ServicePageLayout>
);

export default Reads;
