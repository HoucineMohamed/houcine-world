import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Award, Calendar, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import laRosaLogo from "@/assets/larosa-logo.png";

const AboutDJ = () => {
  const highlights = [
    { icon: Music, title: "10+ Years Experience", desc: "Mastering the decks since 2013" },
    { icon: Award, title: "100+ Events", desc: "From intimate parties to massive festivals" },
    { icon: Calendar, title: "Versatile Sets", desc: "House, Techno, Afrobeat & more" },
    { icon: MapPin, title: "Based in Tunisia", desc: "Performing locally and internationally" },
  ];

  const journey = [
    { year: "2013", event: "Started DJ journey in local clubs" },
    { year: "2016", event: "First festival performance" },
    { year: "2019", event: "Founded La Rosa View" },
    { year: "2023", event: "Featured on Al Hayet FM" },
    { year: "2024", event: "International collaborations" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <Link to="/larosaview" className="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to La Rosa View</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20">
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
            <div className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-rose-900/40 to-background border-4 border-rose-500/30 shadow-2xl shadow-rose-600/40 flex items-center justify-center overflow-hidden">
              <img src={laRosaLogo} alt="Hajri Mohamed" className="w-32 h-32 object-contain" />
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
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
                The Story
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
                <p>
                  From the vibrant streets of Tunisia to stages around the world, Hajri Mohamed has been on a relentless mission to connect people through the universal language of music.
                </p>
                <p>
                  What started as a passion for mixing tracks in his bedroom evolved into a full-fledged career as one of Tunisia's most sought-after DJs. His unique ability to read the crowd and craft seamless journeys through sound has made him a favorite at clubs, festivals, and private events.
                </p>
                <p>
                  As the driving force behind La Rosa View, Hajri brings more than just technical skill to every performance. He brings energy, authenticity, and an unwavering commitment to creating moments that resonate long after the music stops.
                </p>
                <p>
                  His versatile style spans multiple genres — from deep house to afrobeat, techno to progressive — allowing him to curate experiences that are both diverse and deeply personal.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-24 px-6 bg-gradient-to-b from-background via-rose-950/10 to-background">
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
      <section className="py-24 px-6">
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
      <section className="py-24 px-6 bg-gradient-to-b from-background via-rose-950/10 to-background">
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
      <section className="py-24 px-6">
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
