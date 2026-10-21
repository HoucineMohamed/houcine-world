// Houcine.studio pricing (program: master redesign, section 9). Every name and starting price here
// is exact and must not be renamed, duplicated, or repriced without the owner's say-so. All prices
// are starting prices in EUR and USD -- the same number for both, never a live conversion.

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
    basePrice: 299,
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
    basePrice: 349,
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
    description: "Strategic brand identity with guidelines that scale",
    basePrice: 499,
    features: [
      "Full brand strategy",
      "Logo & identity system",
      "Brand guidelines (extended)",
      "Marketing collateral essentials",
    ],
    fullDescription: "A strategic branding package combining brand strategy with a complete identity system and extended guidelines, built to scale as your brand grows.",
  },
  {
    name: "Houcine's Brand",
    description: "The complete branding experience, start to launch",
    basePrice: 799,
    features: [
      "Full brand strategy",
      "Logo & identity system",
      "Brand guidelines (extended)",
      "Marketing collateral",
      "Packaging design",
      "Brand photography direction",
      "3 months support",
    ],
    fullDescription: "The complete branding experience, combining strategic thinking with exceptional design -- full brand development, marketing materials, packaging, and ongoing support through launch.",
  },
];

export const graphicDesignPackages: ServicePackage[] = [
  {
    name: "Social Media Pack",
    description: "Engaging content for your platforms",
    basePrice: 179,
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
    basePrice: 199,
    features: [
      "Flyer design",
      "Poster design",
      "Business cards",
      "Print-ready files",
    ],
    fullDescription: "Professional marketing materials designed to communicate your message effectively. All deliverables are print-ready and optimized for both digital and physical distribution.",
  },
  {
    name: "Visual Campaign",
    description: "Cohesive key visuals for a campaign",
    basePrice: 299,
    features: [
      "Campaign concept",
      "Key visuals",
      "Digital ads (multiple sizes)",
    ],
    fullDescription: "A focused campaign package with cohesive key visuals and digital ad variations, giving your message one consistent look across placements.",
  },
];

export const uiuxPackages: ServicePackage[] = [
  {
    name: "Website Design",
    description: "Multi-page website experience",
    basePrice: 599,
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
    name: "App Design",
    description: "Full application interface",
    basePrice: 699,
    features: [
      "Complete app design",
      "Wireframes & prototypes",
      "Design system",
      "Animation guidelines",
      "Developer handoff",
    ],
    fullDescription: "End-to-end application design service including wireframing, high-fidelity designs, and a comprehensive design system, with developer-ready documentation.",
  },
  {
    name: "Houcine's Pack",
    description: "Website and app design, combined",
    basePrice: 799,
    features: [
      "Website + app design system",
      "User research",
      "Wireframes & prototypes",
      "Unlimited revisions",
      "Developer handoff",
      "3 months support",
    ],
    fullDescription: "The complete UI/UX package: one coherent design system spanning both your website and your app, from user research through developer handoff, with ongoing support.",
  },
];
