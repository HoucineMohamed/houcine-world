import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Music, Theater, Video, Users, Mail, ExternalLink, Play } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import laRosaLogo from "@/assets/larosa-logo.png";

const LaRosaView = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  const highlights = [
    { icon: Music, title: "Music Production", desc: "From concept to mix." },
    { icon: Theater, title: "Live Performances", desc: "Experience-driven shows." },
    { icon: Video, title: "Media & Visuals", desc: "Video, branding, and creative direction." },
    { icon: Users, title: "Artist Collaboration", desc: "Partnering to shape sound and style." },
  ];

  const services = [
    { title: "Event Booking", desc: "Private events, festivals, and special occasions." },
    { title: "Private Parties", desc: "Exclusive DJ sets for your intimate gatherings." },
    { title: "Music Production", desc: "Professional audio production and mixing." },
    { title: "Live Performances", desc: "High-energy DJ sets that captivate audiences." },
    { title: "DJ Sets", desc: "Custom curated music experiences for every vibe." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/manages" className="inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Manages</span>
          </Link>
          <Link 
            to="/about-dj" 
            className="inline-flex items-center gap-2 text-foreground hover:text-rose-400 transition-all hover:scale-105 font-semibold px-4 py-2 rounded-lg hover:bg-rose-500/10"
          >
            About the DJ
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 via-background to-background">
          <div className="absolute inset-0 opacity-20">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-rose-500/30"
                style={{
                  width: Math.random() * 300 + 50 + "px",
                  height: Math.random() * 300 + 50 + "px",
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

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <img src={laRosaLogo} alt="La Rosa View" className="w-64 h-64 mx-auto object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in bg-gradient-to-r from-rose-400 via-rose-300 to-rose-500 bg-clip-text text-transparent">
            Where Sound Meets Vision
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 animate-fade-in">
            Crafting immersive musical and visual experiences
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link to="/booking">
              <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105">
                Book Now
              </Button>
            </Link>
            <a href="https://www.youtube.com/live/art7YToqAKM" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all hover:scale-105">
                <Play className="w-4 h-4 mr-2" />
                Watch Showreel
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-24 px-6 relative">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              What We Do
            </span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-rose-600/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                    <item.icon className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Works */}
      <section className="py-24 px-6 bg-gradient-to-b from-background via-rose-950/10 to-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Our Work in Motion
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">Experience our latest projects and performances</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((item) => (
              <Card
                key={item}
                className="group overflow-hidden border-border/50 hover:border-rose-500/50 transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <div className="aspect-video bg-gradient-to-br from-rose-900/20 to-background relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                    <Play className="w-16 h-16 text-rose-500" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button variant="outline" className="border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500">
              See All Projects
            </Button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Our Services
            </span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {services.map((service, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-rose-600/20"
              >
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-rose-400 transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground text-sm">{service.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Link to="/booking">
              <Button size="lg" className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105">
                Request a Quote
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Al Hayet FM Interview */}
      <section className="py-24 px-6 bg-gradient-to-b from-background via-rose-950/10 to-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Featured on Al Hayet FM
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">Watch our exclusive interview</p>
          
          <a 
            href="https://www.youtube.com/live/art7YToqAKM" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block max-w-4xl mx-auto group"
          >
            <div className="relative rounded-2xl overflow-hidden border-2 border-rose-500/30 hover:border-rose-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-rose-600/40">
              <div className="aspect-video bg-gradient-to-br from-rose-900/40 to-background relative">
                <img 
                  src="https://i.ytimg.com/vi/art7YToqAKM/maxresdefault.jpg" 
                  alt="La Rosa View X Al Hayet FM" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                  <Play className="w-24 h-24 text-rose-500 animate-pulse" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-2xl font-bold text-white mb-2">La Rosa View X Al Hayet FM</h3>
                  <p className="text-rose-300">Exclusive behind-the-scenes interview</p>
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* About Us */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-6">
              <div className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-rose-900/40 to-background border border-rose-500/20 shadow-2xl shadow-rose-600/20 hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-32 h-32 rounded-full bg-rose-500/20 mb-4 flex items-center justify-center group-hover:bg-rose-500/30 transition-colors">
                    <Users className="w-16 h-16 text-rose-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Hajri Mohamed</h3>
                  <p className="text-rose-300 text-sm">DJ & Producer</p>
                </div>
              </div>
              <div className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-rose-900/40 to-background border border-rose-500/20 shadow-2xl shadow-rose-600/20 hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-32 h-32 rounded-full bg-rose-500/20 mb-4 flex items-center justify-center group-hover:bg-rose-500/30 transition-colors">
                    <Users className="w-16 h-16 text-rose-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Houcine Mohamed</h3>
                  <p className="text-rose-300 text-sm">Director</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
                  The Vision Behind La Rosa View
                </span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Where rhythm meets artistry, La Rosa View transforms sonic landscapes into unforgettable journeys. Born from the fusion of cutting-edge production and authentic performance, we craft experiences that transcend the ordinary.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every beat tells a story, every performance ignites passion, and every collaboration shapes the future of sound. We don't just create music — we architect emotions that resonate long after the final note fades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Let's Create Together
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">Get in touch to bring your vision to life</p>
          
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Input
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Your Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Your Message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-8">
              <a href="mailto:contactlarosaview@gmail.com" className="block">
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105 cursor-pointer hover:shadow-xl hover:shadow-rose-600/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                        <Mail className="w-6 h-6 text-rose-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Email Us</h3>
                        <p className="text-rose-400 hover:text-rose-300 transition-colors">
                          contactlarosaview@gmail.com
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>

              <div>
                <h3 className="text-xl font-semibold mb-4">Follow Our Journey</h3>
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href="https://instagram.com/la.rosaview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="text-sm font-medium relative z-10">Instagram</span>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                  <a
                    href="https://www.tiktok.com/@larosaview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="text-sm font-medium relative z-10">TikTok</span>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                  <a
                    href="https://www.youtube.com/@LaRosa-View"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="text-sm font-medium relative z-10">YouTube</span>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                  <a
                    href="https://soundcloud.com/la-rosa-view"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="text-sm font-medium relative z-10">SoundCloud</span>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              What People Say
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">Hear from those who've experienced La Rosa View</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-rose-500 text-xl">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"An unforgettable experience. The energy was electric from start to finish!"</p>
                <p className="text-sm font-semibold">— Sarah K.</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-rose-500 text-xl">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"Professional, talented, and truly passionate about their craft. Highly recommend!"</p>
                <p className="text-sm font-semibold">— Marc T.</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-rose-500 text-xl">★</span>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"They turned our event into a night we'll never forget. Absolutely phenomenal!"</p>
                <p className="text-sm font-semibold">— Yasmine B.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground mb-6">Share your experience with us</p>
            <Link to="/booking">
              <Button variant="outline" className="border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all hover:scale-105">
                Leave a Review
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 px-6 bg-gradient-to-r from-rose-950/20 via-rose-900/10 to-rose-950/20 border-y border-rose-500/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Stay in tune with our latest drops & events</h3>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input placeholder="Enter your email" className="bg-background/50" />
            <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105">
              Subscribe
            </Button>
          </div>
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

export default LaRosaView;
