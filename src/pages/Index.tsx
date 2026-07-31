import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Terminal, Palette, BookOpen, Briefcase, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import logoH from "@/assets/logo-h.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import HeroSection from "@/components/hero/HeroSection";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Index = () => {
  const servicesAnimation = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/80">
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
        {/* Cinematic WebGL Hero */}
        <HeroSection />

        {/* Services Grid */}
        <section 
          id="services" 
          ref={servicesAnimation.ref}
          className={`py-20 px-6 bg-secondary/30 transition-all duration-700 ${
            servicesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 font-display">
              The Ecosystem
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Four interconnected domains representing technology, creativity, knowledge, and leadership.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Link to="/dev" className="block h-full group">
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-white/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                        <Terminal className="w-6 h-6 text-accent" />
                      </div>
                      <CardTitle className="group-hover:text-accent transition-colors">Houcine.tech</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      Building scalable, modern applications with React, TypeScript, and cutting-edge web technologies.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Web Apps • API Design • Full-Stack Development</p>
                    <Button variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10 group-hover:border-accent/50">
                      View projects
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/designs" className="block h-full group">
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/10">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                        <Palette className="w-6 h-6 text-accent" />
                      </div>
                      <CardTitle className="group-hover:text-accent transition-colors">Houcine.studio</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      Crafting bold visual experiences through branding, UI/UX, and creative direction.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Branding • UI/UX • Visual Design</p>
                    <Button variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10 group-hover:border-accent/50">
                      View portfolio
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/reads" className="block h-full group">
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/10">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                        <BookOpen className="w-6 h-6 text-accent" />
                      </div>
                      <CardTitle className="group-hover:text-accent transition-colors">Houcine.education</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      A curated digital bookstore for learners exploring tech, design, and innovation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Digital Books • Learning Resources • Curated Knowledge</p>
                    <Button variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10 group-hover:border-accent/50">
                      Browse titles
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/manages" className="block h-full group">
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-white/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                        <Briefcase className="w-6 h-6 text-accent" />
                      </div>
                      <CardTitle className="group-hover:text-accent transition-colors">Houcine.management</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      Building and managing creative brands, artists, and strategic projects.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">DJ La Rosa View • The Shape Shifters • Brand Strategy</p>
                    <Button variant="outline" size="sm" className="border-accent/30 hover:bg-accent/10 group-hover:border-accent/50">
                      View case studies
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
