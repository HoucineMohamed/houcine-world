import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Manages = () => {
  const contentAnimation = useScrollAnimation();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Home</span>
          </Link>
        </div>
      </header>

      <main 
        ref={contentAnimation.ref}
        className={`pt-24 pb-16 px-6 transition-all duration-700 ${
          contentAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <Briefcase className="w-12 h-12 text-tech-blue" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Houcine.manages</h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-12">
            Building creative brands and projects — coming soon.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <Link 
              to="/larosaview"
              className="group block transition-all duration-300 hover:scale-105"
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur h-full group-hover:border-tech-blue/50 group-hover:shadow-xl group-hover:shadow-tech-blue/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="group-hover:text-tech-blue transition-colors">DJ La Rosa View</CardTitle>
                  <CardDescription>Music brand management</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Creative direction and brand development for DJ La Rosa View.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card className="border-border/50 bg-card/50 backdrop-blur h-full opacity-60 cursor-not-allowed">
              <CardHeader>
                <CardTitle>The Shape Shifters</CardTitle>
                <CardDescription>Creative collective — Coming Soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Managing and developing innovative creative projects.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Manages;
