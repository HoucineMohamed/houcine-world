import { useEffect, useRef, useState } from "react";
import { X, Headphones, Send, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import laRosaLogo from "@/assets/images/larosaview-logo.png";
import { useConciergeChat } from "@/hooks/useConciergeChat";

// The La Rosa View Concierge: a conversational widget backed by supabase/functions/concierge (see
// useConciergeChat.ts). Every reply is written by a language model from the Houcine.world knowledge brain
// (houcine-world-brain/, docs/knowledge-brain.md) and streamed in as it is written; nothing here decides what the
// assistant may answer. The welcome text and the starter questions below are the only fixed text.

const WELCOME_MESSAGE =
  "Welcome to La Rosa View! 🌹\n\nI'm the La Rosa View concierge, an AI assistant. Ask me about DJ La Rosa, the events he plays, how booking works, or anything else about the brand.\n\nYou can write in English, French or Tunisian Arabic.";

const STARTERS = [
  "Tell me about La Rosa View.",
  "What kind of events does DJ La Rosa play?",
  "How do I book DJ La Rosa for my event?",
  "What happens after I send a booking request?",
  "How can I contact the team?",
];

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [input, setInput] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, phase, isSending, isSlow, error, send, retry, reset } = useConciergeChat();

  useEffect(() => {
    const updatePosition = () => {
      setPosition({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending, isSlow, error, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 80;
    setPosition({ x: Math.max(0, Math.min(newX, maxX)), y: Math.max(0, Math.min(newY, maxY)) });
  };

  const handleMouseUp = () => setIsDragging(false);

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

  const submitMessage = (text: string) => {
    if (!text.trim() || isSending) return;
    void send(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage(input);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <div
        ref={widgetRef}
        className={`fixed z-50 transition-all duration-300 ${
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab"
        }`}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
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
          style={{ animation: "chatPulse 2s ease-in-out infinite" }}
          aria-label="Open the La Rosa View Concierge chat"
        >
          <div className="absolute inset-0 rounded-full border-2 border-rose-400/30 animate-ping" />
          <div className="absolute inset-0 rounded-full border border-rose-400/20" style={{ animation: "chatRingPulse 3s ease-in-out infinite" }} />
          <img src={laRosaLogo} alt="" className="absolute inset-2 sm:inset-3 w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-lg" />
          <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl" style={{ animation: "chatGlow 2s ease-in-out infinite" }} />
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-4 animate-fade-in"
          style={{ animation: "slideInRight 0.4s ease-out" }}
          role="dialog"
          aria-label="La Rosa View Concierge chat"
        >
          <div className="absolute inset-0 bg-black/50 sm:hidden" onClick={() => setIsOpen(false)} />

          <div className="relative w-full sm:w-96 h-[80vh] sm:h-[600px] bg-gradient-to-br from-card to-card/95 backdrop-blur-xl border-2 border-rose-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-rose-600/20 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 bg-gradient-to-r from-rose-950/30 to-transparent shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img src={laRosaLogo} alt="La Rosa View" className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg truncate">La Rosa View Concierge</h3>
                  <p className="text-xs text-muted-foreground">AI Concierge</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    onClick={reset}
                    className="p-2 hover:bg-rose-500/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                    aria-label="Start a new conversation"
                    title="Start a new conversation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-rose-500/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                  aria-label="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4" aria-live="polite" aria-busy={phase === "streaming"}>
              {/* Welcome message: always shown first, not part of the AI conversation history */}
              <div className="flex gap-3 animate-fade-in-left">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30">
                  <img src={laRosaLogo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                </div>
                <div className="flex-1 bg-rose-950/30 backdrop-blur border border-rose-500/20 rounded-2xl rounded-tl-sm p-3 sm:p-4 shadow-lg">
                  <p className="text-sm sm:text-base text-foreground whitespace-pre-line">{WELCOME_MESSAGE}</p>
                </div>
              </div>

              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pl-11 sm:pl-13">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      onClick={() => submitMessage(starter)}
                      className="text-xs sm:text-sm text-left px-3 py-2 rounded-full border border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 animate-fade-in-left ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30">
                      <img src={laRosaLogo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                    </div>
                  )}
                  <div
                    className={`flex-1 max-w-[85%] backdrop-blur border rounded-2xl p-3 sm:p-4 shadow-lg ${
                      m.role === "user"
                        ? "ml-auto bg-rose-600/90 border-rose-500/40 rounded-tr-sm"
                        : "bg-rose-950/30 border-rose-500/20 rounded-tl-sm"
                    } ${m.failed ? "opacity-60" : ""}`}
                  >
                    <p className={`text-sm sm:text-base whitespace-pre-line ${m.role === "user" ? "text-white" : "text-foreground"}`}>
                      {m.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Shown only while the answer has not started arriving: it disappears with the first words. */}
              {phase === "waiting" && (
                <div className="flex gap-3 animate-fade-in-left">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30">
                    <img src={laRosaLogo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                  </div>
                  <div className="bg-rose-950/30 backdrop-blur border border-rose-500/20 rounded-2xl rounded-tl-sm p-3 sm:p-4 shadow-lg" role="status">
                    <span className="sr-only">The concierge is writing an answer</span>
                    <div className="flex gap-1" aria-hidden="true">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    {isSlow && <p className="text-xs text-muted-foreground mt-2">Still working on it…</p>}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-sm" role="alert">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 space-y-1">
                    <p className="text-foreground">{error.message}</p>
                    {(error.email || error.bookingPath) && (
                      <p className="text-muted-foreground">
                        You can also reach the team
                        {error.email && (
                          <>
                            {" "}at{" "}
                            <a href={`mailto:${error.email}`} className="text-rose-400 hover:text-rose-300 underline">
                              {error.email}
                            </a>
                          </>
                        )}
                        {error.email && error.bookingPath ? " or" : ""}
                        {error.bookingPath && (
                          <>
                            {" "}send a{" "}
                            <a href={error.bookingPath} className="text-rose-400 hover:text-rose-300 underline">
                              booking request
                            </a>
                          </>
                        )}
                        .
                      </p>
                    )}
                    {error.code !== "not_configured" && (
                      <button onClick={retry} className="text-rose-400 hover:text-rose-300 underline focus:outline-none focus:ring-2 focus:ring-rose-500 rounded">
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 border-t border-border/50 bg-gradient-to-t from-rose-950/20 to-transparent shrink-0 space-y-2">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about La Rosa View..."
                  rows={1}
                  maxLength={2000}
                  disabled={isSending}
                  className="min-h-[44px] max-h-32 resize-none bg-background/50 border-rose-500/30 focus-visible:ring-rose-500"
                  aria-label="Message the La Rosa View Concierge"
                />
                <Button
                  onClick={() => submitMessage(input)}
                  disabled={isSending || !input.trim()}
                  size="icon"
                  className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 h-11 w-11"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={scrollToQuoteForm}
                variant="outline"
                className="w-full border-rose-500/50 hover:bg-rose-500/10 hover:border-rose-500 transition-all text-xs sm:text-sm py-2"
              >
                <Headphones className="w-4 h-4 mr-2" />
                Book La Rosa for an event
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
