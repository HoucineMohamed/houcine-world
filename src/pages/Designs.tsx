import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowDown, ExternalLink, Mail, Palette, Layers, Smartphone } from "lucide-react";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CurrencyProvider, useCurrency, Currency } from "@/contexts/CurrencyContext";
import { ServicePackageCard } from "@/components/design/ServicePackageCard";
import { PortfolioLightbox } from "@/components/design/PortfolioLightbox";
import { TestimonialsSlider, Testimonial } from "@/components/design/TestimonialsSlider";
import { ReviewModal } from "@/components/design/ReviewModal";
import { brandingPackages, graphicDesignPackages, uiuxPackages } from "@/data/servicePackages";
import { toast } from "sonner";
import profilePhoto from "@/assets/profile.png";

interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  image: string;
  behanceUrl?: string;
}

const portfolioItems: PortfolioItem[] = [
  {
    id: 1,
    title: "Tech Startup Branding",
    description: "Complete brand identity for an innovative AI startup",
    image: "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=800&q=80",
    behanceUrl: "https://www.behance.net/HoucineDesigns",
  },
  {
    id: 2,
    title: "Mobile App Design",
    description: "UI/UX design for a fitness tracking application",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
    behanceUrl: "https://www.behance.net/HoucineDesigns",
  },
  {
    id: 3,
    title: "Restaurant Brand Identity",
    description: "Modern branding for an upscale dining experience",
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    behanceUrl: "https://www.behance.net/HoucineDesigns",
  },
  {
    id: 4,
    title: "E-commerce Platform",
    description: "Clean and intuitive web design for online retail",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    behanceUrl: "https://www.behance.net/HoucineDesigns",
  },
  {
    id: 5,
    title: "Music Festival Branding",
    description: "Bold visual identity for a summer music event",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
    behanceUrl: "https://www.behance.net/HoucineDesigns",
  },
  {
    id: 6,
    title: "Finance App Interface",
    description: "Professional dashboard design for financial management",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    behanceUrl: "https://www.behance.net/HoucineDesigns",
  },
];

const DesignsContent = () => {
  const heroAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();
  const servicesAnimation = useScrollAnimation();
  const portfolioAnimation = useScrollAnimation();
  const testimonialsAnimation = useScrollAnimation();
  const contactAnimation = useScrollAnimation();

  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioItem | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const contactSectionRef = useRef<HTMLDivElement>(null);
  const portfolioSectionRef = useRef<HTMLDivElement>(null);

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

  const handlePortfolioClick = (item: PortfolioItem) => {
    setSelectedPortfolio(item);
    setLightboxOpen(true);
  };

  const handleBookClick = (packageName: string) => {
    setSelectedPackage(packageName);
    setFormData((prev) => ({ ...prev, serviceType: packageName }));
    scrollToSection(contactSectionRef);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.serviceType || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Quote request sent successfully! We'll contact you soon.");
    setFormData({
      name: "",
      email: "",
      serviceType: "",
      message: "",
      payment: "",
    });
  };

  const handleContactEmail = () => {
    window.location.href = "mailto:contact@houcine.world";
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
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section
        ref={heroAnimation.ref}
        className={`relative min-h-screen flex items-center justify-center overflow-hidden transition-all duration-1000 ${
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
        className={`py-20 bg-secondary/20 transition-all duration-700 ${
          aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-12">
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
        className={`py-20 transition-all duration-700 ${
          servicesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
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

      {/* Portfolio Section */}
      <section
        ref={portfolioSectionRef}
        className={`py-20 bg-secondary/20 transition-all duration-700 ${
          portfolioAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-12">
            Selected Works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-8">
            {portfolioItems.map((item) => (
              <Card
                key={item.id}
                className="border-border/50 bg-card/50 backdrop-blur overflow-hidden cursor-pointer group hover:border-accent/50 transition-all"
                onClick={() => handlePortfolioClick(item)}
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("https://www.behance.net/HoucineDesigns", "_blank")}
            >
              See Full Portfolio on Behance
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        ref={testimonialsAnimation.ref}
        className={`py-20 transition-all duration-700 ${
          testimonialsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-12">
            What My Clients Say
          </h2>
          <TestimonialsSlider testimonials={testimonials.length > 0 ? testimonials : undefined} />
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => setReviewModalOpen(true)}>
              Leave a Review
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        ref={contactSectionRef}
        className={`py-20 bg-secondary/20 transition-all duration-700 ${
          contactAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-6">
            Let's Create Something Beautiful Together
          </h2>
          <p className="text-center text-muted-foreground mb-12">
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
              <div className="flex flex-col sm:flex-row gap-4">
                <Button type="submit" className="flex-1">
                  Request a Quote
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleContactEmail}
                >
                  <Mail className="w-4 h-4" />
                  Contact via Email
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      <Footer />

      <PortfolioLightbox
        item={selectedPortfolio}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

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
