import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import profile from "@/assets/profile.png";

const AboutMe = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col items-center text-center space-y-8">
            <img 
              src={profile} 
              alt="Houcine Mohamed" 
              className="rounded-full w-48 h-48 object-cover border-4 border-metallic/20 shadow-2xl"
            />
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-metallic via-accent to-foreground bg-clip-text text-transparent">
                About Houcine Mohamed
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                A multidisciplinary creator at the intersection of technology, design, and innovation. 
                Building digital experiences that bridge creativity and functionality.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 w-full mt-8">
              <div className="text-left space-y-2 p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur">
                <h3 className="text-lg font-semibold text-accent">Developer</h3>
                <p className="text-muted-foreground">Creating innovative solutions in finance, data science, and AI.</p>
              </div>
              <div className="text-left space-y-2 p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur">
                <h3 className="text-lg font-semibold text-accent">Designer</h3>
                <p className="text-muted-foreground">Crafting visual identities and meaningful brand experiences.</p>
              </div>
              <div className="text-left space-y-2 p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur">
                <h3 className="text-lg font-semibold text-accent">Manager</h3>
                <p className="text-muted-foreground">Leading creative projects and building impactful brands.</p>
              </div>
              <div className="text-left space-y-2 p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur">
                <h3 className="text-lg font-semibold text-accent">Creator</h3>
                <p className="text-muted-foreground">Exploring music, visuals, and digital storytelling.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutMe;
