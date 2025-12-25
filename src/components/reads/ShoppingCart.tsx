import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart as CartIcon, Trash2, Construction } from "lucide-react";
import { Book } from "@/data/booksData";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ShoppingCartProps {
  items: Book[];
  onRemoveItem: (bookId: string) => void;
  onClearCart: () => void;
}

const ShoppingCart = ({ items, onRemoveItem, onClearCart }: ShoppingCartProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { currency, convertPrice } = useCurrency();

  const getCurrencySymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "USD") return "$";
    return "";
  };

  const totalPrice = items.reduce((sum, book) => sum + convertPrice(book.basePrice), 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
        >
          <CartIcon className="w-5 h-5" />
          {items.length > 0 && (
            <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs bg-primary">
              {items.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md border-border/50 bg-card/95 backdrop-blur">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CartIcon className="w-5 h-5" />
            Your Basket ({items.length})
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col h-[calc(100vh-200px)]">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <CartIcon className="w-12 h-12 mb-4 opacity-50" />
              <p>Your basket is empty</p>
              <p className="text-sm">Add some books to get started</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4">
                {items.map((book) => (
                  <div 
                    key={book.id} 
                    className="flex gap-3 p-3 border border-border/50 rounded-lg bg-background/50"
                  >
                    <div className="w-12 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded flex-shrink-0 flex items-center justify-center">
                      <Construction className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                      <p className="text-sm text-primary font-semibold mt-1">
                        {getCurrencySymbol()}{convertPrice(book.basePrice)}
                        {currency === "TND" && " TND"}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="flex-shrink-0 h-8 w-8"
                      onClick={() => onRemoveItem(book.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {getCurrencySymbol()}{totalPrice.toFixed(0)}
                    {currency === "TND" && " TND"}
                  </span>
                </div>

                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-primary mb-1">
                    <Construction className="w-4 h-4" />
                    <span className="font-medium">Checkout Coming Soon</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The store is under construction. Purchases will be available soon.
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onClearCart}
                >
                  Clear Basket
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ShoppingCart;
