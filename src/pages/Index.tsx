import { Card } from "@/components/ui/card";
import { Code2, Palette, BookOpen, Briefcase, ArrowRight, Github, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import logoH from "@/assets/logo-h.png";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const ecosystemBranches = [
  {
    name: "Houcine.designs",
    path: "/designs",
    icon: Palette,
    description: "Branding, graphic design & UI/UX",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    name: "Houcine.dev",
    path: "/dev",
    icon: Code2,
    description: "Web development & FinTech solutions",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    name: "Houcine.reads",
    path: "/reads",
    icon: BookOpen,
    description: "Books & digital products",
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    name: "Houcine.manages",
    path: "/manages",
    icon: Briefcase,
    description: "Artist & brand management",
    color: "from-emerald-500/20 to-teal-500/20",
  },
];

const Index = () => {
  const cardsAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomCursor />
      
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={logoH} 
              alt="Houcine Logo" 
              className="h-8 w-auto transition-transform duration-500 group-hover:scale-110" 
            />
            <span className="text-lg font-light tracking-wide text-foreground/90 group-hover:text-accent transition-colors duration-300">
              Houcine.world
            </span>
          </Link>
        </div>
      </header>

      <main className="pt-24">
        {/* Hero Section - Ultra Minimal */}
        <section className="min-h-[70vh] flex items-center justify-center px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4 animate-fade-in">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-foreground">
                Houcine<span className="text-accent">.</span>world
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
                A unified ecosystem of design, technology, content, and management
              </p>
            </div>
            
            {/* Subtle scroll indicator */}
            <div className="pt-12 animate-bounce opacity-50">
              <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full mx-auto flex items-start justify-center p-2">
                <div className="w-1 h-2 bg-muted-foreground/50 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Navigation Grid */}
        <section 
          ref={cardsAnimation.ref}
          className={`py-24 px-6 lg:px-12 transition-all duration-700 ${
            cardsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {ecosystemBranches.map((branch, index) => {
                const Icon = branch.icon;
                return (
                  <Link
                    key={branch.path}
                    to={branch.path}
                    className="group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card className={`h-full border border-border/50 bg-gradient-to-br ${branch.color} backdrop-blur-sm hover:border-accent/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent/10`}>
                      <div className="p-8 lg:p-12 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-6">
                          <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 group-hover:border-accent/50 transition-all duration-300">
                            <Icon className="w-8 h-8 text-accent" />
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                        
                        <div className="space-y-3 flex-1">
                          <h3 className="text-2xl lg:text-3xl font-light tracking-tight text-foreground group-hover:text-accent transition-colors duration-300">
                            {branch.name}
                          </h3>
                          <p className="text-muted-foreground font-light leading-relaxed">
                            {branch.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* About the Ecosystem */}
        <section 
          ref={aboutAnimation.ref}
          className={`py-24 px-6 lg:px-12 transition-all duration-700 ${
            aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">
              About the Ecosystem
            </h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              Houcine.world brings together design, technology, content, and management into one cohesive creative identity. 
              Each branch represents a specialized focus, united by a commitment to excellence and innovation.
            </p>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border/40 py-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-6">
              <a 
                href="https://github.com/houcine" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors duration-300"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/in/houcine" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent transition-colors duration-300"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="mailto:contact@houcine.world"
                className="text-muted-foreground hover:text-accent transition-colors duration-300"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>

            {/* Copyright */}
            <div className="text-sm text-muted-foreground font-light">
              <p>© 2025 Houcine.world · Designed by Houcine</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
