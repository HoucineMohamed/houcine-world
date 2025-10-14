import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Palette, BookOpen, Briefcase, Sparkles, ExternalLink } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/80">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#home" className="text-2xl font-bold bg-gradient-to-r from-accent to-tech-blue bg-clip-text text-transparent">
            Houcine.world
          </a>
          <nav className="flex items-center gap-6">
            <a href="#dev" className="hover:text-accent transition-colors">Dev</a>
            <a href="#designs" className="hover:text-accent transition-colors">Designs</a>
            <a href="#reads" className="hover:text-accent transition-colors">Reads</a>
            <a href="#manages" className="hover:text-accent transition-colors">Manages</a>
            <a href="#creates" className="hover:text-accent transition-colors">Creates</a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="pt-32 pb-16 px-6 text-center">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-accent to-tech-blue bg-clip-text text-transparent">
              Houcine.world
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              The creative ecosystem of Houcine Mohamed — exploring technology, design, management, and innovation.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a href="#trailer" className="inline-flex items-center rounded-md bg-accent text-accent-foreground px-5 py-3 hover:bg-accent/90 transition-colors">
                <ExternalLink className="mr-2 w-5 h-5" />
                Explore My Work
              </a>
              <Button variant="outline">View CV</Button>
            </div>
          </div>
        </section>

        {/* Trailer grid (teasers) */}
        <section id="trailer" className="py-10 px-6 bg-secondary/30">
          <div className="container mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Code2 className="w-8 h-8 text-tech-blue" />
                  <CardTitle>Houcine.dev</CardTitle>
                </div>
                <CardDescription>
                  Innovative projects in finance, data, and AI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Showcasing dashboards, bots, and automation.
                </p>
                <Button variant="outline" size="sm">See projects</Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Palette className="w-8 h-8 text-accent" />
                  <CardTitle>Houcine.designs</CardTitle>
                </div>
                <CardDescription>
                  Visual identity, branding, and creative direction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-accent/20 to-tech-blue/20" />
                  ))}
                </div>
                <Button variant="outline" size="sm">Open gallery</Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-accent" />
                  <CardTitle>Houcine.reads</CardTitle>
                </div>
                <CardDescription>
                  A curated digital bookstore for learners.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Machine Learning Mastery</li>
                  <li>• Python for Finance</li>
                  <li>• AI Ethics Guide</li>
                </ul>
                <Button variant="outline" size="sm">Browse titles</Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-8 h-8 text-tech-blue" />
                  <CardTitle>Houcine.manages</CardTitle>
                </div>
                <CardDescription>
                  Building creative brands and projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">DJ La Rosa View • The Shape Shifters</p>
                <Button variant="outline" size="sm">View case studies</Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-accent" />
                  <CardTitle>Houcine.creates</CardTitle>
                </div>
                <CardDescription>
                  Music, visuals, and storytelling.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-28 rounded-lg bg-gradient-to-br from-accent/20 to-tech-blue/20 mb-4" />
                <Button variant="outline" size="sm">Explore creativity</Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 border-t border-border/40">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 Houcine.world — All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
