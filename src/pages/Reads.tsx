import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, BookOpen, Search, Mail, ExternalLink,
  TrendingUp, Code2, Palette, Users, DollarSign
} from "lucide-react";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { CurrencyProvider, useCurrency, Currency } from "@/contexts/CurrencyContext";
import { booksData, BookCategory } from "@/data/booksData";
import BookCard from "@/components/reads/BookCard";
import ReviewsSection from "@/components/reads/ReviewsSection";
import { toast } from "sonner";
import profileImage from "@/assets/profile.png";

const categoryIcons = {
  FinTech: TrendingUp,
  Development: Code2,
  Design: Palette,
  Management: Users
};

const ReadsContent = () => {
  const { currency, setCurrency } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const heroAnimation = useScrollAnimation();
  const featuredAnimation = useScrollAnimation();
  const categoriesAnimation = useScrollAnimation();
  const catalogAnimation = useScrollAnimation();
  const founderAnimation = useScrollAnimation();
  const reviewsAnimation = useScrollAnimation();
  const newsletterAnimation = useScrollAnimation();

  const filteredBooks = booksData.filter(book => {
    const matchesCategory = selectedCategory === "All" || book.category === selectedCategory;
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBuyNow = (book: any) => {
    setSelectedBook(book);
    const element = document.getElementById('payment');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) {
      toast.error("Please enter your email");
      return;
    }
    toast.success("Subscribed! You'll receive updates about new books.");
    setNewsletterEmail("");
  };

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgressBar />
      <CustomCursor />
      
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        ref={heroAnimation.ref}
        className={`relative min-h-screen flex items-center justify-center overflow-hidden transition-all duration-1000 ${
          heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <BookOpen className="w-20 h-20 text-primary animate-fade-in" />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
            Empowering the Next Generation of Innovators
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Curated eBooks and resources by Houcine Mohamed for finance, tech, design, and management enthusiasts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-primary hover:bg-primary/90"
            >
              Explore Collection
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.open('https://ba9chich.com/fr/Mohamed.Houcine', '_blank')}
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Visit Backchi Store
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <section 
        ref={featuredAnimation.ref}
        className={`py-24 bg-muted/30 transition-all duration-700 ${
          featuredAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Featured eBooks</h2>
            <p className="text-xl text-muted-foreground">Handpicked titles to accelerate your learning journey</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-8">
            {booksData.filter(book => book.isBestseller || book.isNew).slice(0, 3).map((book) => (
              <BookCard key={book.id} book={book} onBuyNow={handleBuyNow} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section 
        id="categories"
        ref={categoriesAnimation.ref}
        className={`py-24 transition-all duration-700 ${
          categoriesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Browse by Category</h2>
            <p className="text-xl text-muted-foreground">Find resources tailored to your interests</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {(Object.keys(categoryIcons) as BookCategory[]).map((category) => {
              const Icon = categoryIcons[category];
              const count = booksData.filter(b => b.category === category).length;
              return (
                <Card 
                  key={category}
                  className={`border-border/50 bg-card/50 backdrop-blur cursor-pointer transition-all duration-300 hover:scale-105 ${
                    selectedCategory === category ? 'border-primary shadow-lg shadow-primary/20' : 'hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setSelectedCategory(category);
                    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <CardHeader className="text-center p-3 sm:p-4 md:p-6">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-2 sm:mb-4 mx-auto">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary" />
                    </div>
                    <CardTitle className="text-sm sm:text-lg md:text-xl">{category}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">{count} books</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full Catalog with Search & Filter */}
      <section 
        id="catalog"
        ref={catalogAnimation.ref}
        className={`py-24 bg-muted/30 transition-all duration-700 ${
          catalogAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Complete Collection</h2>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search by title, author, or topic..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as BookCategory | "All")}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="FinTech">FinTech</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Management">Management</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Books Grid */}
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} onBuyNow={handleBuyNow} />
              ))}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur p-12 text-center">
              <p className="text-muted-foreground">No books found matching your criteria.</p>
            </Card>
          )}
        </div>
      </section>

      {/* Pricing & Payment Section */}
      <section 
        id="payment"
        className="py-24"
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground mb-8">Choose your currency and payment method</p>
            
            <div className="flex justify-center gap-4 mb-8">
              <Button
                variant={currency === "EUR" ? "default" : "outline"}
                onClick={() => setCurrency("EUR")}
                className={currency === "EUR" ? "bg-primary hover:bg-primary/90" : ""}
              >
                EUR (€)
              </Button>
              <Button
                variant={currency === "USD" ? "default" : "outline"}
                onClick={() => setCurrency("USD")}
                className={currency === "USD" ? "bg-primary hover:bg-primary/90" : ""}
              >
                USD ($)
              </Button>
              <Button
                variant={currency === "TND" ? "default" : "outline"}
                onClick={() => setCurrency("TND")}
                className={currency === "TND" ? "bg-primary hover:bg-primary/90" : ""}
              >
                TND
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-primary" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Flexible options for your convenience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="p-4 border border-border/50 rounded-lg">
                    <p className="font-semibold mb-1">PayPal</p>
                    <p className="text-sm text-muted-foreground">Instant digital delivery</p>
                  </div>
                  <div className="p-4 border border-border/50 rounded-lg">
                    <p className="font-semibold mb-1">CTI Card</p>
                    <p className="text-sm text-muted-foreground">Tunisian card payment</p>
                  </div>
                  <div className="p-4 border border-border/50 rounded-lg">
                    <p className="font-semibold mb-1">Cash / Offline</p>
                    <p className="text-sm text-muted-foreground">Contact for arrangements</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedBook && (
              <Card className="border-primary/50 bg-card/50 backdrop-blur shadow-lg shadow-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl">Selected Book</CardTitle>
                  <CardDescription>Ready to purchase</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-lg">{selectedBook.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedBook.author}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {currency === "EUR" ? "€" : currency === "USD" ? "$" : "TND "}
                      {currency === "EUR" ? selectedBook.basePrice : 
                       currency === "USD" ? Math.round(selectedBook.basePrice * 1.09) :
                       Math.round(selectedBook.basePrice * 3.36)}
                    </span>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Proceed to Checkout
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Instant PDF download after payment
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section 
        ref={founderAnimation.ref}
        className={`py-24 bg-muted/30 transition-all duration-700 ${
          founderAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-4xl">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-xl" />
                  <img 
                    src={profileImage}
                    alt="Houcine Mohamed"
                    className="relative rounded-xl w-full aspect-square object-cover"
                  />
                </div>
                <div>
                  <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">Author & Curator</Badge>
                  <h3 className="text-3xl font-display font-bold mb-4">Houcine Mohamed</h3>
                  <p className="text-lg text-muted-foreground mb-6">
                    Curating resources to empower innovators in finance, tech, and design. With years of experience in FinTech and education, I'm passionate about making complex topics accessible to everyone.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => window.location.href = 'mailto:contact@houcine.world'}>
                      <Mail className="w-4 h-4 mr-2" />
                      Contact
                    </Button>
                    <Button variant="outline" onClick={() => window.open('https://linkedin.com/in/houcine-mohamed', '_blank')}>
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Reviews Section */}
      <section 
        ref={reviewsAnimation.ref}
        className={`py-24 transition-all duration-700 ${
          reviewsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <ReviewsSection />
        </div>
      </section>

      {/* Newsletter Section */}
      <section 
        ref={newsletterAnimation.ref}
        className={`py-24 bg-muted/30 relative overflow-hidden transition-all duration-700 ${
          newsletterAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 max-w-2xl relative z-10">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl font-display font-bold mb-4">
                Stay Updated
              </CardTitle>
              <CardDescription className="text-lg">
                Get notified about new books, exclusive content, and special offers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4">
                <Input 
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  Subscribe
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                No spam. Unsubscribe anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const Reads = () => {
  return (
    <CurrencyProvider>
      <ReadsContent />
    </CurrencyProvider>
  );
};

export default Reads;
