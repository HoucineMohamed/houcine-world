export interface ServicePackage {
  name: string;
  description: string;
  basePrice: number;
  features: string[];
  fullDescription: string;
}

export const brandingPackages: ServicePackage[] = [
  {
    name: "Brand Essentials",
    description: "Perfect for startups and small businesses",
    basePrice: 500,
    features: [
      "Logo design (3 concepts)",
      "Color palette",
      "Typography selection",
      "Brand guidelines (basic)",
      "2 revision rounds",
    ],
    fullDescription: "A comprehensive branding package designed to give your business a strong visual identity. Includes logo concepts, color schemes, and essential brand guidelines to maintain consistency across all platforms.",
  },
  {
    name: "Brand Identity Pro",
    description: "Complete brand identity system",
    basePrice: 1200,
    features: [
      "Logo design (5 concepts)",
      "Complete color system",
      "Typography system",
      "Brand guidelines (comprehensive)",
      "Business card design",
      "Social media templates",
      "Unlimited revisions",
    ],
    fullDescription: "An all-inclusive branding solution featuring extensive logo exploration, detailed brand guidelines, and ready-to-use templates for consistent brand application across digital and print media.",
  },
  {
    name: "Brand Excellence",
    description: "Premium brand strategy and design",
    basePrice: 2500,
    features: [
      "Full brand strategy",
      "Logo & identity system",
      "Brand guidelines (extended)",
      "Marketing collateral",
      "Packaging design",
      "Brand photography direction",
      "3 months support",
    ],
    fullDescription: "The ultimate branding experience combining strategic thinking with exceptional design. Includes comprehensive brand development, marketing materials, and ongoing support to ensure successful brand launch.",
  },
];

export const graphicDesignPackages: ServicePackage[] = [
  {
    name: "Social Media Pack",
    description: "Engaging content for your platforms",
    basePrice: 300,
    features: [
      "15 social media posts",
      "Story templates",
      "Highlight covers",
      "Profile optimization",
      "Brand-consistent designs",
    ],
    fullDescription: "A curated collection of social media designs optimized for engagement. Includes post designs, story templates, and profile enhancements to elevate your social presence.",
  },
  {
    name: "Marketing Materials",
    description: "Print and digital collateral",
    basePrice: 600,
    features: [
      "Brochure design",
      "Flyer design",
      "Poster design",
      "Business cards",
      "Email templates",
      "Print-ready files",
    ],
    fullDescription: "Professional marketing materials designed to communicate your message effectively. All deliverables are print-ready and optimized for both digital and physical distribution.",
  },
  {
    name: "Visual Campaign",
    description: "Complete campaign design suite",
    basePrice: 1500,
    features: [
      "Campaign concept",
      "Key visuals",
      "Digital ads (multiple sizes)",
      "Print materials",
      "Presentation design",
      "Campaign guidelines",
    ],
    fullDescription: "A comprehensive campaign package with cohesive visuals across all touchpoints. Includes strategic direction, key visual development, and implementation across digital and traditional media.",
  },
];

export const uiuxPackages: ServicePackage[] = [
  {
    name: "Landing Page Design",
    description: "High-converting single page",
    basePrice: 800,
    features: [
      "Custom landing page",
      "Mobile responsive",
      "Interactive prototypes",
      "3 sections",
      "2 revision rounds",
    ],
    fullDescription: "A professionally designed landing page optimized for conversions. Includes responsive design, interactive elements, and user-tested layouts to maximize engagement and action.",
  },
  {
    name: "Website Design",
    description: "Multi-page website experience",
    basePrice: 2000,
    features: [
      "Up to 5 pages",
      "Custom design system",
      "Responsive design",
      "Interactive prototypes",
      "User flow optimization",
      "Unlimited revisions",
    ],
    fullDescription: "Complete website design with custom layouts for each page, cohesive design system, and optimized user experience. Fully responsive and ready for development.",
  },
  {
    name: "App Design (Mobile/Web)",
    description: "Full application interface",
    basePrice: 3500,
    features: [
      "Complete app design",
      "User research",
      "Wireframes & prototypes",
      "Design system",
      "Animation guidelines",
      "Developer handoff",
      "3 months support",
    ],
    fullDescription: "End-to-end application design service including user research, wireframing, high-fidelity designs, and comprehensive design system. Includes developer documentation and ongoing support.",
  },
];
