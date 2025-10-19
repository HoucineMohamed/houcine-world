import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Music, Theater, Video, Users, Mail, ExternalLink, Play, Instagram, Youtube } from "lucide-react";
import hajriPhoto from "@/assets/hajri-photo.jpeg";
import houcinePhoto from "@/assets/houcine-photo.jpg";
import timbreCover from "@/assets/timbre-cover.jpg";
import theViewCover from "@/assets/the-view-cover.png";
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
    { title: "DJ Sets", desc: "Custom curated music experiences for every vibe and occasion." },
    { title: "Private Parties", desc: "Exclusive performances for your intimate gatherings." },
    { title: "Club & Beach Events", desc: "High-energy sets at clubs and beach venues." },
    { title: "Corporate & Brand Events", desc: "Professional entertainment for corporate functions." },
    { title: "Music Production & Mixes", desc: "Professional audio production and mixing services." },
    { title: "Collaborations & Projects with Artists", desc: "Creative partnerships and artist collaborations." },
  ];

  const soundcloudTracks = [
    {
      title: "TIMBRE",
      url: "https://soundcloud.com/la-rosa-view/7c0cdbfc-1ddd-458d-8452-09c5c13360ab",
      coverUrl: timbreCover
    },
    {
      title: "The View 0.1",
      url: "https://soundcloud.com/la-rosa-view/the-view-0-1",
      coverUrl: theViewCover
    },
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
          <div className="mb-8 animate-fade-in group">
            <div className="relative inline-block">
              <img 
                src={laRosaLogo} 
                alt="La Rosa View" 
                className="w-64 h-64 mx-auto object-contain drop-shadow-2xl animate-pulse hover:animate-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-3" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-transparent to-rose-500/20 blur-3xl animate-pulse group-hover:scale-150 transition-all duration-700" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 animate-fade-in bg-gradient-to-r from-rose-400 via-rose-300 to-rose-500 bg-clip-text text-transparent px-4">
            Where Sound Meets Vision
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 sm:mb-12 animate-fade-in px-4">
            Crafting immersive musical and visual experiences
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in px-4">
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              What We Do
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Our Work in Motion
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 px-4">Experience our latest projects and performances</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[1, 2, 3].map((item) => (
              <Card
                key={item}
                className="group overflow-hidden border-border/50 hover:border-rose-500/50 transition-all duration-300 hover:scale-105 cursor-pointer"
              >
                <div className="aspect-video bg-gradient-to-br from-rose-900/20 to-background relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                    <Play className="w-12 h-12 sm:w-16 sm:h-16 text-rose-500" />
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Our Services
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Featured on Al Hayet FM
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 px-4">Watch our exclusive interview</p>
          
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-rose-900/40 to-background border-2 border-rose-500/30 shadow-2xl shadow-rose-600/30 hover:scale-105 hover:shadow-rose-600/50 transition-all duration-500">
                <img 
                  src={hajriPhoto} 
                  alt="Hajri Mohamed" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end p-4 sm:p-6 text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 drop-shadow-lg">Hajri Mohamed</h3>
                  <p className="text-rose-300 text-xs sm:text-sm drop-shadow-lg">DJ & Producer</p>
                </div>
                <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/10 transition-colors duration-500" />
              </div>
              <div className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-rose-900/40 to-background border-2 border-rose-500/30 shadow-2xl shadow-rose-600/30 hover:scale-105 hover:shadow-rose-600/50 transition-all duration-500">
                <img 
                  src={houcinePhoto} 
                  alt="Houcine Mohamed" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end p-4 sm:p-6 text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 drop-shadow-lg">Houcine Mohamed</h3>
                  <p className="text-rose-300 text-xs sm:text-sm drop-shadow-lg">Director</p>
                </div>
                <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/10 transition-colors duration-500" />
              </div>
            </div>
            <div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              The Vision Behind La Rosa View
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6 px-4">
            Where sound meets vision, creativity meets passion. La Rosa View is more than a name — it's a perspective on music, life, and art. Born from the belief that music spreads love and inspiration just like a rose spreads its fragrance.
          </p>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-4">
            From mixing at 15 to creating unforgettable experiences, we transform moments into memories. Every beat, every performance, every collaboration is a step in a revolution of sound and soul. This isn't just DJing — this is art through audio.
          </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Let's Create Together
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 px-4">Get in touch to bring your vision to life</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
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
                <h3 className="text-lg sm:text-xl font-semibold mb-4">Follow Our Journey</h3>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <a
                    href="https://www.instagram.com/la.rosaview/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 relative z-10" />
                    <span className="text-xs sm:text-sm font-medium relative z-10">Instagram</span>
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                  <a
                    href="https://www.tiktok.com/@larosaview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Video className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 relative z-10" />
                    <span className="text-xs sm:text-sm font-medium relative z-10">TikTok</span>
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                  <a
                    href="https://www.youtube.com/@LaRosa-View"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Youtube className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 relative z-10" />
                    <span className="text-xs sm:text-sm font-medium relative z-10">YouTube</span>
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                  <a
                    href="https://soundcloud.com/la-rosa-view"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all hover:scale-105 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/10 to-rose-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 relative z-10" />
                    <span className="text-xs sm:text-sm font-medium relative z-10">SoundCloud</span>
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Drops - SoundCloud Mixes */}
      <section className="py-24 px-6 bg-gradient-to-b from-background via-rose-950/10 to-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Latest Drops
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 px-4">Experience our freshest mixes on SoundCloud</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
            {soundcloudTracks.map((track, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-600/20 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={track.coverUrl} 
                      alt={track.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-4 sm:p-6">
                      <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{track.title}</h3>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <iframe
                      width="100%"
                      height="166"
                      scrolling="no"
                      frameBorder="no"
                      allow="autoplay"
                      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&color=%23e11d48&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
                      className="rounded-lg"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <a 
              href="https://soundcloud.com/la-rosa-view" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline" className="border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all hover:scale-105">
                <ExternalLink className="w-5 h-5 mr-2" />
                Explore All Mixes on SoundCloud
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              What People Say
            </span>
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 px-4">Hear from those who've experienced La Rosa View</p>
          
          <div className="relative mb-12">
            <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 scrollbar-hide snap-x snap-mandatory px-4 sm:px-0">
              <Card className="flex-shrink-0 w-[300px] sm:w-[400px] border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105 snap-center">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-rose-500 text-xl">★</span>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic leading-relaxed">
                    "Working with La Rosa was an incredible experience. During our events, La Rosa didn't just play music — he created an atmosphere. He lit up the dance floor with energy and rhythm, keeping everyone moving and smiling all night long. The vibes, the beats, and the connection with the crowd turned our party into a truly unforgettable night. La Rosa doesn't just DJ — he delivers emotions through sound."
                  </p>
                  <p className="text-sm font-semibold text-rose-400">— Leo Club Kairouan</p>
                </CardContent>
              </Card>
            </div>
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
      <section className="py-12 sm:py-16 px-6 bg-gradient-to-r from-rose-950/20 via-rose-900/10 to-rose-950/20 border-y border-rose-500/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 px-4">Stay in tune with our latest drops & events</h3>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto px-4">
            <Input placeholder="Enter your email" className="bg-background/50" />
            <Button className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105 whitespace-nowrap">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
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
