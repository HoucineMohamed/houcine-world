import { useState, useEffect, useRef } from "react";
import { X, Headphones, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import laRosaLogo from "@/assets/larosa-logo.png";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [messageIndex, setMessageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const welcomeMessages = [
    "Hey there 👋 — welcome to La Rosa View!",
    "We blend sound, energy, and art — how can we help you today?",
  ];

  const contactInfoMessage = `📩 Contact La Rosa View

Email: larosaview@gmail.com
Instagram: @larosaview

Bookings & inquiries available 24/7.`;

  // Initialize position on mount
  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: window.innerWidth - 100,
        y: window.innerHeight - 100,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  // Sequential message animation
  useEffect(() => {
    if (isOpen && messageIndex < welcomeMessages.length) {
      const timer = setTimeout(() => {
        setMessageIndex((prev) => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messageIndex, welcomeMessages.length]);

  // Reset messages when closing
  useEffect(() => {
    if (!isOpen) {
      setMessageIndex(0);
      setShowContactInfo(false);
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return; // Don't drag when chat is open
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Boundary constraints
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 80;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const scrollToQuoteForm = () => {
    const quoteSection = document.getElementById("quote-form");
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  const handleContactTeam = () => {
    setShowContactInfo(true);
  };

  return (
    <>
      {/* Chat Button */}
      <div
        ref={widgetRef}
        className={`fixed z-50 transition-all duration-300 ${
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) setIsOpen(!isOpen);
          }}
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-rose-500/50 shadow-lg ${
            isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
          }`}
          style={{
            animation: "chatPulse 2s ease-in-out infinite",
          }}
          aria-label="Open chat widget"
        >
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full border-2 border-rose-400/30 animate-ping" />
          <div className="absolute inset-0 rounded-full border border-rose-400/20" style={{ animation: "chatRingPulse 3s ease-in-out infinite" }} />
          
          {/* Logo */}
          <img
            src={laRosaLogo}
            alt="La Rosa View Chat"
            className="absolute inset-2 sm:inset-3 w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
          />
          
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl" style={{ animation: "chatGlow 2s ease-in-out infinite" }} />
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 animate-fade-in"
          style={{ animation: "slideInRight 0.4s ease-out" }}
        >
          {/* Backdrop for mobile */}
          <div
            className="absolute inset-0 bg-black/50 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Container */}
          <div className="relative w-full sm:w-96 h-[70vh] sm:h-[600px] bg-gradient-to-br from-card to-card/95 backdrop-blur-xl border-2 border-rose-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-rose-600/20 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 bg-gradient-to-r from-rose-950/30 to-transparent">
              <div className="flex items-center gap-3">
                <img
                  src={laRosaLogo}
                  alt="La Rosa View"
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                />
                <div>
                  <h3 className="font-bold text-base sm:text-lg">La Rosa View</h3>
                  <p className="text-xs text-muted-foreground">Online now</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-rose-500/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {welcomeMessages.slice(0, messageIndex + 1).map((msg, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 animate-fade-in-left"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-600/30">
                    <img
                      src={laRosaLogo}
                      alt=""
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                  </div>
                  <div className="flex-1 bg-rose-950/30 backdrop-blur border border-rose-500/20 rounded-2xl rounded-tl-sm p-3 sm:p-4 shadow-lg">
                    <p className="text-sm sm:text-base text-foreground">{msg}</p>
                  </div>
                </div>
              ))}

              {/* Contact Info Message */}
              {showContactInfo && (
                <div
                  className="flex gap-3 animate-fade-in-left"
                  style={{ animationDelay: "100ms" }}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-600/30">
                    <img
                      src={laRosaLogo}
                      alt=""
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                    />
                  </div>
                  <div className="flex-1 bg-rose-950/30 backdrop-blur border border-rose-500/20 rounded-2xl rounded-tl-sm p-3 sm:p-4 shadow-lg">
                    <p className="text-sm sm:text-base text-foreground whitespace-pre-line">{contactInfoMessage}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {messageIndex >= welcomeMessages.length && !showContactInfo && (
              <div className="p-4 sm:p-6 border-t border-border/50 bg-gradient-to-t from-rose-950/20 to-transparent space-y-2 sm:space-y-3 animate-fade-in-up">
                <Button
                  onClick={scrollToQuoteForm}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all hover:scale-[1.02] text-sm sm:text-base py-5 sm:py-6"
                >
                  <Headphones className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Book La Rosa for an event
                </Button>
                <Button
                  onClick={handleContactTeam}
                  variant="outline"
                  className="w-full border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all hover:scale-[1.02] text-sm sm:text-base py-5 sm:py-6"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Contact Team
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;