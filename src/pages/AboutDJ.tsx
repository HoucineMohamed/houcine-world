import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Award, Calendar, MapPin, ExternalLink } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import laRosaLogo from "@/assets/images/larosaview-logo.png";
import profilePhoto from "@/assets/hajri-photo.jpeg";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const AboutDJ = () => {
  const heroAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();
  const highlightsAnimation = useScrollAnimation();
  const interviewAnimation = useScrollAnimation();
  const ctaAnimation = useScrollAnimation();
  
  const highlights = [
    { icon: Music, title: "+1 Year of Experience", desc: "Crafting beats with passion" },
    { icon: Award, title: "+25 Events", desc: "From private parties to massive clubs" },
    { icon: Calendar, title: "Versatile Sets", desc: "House, Techno, Afrobeat & more" },
    { icon: MapPin, title: "Based in Tunisia", desc: "Spreading music across the nation" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
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
          <Link to="/larosaview" className="inline-block hover:scale-110 transition-all duration-200 group">
            <img 
              src={laRosaLogo} 
              alt="La Rosa View home" 
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
        className={`relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20 transition-all duration-700 ${
          heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 via-background to-background">
          <div className="absolute inset-0 opacity-20">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-rose-500/30"
                style={{
                  width: Math.random() * 200 + 50 + "px",
                  height: Math.random() * 200 + 50 + "px",
                  left: Math.random() * 100 + "%",
                  top: Math.random() * 100 + "%",
                  filter: "blur(60px)",
                  animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
                  animationDelay: Math.random() * 5 + "s",
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-rose-900/40 to-background border-4 border-rose-500/30 shadow-2xl shadow-rose-600/40 overflow-hidden group hover:scale-110 transition-transform duration-500">
              <img src={profilePhoto} alt="Hajri Mohamed" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 animate-fade-in bg-gradient-to-r from-rose-400 via-rose-300 to-rose-500 bg-clip-text text-transparent">
            Hajri Mohamed
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-6 animate-fade-in">
            DJ & Music Producer at La Rosa View
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Crafting sonic experiences that move souls and ignite dance floors
          </p>
        </div>
      </section>

      {/* About Section */}
      <section 
        ref={aboutAnimation.ref}
        className={`py-24 px-6 transition-all duration-700 ${
          aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-4xl">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">🩵</span> The Story of La Rosa View
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  La Rosa is not a DJ who spends hours mixing just to make money or chase fame.
                  La Rosa has a vision — a way of seeing music, life, and art from a unique perspective. That's why it's called <span className="text-rose-400 font-semibold">La Rosa View</span>.
                </p>
                <p>
                  The name <span className="text-rose-400 font-semibold">La Rosa</span> comes from the Spanish word for rose — an iconic, rare, and timeless flower that spreads positivity through its fragrance.
                  Just like that, La Rosa spreads music, love, and inspiration through sound.
                </p>
                <p>
                  From the young age of 15 and 16, La Rosa was already breaking boundaries — creating, producing, and performing with a unique energy that set him apart.
                  His story is about more than beats and lights; it's about dreams, creativity, and passion — the belief that with effort and heart, you can turn vision into reality.
                </p>
                <p>
                  For La Rosa, being a DJ isn't just a passion — it's a <span className="text-rose-400 font-semibold">revolution</span>. A journey of sound and self-expression that keeps inspiring others.
                </p>
                <p className="text-xl font-semibold text-rose-300">
                  La Rosa isn't just a DJ. La Rosa is a vision — a view of music through the soul.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Highlights */}
      <section 
        ref={highlightsAnimation.ref}
        className={`py-24 px-6 bg-gradient-to-b from-background via-rose-950/10 to-background transition-all duration-700 ${
          highlightsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Career Highlights
            </span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-rose-600/20"
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                    <item.icon className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Timeline */}
      <section 
        ref={journeyAnimation.ref}
        className={`py-24 px-6 transition-all duration-700 ${
          journeyAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              The Journey
            </span>
          </h2>
          <div className="space-y-6">
            {journey.map((item, index) => (
              <div
                key={index}
                className="flex gap-6 items-start group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-20 text-right">
                  <span className="text-2xl font-bold text-rose-500">{item.year}</span>
                </div>
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-rose-500 mt-2 group-hover:scale-150 transition-transform" />
                <Card className="flex-1 border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105">
                  <CardContent className="p-4">
                    <p className="text-lg">{item.event}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Interview */}
      <section 
        ref={interviewAnimation.ref}
        className={`py-24 px-6 bg-gradient-to-b from-background via-rose-950/10 to-background transition-all duration-700 ${
          interviewAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Featured on Al Hayet FM
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">Watch the exclusive interview</p>
          
          <a 
            href="https://www.youtube.com/live/art7YToqAKM" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="relative rounded-2xl overflow-hidden border-2 border-rose-500/30 hover:border-rose-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-rose-600/40">
              <div className="aspect-video bg-gradient-to-br from-rose-900/40 to-background relative">
                <img 
                  src="https://i.ytimg.com/vi/art7YToqAKM/maxresdefault.jpg" 
                  alt="La Rosa View X Al Hayet FM" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                  <div className="text-center">
                    <ExternalLink className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-white font-semibold">Watch on YouTube</p>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaAnimation.ref}
        className={`py-24 px-6 transition-all duration-700 ${
          ctaAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Ready to Book?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Let's create an unforgettable experience for your next event
          </p>
          <Link to="/booking">
            <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105">
              Book Now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-30px) translateX(20px);
          }
          66% {
            transform: translateY(20px) translateX(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default AboutDJ;
