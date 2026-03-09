import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Linkedin, Github, DollarSign, User, Instagram, Send, Loader2 } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CurrencyProvider, useCurrency, Currency } from "@/contexts/CurrencyContext";
import { devServicePackages } from "@/data/devServicePackages";
import DevServiceCard from "@/components/dev/DevServiceCard";
import { useFormSubmission } from "@/hooks/useFormSubmission";
import { toast } from "sonner";

const DevContent = () => {
  const { currency, setCurrency, convertPrice } = useCurrency();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    service: "",
    budget: "",
    message: ""
  });

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

  const handleRequestQuote = (service: any) => {
    setFormData({ ...formData, service: service.name });
    scrollToSection('contact');
  };

  const { submitForm, isSubmitting } = useFormSubmission();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.service || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const success = await submitForm({
      pageName: "Houcine.dev",
      formType: "Quote Request",
      userName: formData.name,
      userEmail: formData.email,
      serviceType: formData.service,
      message: formData.message,
      additionalData: formData.budget ? { budget: formData.budget } : undefined,
    });

    if (success) {
      setFormData({ name: "", email: "", service: "", budget: "", message: "" });
    }
  };

  // Currency-dependent budget ranges
  const getBudgetRanges = () => {
    const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "TND";
    const ranges = currency === "TND" 
      ? [
          { value: "under-500", label: `Under 500 ${currencySymbol}` },
          { value: "500-900", label: `500 - 900 ${currencySymbol}` },
          { value: "900-1500", label: `900 - 1,500 ${currencySymbol}` },
          { value: "over-1500", label: `Over 1,500 ${currencySymbol}` },
        ]
      : currency === "EUR"
      ? [
          { value: "under-150", label: `Under ${currencySymbol}150` },
          { value: "150-270", label: `${currencySymbol}150 - ${currencySymbol}270` },
          { value: "270-450", label: `${currencySymbol}270 - ${currencySymbol}450` },
          { value: "over-450", label: `Over ${currencySymbol}450` },
        ]
      : [
          { value: "under-160", label: `Under ${currencySymbol}160` },
          { value: "160-290", label: `${currencySymbol}160 - ${currencySymbol}290` },
          { value: "290-490", label: `${currencySymbol}290 - ${currencySymbol}490` },
          { value: "over-490", label: `Over ${currencySymbol}490` },
        ];
    return ranges;
  };

  const skills = [
    { category: "Frontend", items: ["React", "Tailwind", "HTML/CSS", "JavaScript"] },
    { category: "Backend Basics", items: ["Firebase", "Flask", "APIs"] },
    { category: "Automation & FinTech", items: ["Python", "Pandas", "Google Sheets API"] }
  ];

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
            Building Fast, Scalable, and Beautifully Coded Websites
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            I help individuals and startups transform ideas into real, efficient, and elegant digital platforms.
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
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">What I Build</h2>
            <p className="text-xl text-muted-foreground">Professional web development services tailored to your needs</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-8">
            {devServicePackages.map((service, index) => (
              <DevServiceCard 
                key={index} 
                service={service}
                onRequestQuote={handleRequestQuote}
              />
            ))}
          </div>
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
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground mb-8">Choose your currency and see real-time pricing</p>
            
            <div className="flex justify-center gap-4 mb-8">
              <Button
                variant={currency === "EUR" ? "default" : "outline"}
                onClick={() => setCurrency("EUR")}
                className={currency === "EUR" ? "" : ""}
              >
                EUR (€)
              </Button>
              <Button
                variant={currency === "USD" ? "default" : "outline"}
                onClick={() => setCurrency("USD")}
                className={currency === "USD" ? "" : ""}
              >
                USD ($)
              </Button>
              <Button
                variant={currency === "TND" ? "default" : "outline"}
                onClick={() => setCurrency("TND")}
                className={currency === "TND" ? "" : ""}
              >
                TND
              </Button>
            </div>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-accent" />
                Payment Options
              </CardTitle>
              <CardDescription>
                I accept multiple payment methods for your convenience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border border-border/50 rounded-lg">
                  <p className="font-semibold mb-2">PayPal</p>
                  <p className="text-sm text-muted-foreground">Secure online payments</p>
                </div>
                <div className="text-center p-4 border border-border/50 rounded-lg">
                  <p className="font-semibold mb-2">Bank Transfer</p>
                  <p className="text-sm text-muted-foreground">Direct bank transfer</p>
                </div>
                <div className="text-center p-4 border border-border/50 rounded-lg">
                  <p className="font-semibold mb-2">CTI</p>
                  <p className="text-sm text-muted-foreground">Tunisian card payment</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                All prices include initial consultation, design, development, and basic revisions. Custom features quoted separately.
              </p>
            </CardContent>
          </Card>
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
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">About Me</h2>
            <p className="text-xl text-muted-foreground">The developer behind Houcine.dev</p>
          </div>
          
          <Card className="border-accent/30 bg-card/50 backdrop-blur hover:border-accent/50 transition-all duration-300">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl blur-xl" />
                  <div className="relative aspect-square bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl flex flex-col items-center justify-center gap-4 overflow-hidden">
                    <User className="w-16 h-16 text-accent" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card/90 to-transparent p-4">
                      <div className="flex items-center justify-center gap-2">
                        <img 
                          src="/src/assets/pytunisia-logo.png"
                          alt="PyTunisia Logo"
                          className="w-12 h-12 object-contain"
                        />
                        <span className="text-sm font-semibold text-accent">PyTunisia</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-display font-bold mb-4">Houcine Mohamed</h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    I'm a web developer and tech enthusiast from Tunisia, passionate about building fast, scalable, and beautifully coded websites. I specialize in React, Tailwind CSS, and modern web technologies.
                  </p>
                  <p className="text-lg text-muted-foreground mb-6">
                    Beyond development, I'm the founder of <strong className="text-accent">PyTunisia</strong> — an Instagram initiative where I create and share educational content about programming and technology. It's part of my identity as a tech educator and my way of giving back to the community.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      onClick={() => window.open('https://www.instagram.com/pytunisia/', '_blank')}
                    >
                      <Instagram className="w-5 h-5 mr-2" />
                      PyTunisia on Instagram
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.open('https://github.com/HoucineMohamed', '_blank')}
                    >
                      <Github className="w-5 h-5 mr-2" />
                      GitHub
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">What I Use to Build</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              I use modern web technologies to create fast, reliable, and scalable digital products.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {skills.map((skillGroup, index) => (
              <Card key={index} className="border-border/50 bg-card/50 backdrop-blur hover:border-accent/30 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg text-accent">{skillGroup.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.items.map((skill, skillIndex) => (
                      <Badge 
                        key={skillIndex} 
                        variant="secondary"
                        className="hover:bg-tech-blue/20 hover:border-tech-blue/50 transition-colors cursor-default hover:scale-105"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-tech-blue/30 to-primary/30 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Let's Build Your Website
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
                    <label className="text-sm font-medium">Name *</label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service Interest *</label>
                    <Select value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {devServicePackages.map((service) => (
                          <SelectItem key={service.name} value={service.name}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Budget Range</label>
                    <Select 
                      value={formData.budget} 
                      onValueChange={(value) => setFormData({ ...formData, budget: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency first in pricing section" />
                      </SelectTrigger>
                      <SelectContent>
                        {getBudgetRanges().map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message *</label>
                  <Textarea 
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
                  className="bg-tech-blue hover:bg-tech-blue/90 w-full"
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

      <Footer />
    </div>
  );
};

const Dev = () => {
  return (
    <CurrencyProvider>
      <DevContent />
    </CurrencyProvider>
  );
};

export default Dev;
