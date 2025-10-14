import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Moon, Sun, Github, Linkedin, Instagram, Mail, Code2, Palette, BookOpen, Briefcase, Sparkles, Download, ExternalLink } from "lucide-react";

const Index = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <a href="#home" className="text-2xl font-bold bg-gradient-to-r from-accent to-tech-blue bg-clip-text text-transparent">
              Houcine.world
            </a>
            <div className="flex items-center gap-6">
              <a href="#dev" className="hover:text-accent transition-colors">Dev</a>
              <a href="#designs" className="hover:text-accent transition-colors">Designs</a>
              <a href="#reads" className="hover:text-accent transition-colors">Reads</a>
              <a href="#about" className="hover:text-accent transition-colors">About</a>
              <a href="#contact" className="hover:text-accent transition-colors">Contact</a>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="home" className="pt-32 pb-20 px-6">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="animate-fade-in">
              <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-accent to-tech-blue bg-clip-text text-transparent">
                Houcine.world
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                The creative ecosystem of Houcine Mohamed — exploring technology, design, management, and innovation.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <ExternalLink className="mr-2 w-5 h-5" />
                  Explore My Work
                </Button>
                <Button size="lg" variant="outline">
                  <Download className="mr-2 w-5 h-5" />
                  View CV
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Houcine.dev Section */}
        <section id="dev" className="py-20 px-6 bg-secondary/30">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-4">
              <Code2 className="w-8 h-8 text-tech-blue" />
              <h2 className="text-4xl font-bold">Houcine.dev</h2>
            </div>
            <p className="text-muted-foreground mb-12 text-lg">
              Showcasing innovative projects in finance, data, and AI — built by a student passionate about the future of tech.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "AI Trading Bot", desc: "Automated trading system using machine learning", tech: "Python, TensorFlow" },
                { title: "FinTech Dashboard", desc: "Real-time financial analytics platform", tech: "React, Node.js" },
                { title: "Data Pipeline", desc: "ETL pipeline for financial data processing", tech: "Python, Apache Airflow" },
              ].map((project, i) => (
                <Card key={i} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="group-hover:text-tech-blue transition-colors">{project.title}</CardTitle>
                    <CardDescription>{project.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{project.tech}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      <Github className="mr-2 w-4 h-4" />
                      View on GitHub
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Houcine.designs Section */}
        <section id="designs" className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-8 h-8 text-accent" />
              <h2 className="text-4xl font-bold">Houcine.designs</h2>
            </div>
            <p className="text-muted-foreground mb-12 text-lg">
              Visual identity design, branding, and creative direction — turning ideas into aesthetic digital experiences.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-gradient-to-br from-accent/20 to-tech-blue/20 hover:scale-105 transition-transform duration-300 cursor-pointer border border-border/30 flex items-center justify-center"
                >
                  <Palette className="w-12 h-12 text-muted-foreground/50" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Houcine.reads Section */}
        <section id="reads" className="py-20 px-6 bg-secondary/30">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-8 h-8 text-accent" />
              <h2 className="text-4xl font-bold">Houcine.reads</h2>
            </div>
            <p className="text-muted-foreground mb-12 text-lg">
              A digital bookstore empowering learners through curated resources in data, finance, and AI.
            </p>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[
                "Machine Learning Mastery",
                "Financial Markets 101",
                "Python for Finance",
                "AI Ethics Guide",
              ].map((book, i) => (
                <Card key={i} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <div className="h-48 bg-gradient-to-br from-accent/30 to-tech-blue/30 rounded-lg mb-4 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                    <CardTitle className="text-lg">{book}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Houcine.manages Section */}
        <section id="manages" className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-8 h-8 text-tech-blue" />
              <h2 className="text-4xl font-bold">Houcine.manages</h2>
            </div>
            <p className="text-muted-foreground mb-12 text-lg">
              Building creative brands and managing artistic projects through strategic design and marketing.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { name: "DJ La Rosa View", reach: "50K+ Followers", desc: "Music brand and event management" },
                { name: "The Shape Shifters", reach: "25K+ Reach", desc: "Creative collective and multimedia project" },
              ].map((brand, i) => (
                <Card key={i} className="hover:shadow-2xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-2xl">{brand.name}</CardTitle>
                    <CardDescription className="text-lg">{brand.reach}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{brand.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Houcine.creates Section */}
        <section id="creates" className="py-20 px-6 bg-secondary/30">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-accent" />
              <h2 className="text-4xl font-bold">Houcine.creates</h2>
            </div>
            <p className="text-muted-foreground mb-12 text-lg">
              Exploring creativity through music, visuals, and storytelling.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {["Music Production", "Photography", "Creative Direction"].map((item, i) => (
                <Card key={i} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <div className="h-40 bg-gradient-to-br from-accent/20 to-tech-blue/20 rounded-lg mb-4"></div>
                    <CardTitle>{item}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold mb-6">About Me</h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              I'm Houcine Mohamed, a 17-year-old student passionate about technology, design, and entrepreneurship.
              Currently exploring the intersection of AI, finance, and creative direction while building projects
              that make a difference.
            </p>
            <Button size="lg" className="bg-tech-blue text-tech-blue-foreground hover:bg-tech-blue/90">
              <Download className="mr-2 w-5 h-5" />
              Download Full CV
            </Button>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 px-6 bg-secondary/30">
          <div className="container mx-auto max-w-2xl">
            <h2 className="text-4xl font-bold mb-12 text-center">Get in Touch</h2>
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <form className="space-y-6">
                  <div>
                    <Input placeholder="Your Name" className="bg-background/50" />
                  </div>
                  <div>
                    <Input type="email" placeholder="Your Email" className="bg-background/50" />
                  </div>
                  <div>
                    <Textarea placeholder="Your Message" rows={5} className="bg-background/50" />
                  </div>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Mail className="mr-2 w-5 h-5" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-6 mt-12">
              <a href="#" className="p-3 rounded-lg bg-secondary hover:bg-accent transition-colors">
                <Github className="w-6 h-6" />
              </a>
              <a href="#" className="p-3 rounded-lg bg-secondary hover:bg-accent transition-colors">
                <Linkedin className="w-6 h-6" />
              </a>
              <a href="#" className="p-3 rounded-lg bg-secondary hover:bg-accent transition-colors">
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-border/40">
          <div className="container mx-auto text-center text-muted-foreground">
            <p>© 2025 Houcine.world — All Rights Reserved</p>
          </div>
        </footer>
      </div>
  );
};

export default Index;
