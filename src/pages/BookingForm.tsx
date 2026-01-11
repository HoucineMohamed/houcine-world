import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Sparkles, Loader2 } from "lucide-react";
import logoH from "@/assets/logo-h.png";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useFormSubmission } from "@/hooks/useFormSubmission";

const BookingForm = () => {
  const formAnimation = useScrollAnimation();
  const { submitForm, isSubmitting } = useFormSubmission();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "",
    date: "",
    location: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.eventType || !formData.date || !formData.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    const success = await submitForm({
      pageName: "Booking",
      formType: "DJ Booking Request",
      userName: formData.name,
      userEmail: formData.email,
      userPhone: formData.phone || undefined,
      serviceType: formData.eventType,
      message: formData.message || undefined,
      additionalData: {
        eventDate: formData.date,
        eventLocation: formData.location,
      },
    });

    if (success) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        eventType: "",
        date: "",
        location: "",
        message: "",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="inline-block hover:scale-110 transition-all duration-200 group">
            <img 
              src={logoH} 
              alt="Houcine.world home" 
              className="h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                filter: "drop-shadow(0 0 8px rgba(103, 232, 249, 0))",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0.5))"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0))"}
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <section 
        ref={formAnimation.ref}
        className={`relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16 transition-all duration-700 ${
          formAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        {/* Animated Background */}
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

        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Visual Element */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-rose-900/20 rounded-3xl blur-3xl" />
                <div className="relative bg-gradient-to-br from-rose-900/40 to-background border border-rose-500/30 rounded-3xl p-12 backdrop-blur">
                  <Sparkles className="w-16 h-16 text-rose-400 mb-6 animate-pulse" />
                  <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
                    Let's Create Magic Together
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    Ready to elevate your event? Fill out the form and let's discuss how we can bring your vision to life with unforgettable music and energy.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                        <span className="text-rose-400 font-bold">1</span>
                      </div>
                      <p className="text-sm">Share your event details</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                        <span className="text-rose-400 font-bold">2</span>
                      </div>
                      <p className="text-sm">We'll review and respond within 24h</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                        <span className="text-rose-400 font-bold">3</span>
                      </div>
                      <p className="text-sm">Let's make your event legendary</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Booking Form */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl shadow-rose-600/20">
              <CardContent className="p-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
                  Book La Rosa View
                </h1>
                <p className="text-muted-foreground mb-8">Tell us about your event</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Full Name *</label>
                      <Input
                        required
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email *</label>
                      <Input
                        required
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="+216 XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Event Type *</label>
                    <Select value={formData.eventType} onValueChange={(value) => setFormData({ ...formData, eventType: value })}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private-party">Private Party</SelectItem>
                        <SelectItem value="wedding">Wedding</SelectItem>
                        <SelectItem value="corporate">Corporate Event</SelectItem>
                        <SelectItem value="festival">Festival</SelectItem>
                        <SelectItem value="club">Club Night</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Event Date *</label>
                      <Input
                        required
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location *</label>
                      <Input
                        required
                        placeholder="City, Venue"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Additional Details</label>
                    <Textarea
                      rows={5}
                      placeholder="Tell us more about your event, expected number of guests, special requirements..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="bg-background/50"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/50 hover:shadow-rose-600/70 transition-all hover:scale-105"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Booking Request
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
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

export default BookingForm;
