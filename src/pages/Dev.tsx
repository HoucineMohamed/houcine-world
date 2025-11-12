import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, GitFork, ExternalLink, Loader2, Code2, GraduationCap, Briefcase, Mail, Linkedin, Github } from "lucide-react";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

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

const Dev = () => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heroAnimation = useScrollAnimation();
  const pyTunisiaAnimation = useScrollAnimation();
  const servicesAnimation = useScrollAnimation();
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

  const services = [
    {
      icon: <Code2 className="w-8 h-8" />,
      title: "Front-End Development",
      description: "Responsive, animated, optimized web interfaces using React, Tailwind, HTML/CSS, and JavaScript."
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "FinTech Tutoring",
      description: "Lessons in Python for finance, data-driven apps, and tech basics tailored to your needs."
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Tech Consulting",
      description: "Guidance for small teams or startups on design + FinTech project structure."
    }
  ];

  const skills = [
    { category: "Frontend", items: ["React", "Tailwind", "HTML/CSS", "JavaScript"] },
    { category: "Design", items: ["Figma", "Canva"] },
    { category: "Tech & Automation", items: ["Firebase", "Python", "Flask"] },
    { category: "FinTech & Data", items: ["Pandas", "APIs", "Google Sheets"] }
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
            Building Meaningful Digital Experiences
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            Where Code Meets Creativity.
          </p>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            I'm Houcine, a front-end developer and FinTech enthusiast passionate about merging design, data, and technology to shape smarter digital products.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => scrollToSection('pytunisia')}
              className="bg-tech-blue hover:bg-tech-blue/90 text-white"
            >
              Explore PyTunisia
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.open('https://github.com/HoucineMohamed', '_blank')}
            >
              <Github className="w-5 h-5 mr-2" />
              See My Work on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* PyTunisia Section */}
      <section 
        id="pytunisia"
        ref={pyTunisiaAnimation.ref}
        className={`py-24 bg-muted/30 transition-all duration-700 ${
          pyTunisiaAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-tech-blue/10 text-tech-blue border-tech-blue/30">Flagship Project</Badge>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">PyTunisia</h2>
              <p className="text-lg text-muted-foreground mb-6">
                PyTunisia is an educational initiative I founded to make Python and data science more accessible for Tunisian students. From UI/UX design to automation, I built digital experiences that teach code with clarity and community spirit.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-tech-blue">500+</p>
                  <p className="text-sm text-muted-foreground">Learners</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-tech-blue">10+</p>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-tech-blue">3</p>
                  <p className="text-sm text-muted-foreground">Seminars</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => window.open('https://pytunisia.tn', '_blank')}
                  className="bg-tech-blue hover:bg-tech-blue/90"
                >
                  Visit PyTunisia
                </Button>
                <Button variant="outline">Read Project Story</Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-tech-blue/20 to-primary/20 rounded-2xl blur-2xl" />
              <Card className="relative border-tech-blue/30 bg-card/50 backdrop-blur">
                <CardContent className="p-8">
                  <div className="aspect-video bg-gradient-to-br from-tech-blue/20 to-primary/20 rounded-lg flex items-center justify-center">
                    <Code2 className="w-24 h-24 text-tech-blue" />
                  </div>
                </CardContent>
              </Card>
            </div>
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
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Developer Services</h2>
            <p className="text-xl text-muted-foreground">Professional freelance services for your digital needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card 
                key={index}
                className="border-border/50 bg-card/50 backdrop-blur hover:border-tech-blue/50 hover:shadow-lg hover:shadow-tech-blue/20 transition-all duration-300 group cursor-pointer hover:scale-[1.02]"
              >
                <CardHeader>
                  <div className="w-16 h-16 bg-tech-blue/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-tech-blue/20 transition-colors">
                    <div className="text-tech-blue">
                      {service.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">{service.title}</CardTitle>
                  <CardDescription className="text-base">{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Request a Quote</Button>
                </CardContent>
              </Card>
            ))}
          </div>
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
        className={`py-24 transition-all duration-700 ${
          skillsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Skills & Tools</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              I blend design logic and financial data thinking to create human-centered web tools.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {skills.map((skillGroup, index) => (
              <Card key={index} className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-lg text-tech-blue">{skillGroup.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skillGroup.items.map((skill, skillIndex) => (
                      <Badge 
                        key={skillIndex} 
                        variant="secondary"
                        className="hover:bg-tech-blue/20 hover:border-tech-blue/50 transition-colors cursor-default"
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

      {/* Contact & Collaboration Section */}
      <section 
        id="contact"
        ref={contactAnimation.ref}
        className={`py-24 bg-muted/30 relative overflow-hidden transition-all duration-700 ${
          contactAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-tech-blue/30 to-primary/30 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Let's Bring Your Idea to Life
            </h2>
            <p className="text-xl text-muted-foreground">
              Whether it's a landing page, a FinTech prototype, or an educational project.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = 'mailto:contact@houcine.world'}
              className="bg-tech-blue hover:bg-tech-blue/90"
            >
              <Mail className="w-5 h-5 mr-2" />
              Send Email
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('services')}
            >
              Request Collaboration
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => window.open('https://linkedin.com/in/houcine-mohamed', '_blank')}
            >
              <Linkedin className="w-5 h-5 mr-2" />
              Connect on LinkedIn
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Dev;
