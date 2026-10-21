import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, Send } from "lucide-react";
import { ServicePageLayout, ServiceHero } from "@/components/service/ServicePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CONTACT_EMAIL, CONTACT_FORM_ENABLED, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, SERVICE_EMAILS, contactMailto,
} from "@/config/contact";
import { useFormSubmission } from "@/hooks/useFormSubmission";

// The contact page: mailto links built from src/config/contact.ts, one per service, plus the
// general address and public phone number; and a message form sent through the site's existing
// form function (useFormSubmission, unchanged), shown only when CONTACT_FORM_ENABLED is true (it
// stays off until the form function is hardened -- see the critical bundle).

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

const LIMITS = { name: 100, email: 254, message: 5000 } as const;

const ContactForm = () => {
  const { submitForm, isSubmitting } = useFormSubmission();
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // "website" is a hidden trap field that people never see or fill; when a robot fills it, nothing is sent.
    if (form.website !== "") return;
    const ok = await submitForm({
      pageName: "Houcine.world",
      formType: "Contact",
      userName: form.name.trim().slice(0, LIMITS.name),
      userEmail: form.email.trim().slice(0, LIMITS.email),
      message: form.message.trim().slice(0, LIMITS.message),
    });
    // The hook itself tells the visitor whether it worked (an announced toast), so nothing is repeated here.
    if (ok) setForm({ name: "", email: "", message: "", website: "" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" name="name" autoComplete="name" required maxLength={LIMITS.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={LIMITS.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" name="message" required rows={6} maxLength={LIMITS.message} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
        <Send className="w-4 h-4" aria-hidden="true" />
        {isSubmitting ? "Sending…" : "Send the message"}
      </Button>
    </form>
  );
};

const Contact = () => (
  <ServicePageLayout>
    <ServiceHero
      icon={Mail}
      name="Contact"
      promise="Get in touch."
      intro="Each part of the ecosystem has its own address, so your message reaches the right place directly."
    />

    {CONTACT_FORM_ENABLED && (
      <section aria-labelledby="message-title" className="rounded-lg border border-border/50 bg-card/50 p-8 md:p-12">
        <h2 id="message-title" className="text-2xl md:text-3xl font-bold font-display text-foreground mb-6">
          Send a message
        </h2>
        <ContactForm />
      </section>
    )}

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
