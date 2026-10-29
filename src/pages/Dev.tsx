import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Linkedin, Github, DollarSign, User, Instagram, Send, Loader2 } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { toast } from "sonner";
import { PAYMENT_POLICY_TEXT } from "@/config/contact";
import TechCatalogue from "@/components/tech/TechCatalogue";
import TechStack from "@/components/tech/TechStack";
import {
  PRICE_EXCLUSIONS,
  SERVICE_FAMILIES,
  budgetOptionsFor,
  isBudgetAllowed,
  priceLabel,
  serviceByName,
  servicesInFamily,
  type FamilySlug,
} from "@/content/techCatalogue";

const DevContent = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    family: "" as FamilySlug | "",
    service: "",
    budget: "",
    message: ""
  });
  const [budgetNotice, setBudgetNotice] = useState("");

  const heroAnimation = useScrollAnimation();
  const servicesAnimation = useScrollAnimation();
  const pricingAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();
  const skillsAnimation = useScrollAnimation();
  const contactAnimation = useScrollAnimation();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const { submitForm, isSubmitting } = useFormSubmission();

  const selectedService = formData.service ? serviceByName(formData.service) : undefined;
  const budgetOptions = selectedService ? budgetOptionsFor(selectedService) : [];

  // Changing the service recalculates the budget ranges; a budget that no longer fits is cleared, never kept.
  const selectService = (name: string, family?: FamilySlug) => {
    const service = serviceByName(name);
    setFormData((prev) => {
      const keep = prev.budget !== "" && isBudgetAllowed(name, prev.budget);
      if (prev.budget !== "" && !keep && service) {
        setBudgetNotice(`Your budget was cleared: ${service.name} starts ${priceLabel(service).replace(/^From/, "from")}.`);
      }
      return { ...prev, family: family ?? service?.family ?? prev.family, service: name, budget: keep ? prev.budget : "" };
    });
  };

  const selectFamily = (family: FamilySlug) => {
    if (family === formData.family) return;
    setBudgetNotice(formData.budget ? "Your budget was cleared: choose a service, then a budget." : "");
    setFormData({ ...formData, family, service: "", budget: "" });
  };

  const requestQuote = (name: string) => {
    selectService(name);
    scrollToSection("contact");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.service || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.budget && !isBudgetAllowed(formData.service, formData.budget)) {
      setFormData({ ...formData, budget: "" });
      toast.error("That budget is below the starting price of the selected service. Please choose another range.");
      return;
    }
    
    const success = await submitForm({
      pageName: "Houcine.tech",
      formType: "Quote Request",
      userName: formData.name,
      userEmail: formData.email,
      serviceType: formData.service,
      message: formData.message,
      additionalData: formData.budget ? { budget: formData.budget } : undefined,
    });

    if (success) {
      setFormData({ name: "", email: "", family: "", service: "", budget: "", message: "" });
      setBudgetNotice("");
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <CustomCursor />
      
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-flex items-center justify-center [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:-mx-1.5 [@media(pointer:coarse)]:-my-1.5 hover:scale-110 transition-all duration-200 group">
            <img 
              src={logoH} 
              alt="Houcine.world home" 
              className="h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0))",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 255, 0))"}
            />
          </Link>
        </div>
      </header>
      <main id="main">

      {/* Hero Section */}
      <section 
        ref={heroAnimation.ref}
        className={`relative min-h-screen flex items-center justify-center overflow-hidden transition-all duration-1000 ${
          heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-background" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 bg-gradient-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent animate-fade-in">
            Digital systems, not just websites
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            I design, build and integrate the technology behind a business — from a first website
            to the applications, automation and AI-assisted tools that run it day to day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => scrollToSection('services')}
            >
              View My Services
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => scrollToSection('contact')}
            >
              Get a Quote
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section 
        id="services"
        ref={servicesAnimation.ref}
        className={`py-24 transition-all duration-700 ${
          servicesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">What I build</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Websites, applications, automation, AI and infrastructure. Every price is a starting
              point; the final quote depends on the agreed scope.
            </p>
          </div>
          <TechCatalogue onQuote={requestQuote} />
        </div>
      </section>

      {/* Pricing & Payment Section */}
      <section 
        id="pricing"
        ref={pricingAnimation.ref}
        className={`py-24 bg-muted/30 transition-all duration-700 ${
          pricingAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Starting price</h2>
            <p className="text-2xl md:text-3xl font-display font-semibold text-accent mb-2">
              From €699 / $699
            </p>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              One-time projects start here; monthly plans start at €699 / $699 per month. Final pricing
              depends on features, integrations, infrastructure and scope -- larger systems such as SaaS
              platforms, full mobile apps or advanced AI cost more than their entry price.
            </p>
            <p className="text-sm text-muted-foreground mt-3">Prices are listed in EUR and USD with the same amount; they are not converted.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-accent" />
                Payment
              </CardTitle>
              <CardDescription>{PAYMENT_POLICY_TEXT}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every project gets a written, scoped quote before work begins: consultation, design,
                development and an agreed number of revisions. Work outside that scope is quoted separately.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Not included unless quoted</CardTitle>
              <CardDescription>Third-party costs are identified in each quote.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                {PRICE_EXCLUSIONS.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </CardContent>
          </Card>
          </div>
        </div>
      </section>

      {/* About Me Section */}
      <section 
        id="about"
        ref={aboutAnimation.ref}
        className={`py-24 transition-all duration-700 ${
          aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-[2fr_3fr] lg:grid-cols-[5fr_7fr] gap-12 lg:gap-20 items-start">
            {/* Left: identity */}
            <div>
              <div
                className="w-14 h-14 mb-8 rounded-md border border-border/60 bg-card flex items-center justify-center font-display font-bold text-lg tracking-tight text-foreground"
                aria-hidden="true"
              >
                HM
              </div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">The developer behind the ecosystem</p>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Houcine Mohamed</h2>
              <p className="text-lg md:text-xl text-muted-foreground mb-10">
                Building digital products. Connecting ideas with technology.
              </p>

              <dl className="rounded-lg border border-border/60 bg-card/50 p-5 font-mono text-sm space-y-2 break-words">
                <div>
                  <dt className="sr-only">Contact</dt>
                  <dd className="text-foreground">tech@houcine.world</dd>
                </div>
                <div className="flex flex-wrap gap-x-2 pt-2 border-t border-border/40">
                  <dt className="text-muted-foreground">Role:</dt>
                  <dd className="text-foreground">Developer &amp; Founder</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted-foreground">Focus:</dt>
                  <dd className="text-foreground">Software · AI · Automation</dd>
                </div>
              </dl>
            </div>

            {/* Right: biography */}
            <div className="md:pt-[5.5rem]">
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  I'm a developer, technology enthusiast, and founder of Houcine.tech, passionate about turning
                  complex ideas into practical digital solutions. From modern websites and custom applications to
                  AI-powered systems, intelligent automation, and connected platforms, I build technology designed to
                  solve real problems and help businesses grow.
                </p>
                <p>
                  My approach combines engineering, problem-solving, and thoughtful design to create digital
                  experiences that are functional, scalable, and built with purpose.
                </p>
                <p>
                  Beyond development, I'm the founder of <strong className="text-foreground font-semibold">PyTunisia</strong>,
                  an educational initiative where I share programming knowledge and technology content with the
                  community. I believe technology should be accessible, useful, and continuously evolving—and that
                  sharing knowledge is an essential part of building a stronger developer community.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <Button asChild size="lg">
                  <a href="https://www.instagram.com/pytunisia/" target="_blank" rel="noopener noreferrer">
                    <Instagram className="w-5 h-5 mr-2" aria-hidden="true" />
                    PyTunisia on Instagram
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="https://github.com/HoucineMohamed" target="_blank" rel="noopener noreferrer">
                    <Github className="w-5 h-5 mr-2" aria-hidden="true" />
                    GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills & Tools Section */}
      <section 
        id="skills"
        ref={skillsAnimation.ref}
        className={`py-24 bg-muted/30 transition-all duration-700 ${
          skillsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">The technology behind the work</p>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">What I Use to Build</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Every project requires the right tools, architecture, and technologies. From modern web applications
              to intelligent systems and automated workflows, I combine technologies across the stack to build
              digital products that are functional, scalable, secure, and ready to grow.
            </p>
          </div>
          <TechStack />
        </div>
      </section>

      {/* Contact Section */}
      <section 
        id="contact"
        ref={contactAnimation.ref}
        className={`py-24 relative overflow-hidden transition-all duration-700 ${
          contactAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-accent/15 to-primary/15 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Let’s make this happen
            </h2>
            <p className="text-xl text-muted-foreground">
              Ready to bring your vision online? Let's discuss your project today.
            </p>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="dev-contact-name" className="text-sm font-medium">Name *</label>
                    <Input 
                      id="dev-contact-name"
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="dev-contact-email" className="text-sm font-medium">Email *</label>
                    <Input 
                      id="dev-contact-email"
                      type="email"
                      maxLength={254}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="dev-contact-family" className="text-sm font-medium">Service Area *</label>
                    <Select value={formData.family} onValueChange={(value) => value && selectFamily(value as FamilySlug)}>
                      <SelectTrigger id="dev-contact-family">
                        <SelectValue placeholder="Select a service area" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_FAMILIES.map((f) => (
                          <SelectItem key={f.slug} value={f.slug}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="dev-contact-service" className="text-sm font-medium">Service Interest *</label>
                    <Select value={formData.service} onValueChange={(value) => value && selectService(value)} disabled={!formData.family}>
                      <SelectTrigger id="dev-contact-service">
                        <SelectValue placeholder={formData.family ? "Select a service" : "Select a service area first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.family && servicesInFamily(formData.family).map((service) => (
                          <SelectItem key={service.slug} value={service.name}>
                            {service.name} — {priceLabel(service).replace(/^From/, "from")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="dev-contact-budget" className="text-sm font-medium">Budget Range</label>
                  <Select
                    value={formData.budget}
                    onValueChange={(value) => { if (!value) return; setBudgetNotice(""); setFormData((prev) => ({ ...prev, budget: value })); }}
                    disabled={!selectedService}
                  >
                    <SelectTrigger id="dev-contact-budget" aria-describedby="dev-contact-budget-help">
                      <SelectValue placeholder={selectedService ? "Select a budget range" : "Select a service first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {budgetOptions.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p id="dev-contact-budget-help" className="text-sm text-muted-foreground" aria-live="polite">
                    {budgetNotice || (selectedService
                      ? `${selectedService.name} starts ${priceLabel(selectedService).replace(/^From/, "from")}, so ranges start there. The final quote depends on scope.`
                      : "Budget ranges adapt to the starting price of the service you choose.")}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="dev-contact-message" className="text-sm font-medium">Message *</label>
                  <Textarea 
                    id="dev-contact-message"
                    maxLength={5000}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell me about your project..."
                    rows={5}
                    required
                  />
                </div>

                <Button 
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t border-border/50 flex flex-wrap justify-center gap-4">
                <Button 
                  variant="ghost"
                  onClick={() => window.open('https://github.com/HoucineMohamed', '_blank')}
                  className="gap-2"
                >
                  <Github className="w-5 h-5" />
                  GitHub
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => window.open('https://linkedin.com/in/houcine-mohamed', '_blank')}
                  className="gap-2"
                >
                  <Linkedin className="w-5 h-5" />
                  LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
};

const Dev = () => <DevContent />;

export default Dev;
