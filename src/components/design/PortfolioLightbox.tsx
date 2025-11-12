import { X, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  image: string;
  behanceUrl?: string;
}

interface PortfolioLightboxProps {
  item: PortfolioItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioLightbox = ({ item, isOpen, onClose }: PortfolioLightboxProps) => {
  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">{item.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-muted-foreground">{item.description}</p>
          {item.behanceUrl && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(item.behanceUrl, "_blank")}
            >
              View on Behance
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
