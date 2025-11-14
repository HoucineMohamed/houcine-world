import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Star, GitFork, ExternalLink, Loader2, Code2, Mail, Linkedin, Github, Rocket, Building, GraduationCap, LineChart, DollarSign } from "lucide-react";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CurrencyProvider, useCurrency, Currency } from "@/contexts/CurrencyContext";
import { devServicePackages } from "@/data/devServicePackages";
import DevServiceCard from "@/components/dev/DevServiceCard";
import { toast } from "sonner";

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  topics: string[];
}

const DevContent = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currency, setCurrency } = useCurrency();
  
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
  const pyTunisiaAnimation = useScrollAnimation();
  const githubAnimation = useScrollAnimation();
  const skillsAnimation = useScrollAnimation();
  const contactAnimation = useScrollAnimation();

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch('https://api.github.com/users/HoucineMohamed/repos?sort=updated&per_page=100');
        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }
        const data = await response.json();
        setRepos(data);
        setError(null);
      } catch (err) {
        setError('Unable to load projects. Please try again later.');
        console.error('Error fetching repos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.service || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Message sent! I'll get back to you soon.");
    setFormData({ name: "", email: "", service: "", budget: "", message: "" });
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
          heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-tech-blue/5 via-background to-background" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tech-blue/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 bg-gradient-to-r from-tech-blue via-primary to-tech-blue bg-clip-text text-transparent animate-fade-in">
            Building Fast, Scalable, and Beautifully Coded Websites
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            I help individuals and startups transform ideas into real, efficient, and elegant digital platforms.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => scrollToSection('services')}
              className="bg-tech-blue hover:bg-tech-blue/90 text-white"
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                className={currency === "EUR" ? "bg-tech-blue hover:bg-tech-blue/90" : ""}
              >
                EUR (€)
              </Button>
              <Button
                variant={currency === "USD" ? "default" : "outline"}
                onClick={() => setCurrency("USD")}
                className={currency === "USD" ? "bg-tech-blue hover:bg-tech-blue/90" : ""}
              >
                USD ($)
              </Button>
              <Button
                variant={currency === "TND" ? "default" : "outline"}
                onClick={() => setCurrency("TND")}
                className={currency === "TND" ? "bg-tech-blue hover:bg-tech-blue/90" : ""}
              >
                TND
              </Button>
            </div>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-tech-blue" />
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

      {/* PyTunisia Featured Project Section */}
      <section 
        id="pytunisia"
        ref={pyTunisiaAnimation.ref}
        className={`py-24 transition-all duration-700 ${
          pyTunisiaAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Recent Work Example</h2>
          </div>
          <Card className="border-tech-blue/30 bg-card/50 backdrop-blur hover:border-tech-blue/50 hover:shadow-xl hover:shadow-tech-blue/20 transition-all duration-300">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-tech-blue/20 to-primary/20 rounded-xl blur-xl" />
                  <div className="relative aspect-video bg-gradient-to-br from-tech-blue/20 to-primary/20 rounded-xl flex items-center justify-center">
                    <Code2 className="w-20 h-20 text-tech-blue" />
                  </div>
                </div>
                <div>
                  <Badge className="mb-4 bg-tech-blue/10 text-tech-blue border-tech-blue/30">Featured Project</Badge>
                  <h3 className="text-3xl font-display font-bold mb-4">PyTunisia</h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    A digital education platform I founded to teach Python and data science in Tunisia. Entirely designed and built with modern web tools.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-tech-blue">500+</p>
                      <p className="text-xs text-muted-foreground">Learners</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-tech-blue">10+</p>
                      <p className="text-xs text-muted-foreground">Courses</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-tech-blue">3</p>
                      <p className="text-xs text-muted-foreground">Seminars</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => window.open('https://pytunisia.tn', '_blank')}
                    className="bg-tech-blue hover:bg-tech-blue/90"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* GitHub Projects Section */}
      <section 
        id="github"
        ref={githubAnimation.ref}
        className={`py-24 bg-muted/30 transition-all duration-700 ${
          githubAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">GitHub Projects</h2>
            <p className="text-xl text-muted-foreground">Open-source contributions and personal projects</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-tech-blue" />
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">{error}</p>
            </div>
          )}

          {!loading && !error && repos.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No projects found yet. Check back soon!</p>
            </div>
          )}

          {!loading && !error && repos.length > 0 && (
            <>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {repos.slice(0, 6).map((repo) => (
                  <Card 
                    key={repo.id}
                    className="border-border/50 bg-card/50 backdrop-blur hover:border-tech-blue/50 hover:shadow-lg hover:shadow-tech-blue/20 transition-all duration-300 group hover:scale-[1.02]"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl group-hover:text-tech-blue transition-colors">
                            {repo.name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {repo.description || "No description provided"}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {repo.stargazers_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <GitFork className="w-4 h-4" />
                            {repo.forks_count}
                          </div>
                          {repo.language && (
                            <Badge variant="secondary" className="text-xs">
                              {repo.language}
                            </Badge>
                          )}
                        </div>

                        {repo.topics && repo.topics.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {repo.topics.slice(0, 5).map((topic) => (
                              <Badge key={topic} variant="outline" className="text-xs border-tech-blue/30">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => window.open(repo.html_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View on GitHub
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="text-center">
                <Button 
                  size="lg"
                  onClick={() => window.open('https://github.com/HoucineMohamed', '_blank')}
                >
                  View All on GitHub
                </Button>
              </div>
            </>
          )}
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
              <Card key={index} className="border-border/50 bg-card/50 backdrop-blur hover:border-tech-blue/30 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-lg text-tech-blue">{skillGroup.category}</CardTitle>
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
                    <Select value={formData.budget} onValueChange={(value) => setFormData({ ...formData, budget: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-1000">Under €1,000</SelectItem>
                        <SelectItem value="1000-2000">€1,000 - €2,000</SelectItem>
                        <SelectItem value="2000-5000">€2,000 - €5,000</SelectItem>
                        <SelectItem value="over-5000">Over €5,000</SelectItem>
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

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    type="submit"
                    size="lg"
                    className="bg-tech-blue hover:bg-tech-blue/90 flex-1"
                  >
                    Send Message
                  </Button>
                  <Button 
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() => window.location.href = 'mailto:contact@houcine.world'}
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Email Directly
                  </Button>
                </div>
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
