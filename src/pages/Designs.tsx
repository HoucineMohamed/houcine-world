import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ExternalLink, Palette, Layers, Smartphone, Send, Loader2 } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { ServicePackageCard } from "@/components/design/ServicePackageCard";

import { TestimonialsSlider, Testimonial } from "@/components/design/TestimonialsSlider";
import { ReviewModal } from "@/components/design/ReviewModal";
import { brandingPackages, graphicDesignPackages, uiuxPackages } from "@/data/servicePackages";
import { toast } from "sonner";
import profilePhoto from "@/assets/profile.png";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { PAYMENT_POLICY_TEXT } from "@/config/contact";

// Replaces the old "Process-Driven Design" and "Design Philosophy" sections (program: master
// redesign, section 9). Two distinct compositions, not more numbered-card grids.
const technologyPoints = [
  { title: "Faster exploration", description: "More directions considered before committing to one." },
  { title: "Thoughtful iteration", description: "Tools accelerate the work; judgment decides what stays." },
  { title: "Visual consistency", description: "Every asset traces back to the same design system." },
];

const recognitionPoints = [
  "A mark people recognize before they read the name.",
  "The same voice and visual language across every touchpoint.",
  "Design decisions a brand can still stand behind a year from now.",
];

const DesignsContent = () => {
  const heroAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();
  const servicesAnimation = useScrollAnimation();
  const processAnimation = useScrollAnimation();
  const philosophyAnimation = useScrollAnimation();
  const testimonialsAnimation = useScrollAnimation();
  const contactAnimation = useScrollAnimation();

  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const contactSectionRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    serviceType: "",
    message: "",
    payment: "",
  });

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };


  const handleBookClick = (packageName: string) => {
    setSelectedPackage(packageName);
    setFormData((prev) => ({ ...prev, serviceType: packageName }));
    scrollToSection(contactSectionRef);
  };

  const { submitForm, isSubmitting } = useFormSubmission();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.serviceType || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    const success = await submitForm({
      pageName: "Houcine.studio",
      formType: "Quote Request",
      userName: formData.name,
      userEmail: formData.email,
      serviceType: formData.serviceType,
      message: formData.message,
      additionalData: formData.payment ? { paymentPreference: formData.payment } : undefined,
    });

    if (success) {
      setFormData({
        name: "",
        email: "",
        serviceType: "",
        message: "",
        payment: "",
      });
    }
  };

  const handleReviewSubmit = (review: { name: string; rating: number; comment: string }) => {
    const newTestimonial: Testimonial = {
      id: Date.now(),
      name: review.name,
      rating: review.rating,
      comment: review.comment,
    };
    setTestimonials((prev) => [newTestimonial, ...prev]);
    toast.success("Review submitted successfully!");
  };

  // Letter-by-letter animation
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "Design that speaks emotion.";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <CustomCursor />

      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-block hover:scale-110 transition-all duration-200 group">
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

      {/* Hero Section */}
      <section
        ref={heroAnimation.ref}
        className={`relative min-h-[80vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden transition-all duration-1000 ${
          heroAnimation.isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="mb-8 flex items-center justify-center">
            <img
              src={logoH}
              alt="H Logo"
              className="w-24 h-24 opacity-80 animate-pulse"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 min-h-[4rem]">
            {displayedText}
            <span className="animate-pulse">|</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            I build visual identities that move people and elevate brands.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => window.open("https://www.behance.net/HoucineDesigns", "_blank")}
            >
              Explore My Work
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => scrollToSection(contactSectionRef)}
            >
              Request a Quote
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        ref={aboutAnimation.ref}
        className={`py-12 md:py-16 bg-secondary/20 transition-all duration-700 ${
          aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-8">
            Meet the Designer
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="flex justify-center">
              <img
                src={profilePhoto}
                alt="Houcine"
                className="w-80 h-80 object-cover rounded-2xl shadow-xl shadow-accent/20 hover:shadow-accent/40 transition-all"
              />
            </div>
            <div className="space-y-6">
              <p className="text-lg text-muted-foreground leading-relaxed">
                I'm Houcine, a visual designer crafting timeless identities through emotional storytelling
                and design strategy. My approach blends art and precision — every color, every line has a reason.
              </p>
              <div className="flex gap-10 pt-6 border-t border-border/50">
                <div>
                  <div className="text-4xl md:text-5xl font-display font-bold text-foreground">+200</div>
                  <div className="text-sm text-muted-foreground mt-1">Clients</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-display font-bold text-foreground">+5</div>
                  <div className="text-sm text-muted-foreground mt-1">Years of Experience</div>
                </div>
              </div>
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open("https://www.behance.net/HoucineDesigns", "_blank")}
                >
                  View Portfolio on Behance
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        ref={servicesAnimation.ref}
        className={`py-12 md:py-16 transition-all duration-700 ${
          servicesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Creative Services
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{PAYMENT_POLICY_TEXT} All prices below are starting prices.</p>
          </div>

          <Tabs defaultValue="branding" className="max-w-7xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="branding" className="gap-2">
                <Palette className="w-4 h-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="graphic" className="gap-2">
                <Layers className="w-4 h-4" />
                Graphic Design
              </TabsTrigger>
              <TabsTrigger value="uiux" className="gap-2">
                <Smartphone className="w-4 h-4" />
                UI/UX Design
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <div className="max-w-3xl mx-auto">
                {brandingPackages.map((pkg, index) => (
                  <ServicePackageCard
                    key={index}
                    package={pkg}
                    onBookClick={handleBookClick}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="graphic">
              <div className="max-w-3xl mx-auto">
                {graphicDesignPackages.map((pkg, index) => (
                  <ServicePackageCard
                    key={index}
                    package={pkg}
                    onBookClick={handleBookClick}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="uiux">
              <div className="max-w-3xl mx-auto">
                {uiuxPackages.map((pkg, index) => (
                  <ServicePackageCard
                    key={index}
                    package={pkg}
                    onBookClick={handleBookClick}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Intelligent Creative Technology -- replaces "Process-Driven Design" */}
      <section
        ref={processAnimation.ref}
        className={`py-12 md:py-16 bg-secondary/20 transition-all duration-700 ${
          processAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Intelligent creative technology
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Modern creative tools and AI-assisted exploration move the early work faster —
                more directions, sketched and compared sooner. What stays, what's refined, and
                what's discarded is still a human creative decision at every step.
              </p>
            </div>
            <ul className="space-y-6 md:pt-2">
              {technologyPoints.map(({ title, description }) => (
                <li key={title} className="border-t border-border/50 pt-4">
                  <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Design Built for Recognition -- replaces "Design Philosophy" */}
      <section
        ref={philosophyAnimation.ref}
        className={`py-12 md:py-16 transition-all duration-700 ${
          philosophyAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Design built for recognition
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            A coherent visual identity is what makes a brand recognizable, distinctive and
            consistent across every place someone encounters it — and what makes the next thing
            that brand says easier to believe.
          </p>
          <ul className="space-y-4 text-left max-w-xl mx-auto">
            {recognitionPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-muted-foreground">
                <span className="text-accent mt-1" aria-hidden="true">—</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        ref={testimonialsAnimation.ref}
        className={`py-12 md:py-16 transition-all duration-700 ${
          testimonialsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-8">
            What My Clients Say
          </h2>
          <TestimonialsSlider testimonials={testimonials.length > 0 ? testimonials : undefined} />
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => setReviewModalOpen(true)}>
              Leave a Review
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        ref={(el: HTMLElement | null) => {
          (contactSectionRef as React.MutableRefObject<HTMLElement | null>).current = el;
          if (contactAnimation.ref) {
            (contactAnimation.ref as React.MutableRefObject<HTMLElement | null>).current = el;
          }
        }}
        className={`py-12 md:py-16 bg-secondary/20 transition-all duration-700 ${
          contactAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-6">
            Let's Create Something Beautiful Together
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Ready to elevate your brand? Fill out the form below or contact me directly.
          </p>
          <Card className="border-border/50 bg-card/50 backdrop-blur p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <Input
                  id="serviceType"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  placeholder="e.g., Brand Identity Pro"
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <div>
                <Label htmlFor="payment">Payment Preference</Label>
                <Select
                  value={formData.payment}
                  onValueChange={(value) => setFormData({ ...formData, payment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revolut">Revolut</SelectItem>
                    <SelectItem value="societe-generale">Société Générale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Request a Quote
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </section>

      <Footer />


      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

const Designs = () => <DesignsContent />;

export default Designs;
