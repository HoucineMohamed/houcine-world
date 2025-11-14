export interface DevServicePackage {
  name: string;
  description: string;
  basePrice: number;
  features: string[];
  fullDescription: string;
  icon: string;
  deliveryTime: string;
}

export const devServicePackages: DevServicePackage[] = [
  {
    name: "Landing Page",
    description: "Perfect for creators and personal brands — fast, elegant, and mobile-optimized.",
    basePrice: 500,
    features: [
      "Single-page responsive design",
      "Modern animations & interactions",
      "Contact form integration",
      "SEO optimization",
      "Mobile-first approach",
      "Fast loading speed"
    ],
    fullDescription: "A stunning single-page website designed to capture attention and convert visitors. Built with React and Tailwind CSS, optimized for performance and mobile devices.",
    icon: "Rocket",
    deliveryTime: "5-7 days"
  },
  {
    name: "Portfolio Website",
    description: "Fully custom, SEO-friendly, and easily updatable portfolios for artists, developers, and designers.",
    basePrice: 800,
    features: [
      "Multi-page custom design",
      "Project showcase galleries",
      "Admin panel for updates",
      "Blog integration (optional)",
      "Contact & social links",
      "SEO & performance optimized"
    ],
    fullDescription: "A complete portfolio solution that showcases your work beautifully. Includes an easy-to-use content management system so you can update your projects without touching code.",
    icon: "Briefcase",
    deliveryTime: "10-14 days"
  },
  {
    name: "Business Website",
    description: "Conversion-oriented websites built with React, Tailwind, and modern integrations.",
    basePrice: 1200,
    features: [
      "Multi-page professional design",
      "Service/product pages",
      "Booking/inquiry system",
      "Analytics integration",
      "Payment gateway ready",
      "CMS for easy updates"
    ],
    fullDescription: "A professional business website designed to drive conversions and establish your online presence. Includes booking systems, payment integration, and tools to manage your content.",
    icon: "Building",
    deliveryTime: "14-21 days"
  },
  {
    name: "Educational Platform",
    description: "Websites for schools, clubs, and projects with login systems or course sections.",
    basePrice: 1500,
    features: [
      "User authentication system",
      "Course/content management",
      "Student dashboard",
      "Progress tracking",
      "Resource library",
      "Admin panel"
    ],
    fullDescription: "A complete educational platform with user management, course delivery, and progress tracking. Perfect for online courses, educational initiatives, and learning communities.",
    icon: "GraduationCap",
    deliveryTime: "21-30 days"
  },
  {
    name: "FinTech Dashboard",
    description: "Data-driven apps and automation interfaces for finance, crypto, or business dashboards.",
    basePrice: 2000,
    features: [
      "Real-time data visualization",
      "API integrations",
      "Custom charts & graphs",
      "User authentication",
      "Data export features",
      "Responsive design"
    ],
    fullDescription: "A sophisticated dashboard application with real-time data visualization, API integrations, and powerful analytics tools. Built for finance professionals and data-driven businesses.",
    icon: "LineChart",
    deliveryTime: "30-45 days"
  }
];
