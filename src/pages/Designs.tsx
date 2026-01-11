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
import { CurrencyProvider, useCurrency, Currency } from "@/contexts/CurrencyContext";
import { ServicePackageCard } from "@/components/design/ServicePackageCard";

import { TestimonialsSlider, Testimonial } from "@/components/design/TestimonialsSlider";
import { ReviewModal } from "@/components/design/ReviewModal";
import { brandingPackages, graphicDesignPackages, uiuxPackages } from "@/data/servicePackages";
import { toast } from "sonner";
import profilePhoto from "@/assets/profile.png";
import { useFormSubmission } from "@/hooks/useFormSubmission";

const processSteps = [
  {
    title: "Discovery",
    description: "Understanding your vision, audience, and market positioning through strategic research and collaborative dialogue.",
  },
  {
    title: "Concept & Direction",
    description: "Defining the creative direction with mood boards, typography systems, and visual language foundations.",
  },
  {
    title: "Design Execution",
    description: "Crafting every element with precision — from logo systems to complete brand collateral.",
  },
  {
    title: "Refinement & Delivery",
    description: "Polishing details through iterative feedback and delivering production-ready assets.",
  },
];

const designPrinciples = [
  {
    title: "Systems Over Trends",
    description: "Building scalable design systems that outlast fleeting aesthetics and grow with your brand.",
  },
  {
    title: "Clarity Before Aesthetics",
    description: "Every design decision serves communication first — beauty follows function.",
  },
  {
    title: "Consistency Creates Trust",
    description: "Unified visual language across all touchpoints builds recognition and credibility.",
  },
  {
    title: "Function Meets Emotion",
    description: "Designs that work seamlessly while creating meaningful emotional connections.",
  },
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

  const { currency, setCurrency } = useCurrency();

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
      pageName: "Houcine.designs",
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
                filter: "drop-shadow(0 0 8px rgba(103, 232, 249, 0))",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0.5))"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0))"}
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
              src="/src/assets/logo-h.png"
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
              <div className="grid grid-cols-3 gap-4 pt-6">
                <Card className="p-4 text-center border-border/50 bg-card/50">
                  <div className="text-3xl font-bold text-accent mb-1">25+</div>
                  <div className="text-sm text-muted-foreground">Clients</div>
                </Card>
                <Card className="p-4 text-center border-border/50 bg-card/50">
                  <div className="text-3xl font-bold text-accent mb-1">3</div>
                  <div className="text-sm text-muted-foreground">Years Experience</div>
                </Card>
                <Card className="p-4 text-center border-border/50 bg-card/50">
                  <div className="text-3xl font-bold text-accent mb-1">5</div>
                  <div className="text-sm text-muted-foreground">Design Categories</div>
                </Card>
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
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className="text-muted-foreground">Currency:</span>
              {(["EUR", "USD", "TND"] as Currency[]).map((curr) => (
                <Button
                  key={curr}
                  variant={currency === curr ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrency(curr)}
                >
                  {curr}
                </Button>
              ))}
            </div>
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
              <div className="grid md:grid-cols-3 gap-6">
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
              <div className="grid md:grid-cols-3 gap-6">
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
              <div className="grid md:grid-cols-3 gap-6">
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

          <div className="text-center mt-8 text-sm text-muted-foreground">
            Payment options: PayPal, CTI, or Cash
          </div>
        </div>
      </section>

      {/* Process-Driven Design Section */}
      <section
        ref={processAnimation.ref}
        className={`py-12 md:py-16 bg-secondary/20 transition-all duration-700 ${
          processAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-8">
            Process-Driven Design
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {processSteps.map((step, index) => (
              <Card
                key={index}
                className="border-border/50 bg-card/50 backdrop-blur p-5 md:p-6 group hover:border-accent/50 hover:bg-card/80 transition-all duration-300 relative overflow-hidden"
              >
                {/* Animated Step Number */}
                <div className="relative mb-4">
                  <div 
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-accent/30 flex items-center justify-center group-hover:border-accent group-hover:bg-accent/10 transition-all duration-500 group-hover:scale-110"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <span className="text-xl md:text-2xl font-display font-bold text-accent/70 group-hover:text-accent transition-colors duration-300">
                      {index + 1}
                    </span>
                  </div>
                  {/* Connecting line for visual flow (hidden on last item) */}
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 left-full w-full h-[2px] bg-gradient-to-r from-accent/20 to-transparent -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                <h3 className="font-display font-semibold text-lg mb-3 group-hover:text-accent transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Design Philosophy Section */}
      <section
        ref={philosophyAnimation.ref}
        className={`py-12 md:py-16 transition-all duration-700 ${
          philosophyAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-8">
            Design Philosophy
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {designPrinciples.map((principle, index) => (
              <Card
                key={index}
                className="border-border/50 bg-card/50 backdrop-blur p-5 md:p-6 group hover:border-accent/50 hover:bg-card/80 transition-all duration-300"
              >
                <h3 className="font-display font-semibold text-lg mb-3 group-hover:text-accent transition-colors">
                  {principle.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {principle.description}
                </p>
              </Card>
            ))}
          </div>
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
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="cti">CTI (Carte Technologique Internationale)</SelectItem>
                    <SelectItem value="cash">Cash (Manual Contact)</SelectItem>
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

const Designs = () => {
  return (
    <CurrencyProvider>
      <DesignsContent />
    </CurrencyProvider>
  );
};

export default Designs;
