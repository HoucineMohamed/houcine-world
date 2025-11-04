import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Code2, Palette, BookOpen, Briefcase, Sparkles, ExternalLink, Menu, Phone, Mail, Linkedin, Github, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import logoH from "@/assets/logo-h.png";
import profile from "@/assets/profile.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Index = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroAnimation = useScrollAnimation();
  const trailerAnimation = useScrollAnimation();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculateTilt = () => {
    const xTilt = (mousePosition.x - window.innerWidth / 2) / 50;
    const yTilt = (mousePosition.y - window.innerHeight / 2) / 50;
    return `rotateX(${-yTilt}deg) rotateY(${xTilt}deg)`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/about" className="flex items-center gap-3 group">
            <img 
              src={logoH} 
              alt="Houcine Logo" 
              className="h-10 w-auto transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 drop-shadow-lg" 
            />
            <span className="text-xl font-bold text-foreground group-hover:text-accent transition-colors">
              Houcine.world
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dev" className="hover:text-accent transition-all hover:scale-105 duration-200">Dev</Link>
            <Link to="/designs" className="hover:text-accent transition-all hover:scale-105 duration-200">Designs</Link>
            <Link to="/reads" className="hover:text-accent transition-all hover:scale-105 duration-200">Reads</Link>
            <Link to="/manages" className="hover:text-accent transition-all hover:scale-105 duration-200">Manages</Link>
          </nav>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/dev" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Dev</Link>
                <Link to="/designs" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Designs</Link>
                <Link to="/reads" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Reads</Link>
                <Link to="/manages" className="text-lg hover:text-accent transition-all hover:scale-105 duration-200">Manages</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section 
          id="home" 
          ref={heroAnimation.ref}
          className={`pt-32 pb-16 px-6 transition-all duration-700 ${
            heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-left space-y-6">
                <h1 className="text-5xl md:text-6xl font-bold text-foreground">
                  Houcine.world
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  The creative ecosystem of Houcine Mohamed — exploring technology, design, management, and innovation.
                </p>
                <div className="flex gap-4 flex-wrap">
                  <a href="#trailer" className="inline-flex items-center rounded-md bg-accent text-accent-foreground px-5 py-3 hover:bg-accent/90 transition-colors font-semibold">
                    <ExternalLink className="mr-2 w-5 h-5" />
                    Explore My Work
                  </a>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-metallic/30 text-foreground hover:bg-metallic/10">
                        Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Contact Information</DialogTitle>
                        <DialogDescription>
                          Feel free to reach out through any of these channels
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <a href="tel:+21629541180" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                          <Phone className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                          <span>+216 29 541 180</span>
                        </a>
                        <a href="mailto:mohamedhoucine2024@gmail.com" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                          <Mail className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                          <span>mohamedhoucine2024@gmail.com</span>
                        </a>
                        <a href="https://www.linkedin.com/in/mohamed-houcine-4142b12b4/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                          <Linkedin className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                          <span>LinkedIn Profile</span>
                        </a>
                        <a href="https://github.com/HoucineMohamed" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                          <Github className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                          <span>GitHub Profile</span>
                        </a>
                        <a href="https://www.behance.net/HoucineDesigns" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                          <Palette className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                          <span>Behance Portfolio</span>
                        </a>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="flex justify-center">
                <div 
                  className="relative transition-transform duration-200 ease-out"
                  style={{ 
                    transform: calculateTilt(),
                    transformStyle: "preserve-3d"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-tech-blue/30 rounded-full blur-3xl animate-pulse"></div>
                  <img 
                    src={profile} 
                    alt="Houcine Mohamed" 
                    className="relative rounded-full w-64 h-64 md:w-80 md:h-80 object-cover border-4 border-metallic/20 shadow-2xl hover:shadow-accent/50 transition-shadow duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trailer grid (teasers) */}
        <section 
          id="trailer" 
          ref={trailerAnimation.ref}
          className={`py-10 px-6 bg-secondary/30 transition-all duration-700 ${
            trailerAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="container mx-auto grid md:grid-cols-2 gap-6 max-w-6xl">
            <Link to="/dev" className="block h-full">
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-tech-blue/50 transition-all group cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Terminal className="w-8 h-8 text-tech-blue group-hover:scale-110 transition-transform" />
                    <CardTitle>Houcine.dev</CardTitle>
                  </div>
                  <CardDescription>
                    Building scalable, modern applications with React, TypeScript, and modern web APIs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Recent work • Web Apps • API Design</p>
                  <Button variant="outline" size="sm" className="border-tech-blue/30 hover:bg-tech-blue/10">View projects</Button>
                </CardContent>
              </Card>
            </Link>

            <Link to="/designs" className="block h-full">
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all group cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Palette className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
                    <CardTitle>Houcine.designs</CardTitle>
                  </div>
                  <CardDescription>
                    Crafting user experiences with bold visuals, typography, and interaction design.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Visual design projects and creative works from Behance</p>
                  <Button variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10">View portfolio</Button>
                </CardContent>
              </Card>
            </Link>

            <Link to="/reads" className="block h-full">
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur overflow-hidden hover:border-accent/50 transition-all group cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
                    <CardTitle>Houcine.reads</CardTitle>
                  </div>
                  <CardDescription>
                    A curated digital bookstore for learners.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Digital books and learning resources for curious minds.
                  </p>
                  <Button variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10">Browse titles</Button>
                </CardContent>
              </Card>
            </Link>

            <Link to="/manages" className="block h-full">
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all group cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-tech-blue group-hover:scale-110 transition-transform" />
                    <CardTitle>Houcine.manages</CardTitle>
                  </div>
                  <CardDescription>
                    Building creative brands and projects.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">DJ La Rosa View • The Shape Shifters</p>
                  <Button variant="outline" size="sm" className="border-tech-blue/30 hover:bg-tech-blue/10">View case studies</Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
