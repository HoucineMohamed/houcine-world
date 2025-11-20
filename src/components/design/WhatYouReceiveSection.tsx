import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image, Palette, Layout } from "lucide-react";

interface WhatYouReceiveSectionProps {
  category: string;
}

export const WhatYouReceiveSection = ({ category }: WhatYouReceiveSectionProps) => {
  // Placeholder items - will be filled with actual content later
  const placeholderItems = [
    {
      icon: FileText,
      title: "Deliverable 1",
      description: "Content will be added here",
    },
    {
      icon: Image,
      title: "Deliverable 2",
      description: "Content will be added here",
    },
    {
      icon: Palette,
      title: "Deliverable 3",
      description: "Content will be added here",
    },
    {
      icon: Layout,
      title: "Deliverable 4",
      description: "Content will be added here",
    },
  ];

  return (
    <div className="mt-12 pt-12 border-t border-border/50">
      <h3 className="text-3xl font-display font-bold text-center mb-8">
        What You Receive
      </h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {placeholderItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card
              key={index}
              className="border-border/50 bg-card/30 backdrop-blur hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/10"
            >
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
