export type BookCategory = "FinTech" | "Development" | "Design" | "Management";

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  coverImage: string;
  category: BookCategory;
  isNew?: boolean;
  isBestseller?: boolean;
  rating: number;
  reviewCount: number;
}

export const booksData: Book[] = [
  {
    id: "fintech-foundations",
    title: "FinTech Foundations",
    author: "Houcine Mohamed",
    description: "A comprehensive guide to understanding financial technology, from blockchain to digital banking. Perfect for beginners and professionals looking to understand the FinTech landscape.",
    shortDescription: "Master the fundamentals of financial technology and digital banking.",
    basePrice: 29,
    coverImage: "/placeholder.svg",
    category: "FinTech",
    isBestseller: true,
    rating: 4.8,
    reviewCount: 127
  },
  {
    id: "python-finance",
    title: "Python for Finance",
    author: "Houcine Mohamed",
    description: "Learn how to leverage Python for financial analysis, algorithmic trading, and data-driven decision making in the finance industry.",
    shortDescription: "Automate financial analysis with Python programming.",
    basePrice: 34,
    coverImage: "/placeholder.svg",
    category: "FinTech",
    rating: 4.9,
    reviewCount: 95
  },
  {
    id: "react-mastery",
    title: "React Mastery",
    author: "Houcine Mohamed",
    description: "Build modern, scalable web applications with React. From fundamentals to advanced patterns, hooks, and performance optimization.",
    shortDescription: "Build scalable web applications with React from scratch.",
    basePrice: 39,
    coverImage: "/placeholder.svg",
    category: "Development",
    isNew: true,
    rating: 4.7,
    reviewCount: 83
  },
  {
    id: "tailwind-design-systems",
    title: "Design Systems with Tailwind",
    author: "Houcine Mohamed",
    description: "Create beautiful, maintainable design systems using Tailwind CSS. Learn component-driven design and build reusable UI libraries.",
    shortDescription: "Create stunning design systems with Tailwind CSS.",
    basePrice: 32,
    coverImage: "/placeholder.svg",
    category: "Design",
    rating: 4.6,
    reviewCount: 72
  },
  {
    id: "brand-identity",
    title: "Crafting Brand Identity",
    author: "Houcine Mohamed",
    description: "Learn the art and science of creating memorable brand identities. From logo design to complete visual systems and brand guidelines.",
    shortDescription: "Master the art of creating memorable brand identities.",
    basePrice: 36,
    coverImage: "/placeholder.svg",
    category: "Design",
    isBestseller: true,
    rating: 4.9,
    reviewCount: 156
  },
  {
    id: "startup-management",
    title: "Managing Tech Startups",
    author: "Houcine Mohamed",
    description: "Navigate the challenges of building and scaling a tech startup. From team building to product management and growth strategies.",
    shortDescription: "Navigate the challenges of building tech startups.",
    basePrice: 42,
    coverImage: "/placeholder.svg",
    category: "Management",
    rating: 4.7,
    reviewCount: 64
  },
  {
    id: "agile-teams",
    title: "Leading Agile Teams",
    author: "Houcine Mohamed",
    description: "Master agile methodologies and lead high-performing development teams. Practical strategies for modern project management.",
    shortDescription: "Lead high-performing agile development teams.",
    basePrice: 38,
    coverImage: "/placeholder.svg",
    category: "Management",
    isNew: true,
    rating: 4.5,
    reviewCount: 48
  },
  {
    id: "data-visualization",
    title: "Data Visualization Essentials",
    author: "Houcine Mohamed",
    description: "Transform complex data into compelling visual stories. Learn chart design, dashboard creation, and data storytelling techniques.",
    shortDescription: "Transform data into compelling visual stories.",
    basePrice: 31,
    coverImage: "/placeholder.svg",
    category: "Development",
    rating: 4.6,
    reviewCount: 91
  }
];
