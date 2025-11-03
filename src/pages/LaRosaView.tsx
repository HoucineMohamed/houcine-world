import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Music, Theater, Video, Users, Mail, ExternalLink, Play, Instagram, Youtube, ChevronDown } from "lucide-react";
import hajriPhoto from "@/assets/hajri-photo.jpeg";
import houcinePhoto from "@/assets/houcine-photo.jpg";
import timbreCover from "@/assets/timbre-cover.jpg";
import theViewCover from "@/assets/the-view-cover.png";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import laRosaLogo from "@/assets/larosa-logo.png";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import ChatWidget from "@/components/ChatWidget";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const LaRosaView = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  // Scroll animation hooks for different sections
  const whatWeDoAnimation = useScrollAnimation();
  const featuredWorksAnimation = useScrollAnimation();
  const servicesAnimation = useScrollAnimation();
  const alHayetAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();
  const contactAnimation = useScrollAnimation();
  const soundcloudAnimation = useScrollAnimation();
  const testimonialsAnimation = useScrollAnimation();

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
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />
      
      {/* Custom Cursor (Desktop Only) */}
      <CustomCursor />
      
      {/* Chat Widget */}
      <ChatWidget />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <Link to="/manages" className="inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-foreground hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background rounded">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-semibold">Back</span>
          </Link>
          <Link 
            to="/about-dj" 
            className="inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-foreground hover:text-rose-400 transition-all hover:scale-105 font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-background"
          >
            About DJ
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full">
          {/* Placeholder for background video - user can replace with actual DJ footage */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/60 via-background/90 to-background/80">
            {/* Animated particles simulating crowd/lights effect */}
            <div className="absolute inset-0">
              {[...Array(80)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: Math.random() * 4 + 2 + "px",
                    height: Math.random() * 4 + 2 + "px",
                    left: Math.random() * 100 + "%",
                    top: Math.random() * 100 + "%",
                    background: `rgba(${Math.random() > 0.5 ? '244, 63, 94' : '251, 113, 133'}, ${Math.random() * 0.6 + 0.2})`,
                    filter: "blur(1px)",
                    animation: `float ${Math.random() * 15 + 10}s ease-in-out infinite, neonPulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 5}s`,
                  }}
                />
              ))}
            </div>
            {/* Sound wave lines */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-rose-500"
                  style={{
                    animation: `soundWave ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/30 to-background" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          {/* Logo with neon glow */}
          <div className="mb-12 relative">
            <div className="relative inline-block">
              <img 
                src={laRosaLogo} 
                alt="La Rosa View - Professional DJ and Music Production Services" 
                className="w-56 h-56 sm:w-72 sm:h-72 mx-auto object-contain drop-shadow-2xl" 
                loading="eager"
                style={{
                  filter: "drop-shadow(0 0 30px rgba(244, 63, 94, 0.4))",
                }}
              />
              {/* Neon glow rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-rose-500/30 neon-ring-1" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-rose-500/20 neon-ring-2" />
              </div>
              {/* Pulsing glow */}
              <div className="absolute inset-0 bg-rose-500/20 blur-3xl neon-glow" />
            </div>
          </div>

          {/* Animated Tagline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-8 relative">
            <span className="inline-block bg-gradient-to-r from-rose-400 via-rose-300 to-rose-500 bg-clip-text text-transparent pulse-text">
              Where Sound Meets Vision.
            </span>
          </h1>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 px-4">
            <Link to="/booking" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105 neon-button">
                Book La Rosa
              </Button>
            </Link>
            <a href="https://www.youtube.com/live/art7YToqAKM" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all hover:scale-105 backdrop-blur-sm">
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                Watch Showreel
              </Button>
            </a>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator">
            <div className="flex flex-col items-center gap-2 text-rose-400 animate-bounce">
              <span className="text-sm font-medium tracking-wider">SCROLL</span>
              <ChevronDown className="w-6 h-6" />
              <div className="w-0.5 h-12 bg-gradient-to-b from-rose-500 to-transparent soundwave-line" />
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section 
        ref={whatWeDoAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 relative transition-all duration-700 ${
          whatWeDoAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              What We Do
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {highlights.map((item, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-rose-600/20 hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4 sm:p-5 md:p-6 text-center">
                  <div className="mb-3 sm:mb-4 inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                    <item.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-rose-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2">{item.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Works */}
      <section 
        ref={featuredWorksAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-gradient-to-b from-background via-rose-950/10 to-background transition-all duration-700 ${
          featuredWorksAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 sm:mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Our Work in Motion
            </span>
          </h2>
          <p className="text-sm sm:text-base text-center text-muted-foreground mb-6 sm:mb-8 md:mb-12 px-4">Experience our latest projects and performances</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[1, 2, 3].map((item) => (
              <Card
                key={item}
                className="group overflow-hidden border-border/50 hover:border-rose-500/50 transition-all duration-300 hover:scale-105 cursor-pointer hover-lift"
              >
                <div className="aspect-video bg-gradient-to-br from-rose-900/20 to-background relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                    <Play className="w-12 h-12 sm:w-16 sm:h-16 text-rose-500" aria-hidden="true" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button variant="outline" className="text-sm sm:text-base px-5 sm:px-6 py-2 sm:py-2.5 border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500">
              See All Projects
            </Button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section 
        ref={servicesAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 transition-all duration-700 ${
          servicesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-12 md:mb-16 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Our Services
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
            {services.map((service, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-rose-600/20 hover-lift"
              >
                <CardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 group-hover:text-rose-400 transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">{service.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Link to="/booking" className="inline-block w-full sm:w-auto">
              <Button className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105">
                Request a Quote
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Al Hayet FM Interview */}
      <section 
        ref={alHayetAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-gradient-to-b from-background via-rose-950/10 to-background transition-all duration-700 ${
          alHayetAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 sm:mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Featured on Al Hayet FM
            </span>
          </h2>
          <p className="text-sm sm:text-base text-center text-muted-foreground mb-6 sm:mb-8 md:mb-12 px-4">Watch our exclusive interview</p>
          
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
                  alt="La Rosa View featured on Al Hayet FM - Behind the scenes interview with DJ La Rosa" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                  <Play className="w-24 h-24 text-rose-500 animate-pulse" aria-hidden="true" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">La Rosa View X Al Hayet FM</h3>
                  <p className="text-sm sm:text-base text-rose-300">Exclusive behind-the-scenes interview</p>
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* About Us */}
      <section 
        ref={aboutAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 transition-all duration-700 ${
          aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 md:mb-0">
              <div className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-rose-900/40 to-background border-2 border-rose-500/30 shadow-2xl shadow-rose-600/30 hover:scale-105 hover:shadow-rose-600/50 transition-all duration-500">
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
              <div className="group relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-rose-900/40 to-background border-2 border-rose-500/30 shadow-2xl shadow-rose-600/30 hover:scale-105 hover:shadow-rose-600/50 transition-all duration-500">
                <img 
                  src={houcinePhoto} 
                  alt="Houcine Mohamed" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end p-4 sm:p-6 text-center">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1 drop-shadow-lg">Houcine Mohamed</h3>
                  <p className="text-rose-300 text-xs sm:text-sm drop-shadow-lg">Director</p>
                </div>
                <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/10 transition-colors duration-500" />
              </div>
            </div>
            <div className="text-center md:text-left">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              The Vision Behind La Rosa View
            </span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-3 sm:mb-4 md:mb-6 px-4">
            Where sound meets vision, creativity meets passion. La Rosa View is more than a name — it's a perspective on music, life, and art. Born from the belief that music spreads love and inspiration just like a rose spreads its fragrance.
          </p>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed px-4">
            From mixing at 15 to creating unforgettable experiences, we transform moments into memories. Every beat, every performance, every collaboration is a step in a revolution of sound and soul. This isn't just DJing — this is art through audio.
          </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section 
        id="quote-form"
        ref={contactAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 transition-all duration-700 ${
          contactAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 sm:mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Let's Create Together
            </span>
          </h2>
          <p className="text-sm sm:text-base text-center text-muted-foreground mb-6 sm:mb-8 md:mb-12 px-4">Get in touch to bring your vision to life</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            {/* Contact Form */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="p-4 sm:p-6 md:p-8">
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
                  <Button type="submit" className="w-full text-sm sm:text-base py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6 sm:space-y-8">
              <a href="mailto:contactlarosaview@gmail.com" className="block">
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105 cursor-pointer hover:shadow-xl hover:shadow-rose-600/20">
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors flex-shrink-0">
                        <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold mb-0.5 sm:mb-1">Email Us</h3>
                        <p className="text-xs sm:text-sm text-rose-400 hover:text-rose-300 transition-colors break-all">
                          contactlarosaview@gmail.com
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>

              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">Follow Our Journey</h3>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
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
      <section 
        ref={soundcloudAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-gradient-to-b from-background via-rose-950/10 to-background transition-all duration-700 ${
          soundcloudAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 sm:mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              Latest Drops
            </span>
          </h2>
          <p className="text-sm sm:text-base text-center text-muted-foreground mb-6 sm:mb-8 md:mb-12 px-4">Experience our freshest mixes on SoundCloud</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
            {soundcloudTracks.map((track, index) => (
              <Card
                key={index}
                className="group border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-600/20 overflow-hidden hover-lift"
              >
                <CardContent className="p-0">
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={track.coverUrl} 
                      alt={`${track.title} - Latest music mix by La Rosa View on SoundCloud`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-3 sm:p-4 md:p-6">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-lg">{track.title}</h3>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 md:p-6">
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
              className="inline-block w-full sm:w-auto"
            >
              <Button variant="outline" className="w-full sm:w-auto text-sm sm:text-base px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all hover:scale-105">
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Explore All Mixes on SoundCloud</span>
                <span className="sm:hidden">View All on SoundCloud</span>
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section 
        ref={testimonialsAnimation.ref}
        className={`py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 transition-all duration-700 ${
          testimonialsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 sm:mb-6 px-4">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              What People Say
            </span>
          </h2>
          <p className="text-sm sm:text-base text-center text-muted-foreground mb-6 sm:mb-8 md:mb-12 px-4">Hear from those who've experienced La Rosa View</p>
          
          <div className="relative mb-8 sm:mb-10 md:mb-12">
            <div className="flex overflow-x-auto gap-3 sm:gap-4 md:gap-6 pb-4 scrollbar-hide snap-x snap-mandatory px-4 sm:px-0">
              <Card className="flex-shrink-0 w-[280px] sm:w-[350px] md:w-[400px] border-border/50 bg-card/50 backdrop-blur hover:border-rose-500/50 transition-all hover:scale-105 snap-center">
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="flex gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-rose-500 text-lg sm:text-xl">★</span>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-3 sm:mb-4 italic leading-relaxed">
                    "Working with La Rosa was an incredible experience. During our events, La Rosa didn't just play music — he created an atmosphere. He lit up the dance floor with energy and rhythm, keeping everyone moving and smiling all night long. The vibes, the beats, and the connection with the crowd turned our party into a truly unforgettable night. La Rosa doesn't just DJ — he delivers emotions through sound."
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-rose-400">— Leo Club Kairouan</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Share your experience with us</p>
            <Link to="/booking" className="inline-block w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3 border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all hover:scale-105">
                Leave a Review
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 bg-gradient-to-r from-rose-950/20 via-rose-900/10 to-rose-950/20 border-y border-rose-500/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 px-4">Stay in tune with our latest drops & events</h3>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto px-4">
            <Input placeholder="Enter your email" className="bg-background/50 text-sm sm:text-base" />
            <Button className="text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105 whitespace-nowrap">
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
