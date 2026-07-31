// ============================================
// PROFILE DATA - Easy to update!
// Update this file whenever your LinkedIn changes
// ============================================

export interface Experience {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location?: string;
  startDate: string;
  endDate?: string; // Leave empty for "Present"
  description: string[];
  skills?: string[];
  category: "development" | "design" | "fintech" | "leadership";
}

export interface Education {
  id: string;
  school: string;
  schoolLogo?: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description?: string;
  activities?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuerLogo?: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  category: "development" | "design" | "fintech" | "leadership";
}

export interface Skill {
  name: string;
  endorsements?: number;
  category: "technical" | "business" | "creative" | "language";
}

export interface VolunteerExperience {
  id: string;
  role: string;
  organization: string;
  organizationLogo?: string;
  cause?: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface Organization {
  id: string;
  name: string;
  role: string;
  logo?: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface ProfileData {
  // Basic Info
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  profilePhoto: string;
  bannerPhoto?: string;
  linkedInUrl: string;
  
  // Stats
  yearsOfExperience: number;
  projectsCompleted: number;
  clientsServed: number;
  
  // About
  about: string;
  
  // Sections
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  skills: Skill[];
  volunteerExperience: VolunteerExperience[];
  organizations: Organization[];
  
  // Featured
  featuredLinks?: {
    title: string;
    description: string;
    url: string;
    image?: string;
  }[];
}

// ============================================
// YOUR PROFILE DATA - Edit below!
// ============================================

export const profileData: ProfileData = {
  // Basic Info
  firstName: "Mohamed",
  lastName: "Houcine",
  headline: "FinTech Enthusiast | Web Developer | Designer | Founder @ PyTunisia | Building Digital Solutions",
  location: "Tunisia",
  profilePhoto: "/src/assets/profile.png",
  linkedInUrl: "https://www.linkedin.com/in/mohamed-houcine-4142b12b4/",
  
  // Stats
  yearsOfExperience: 3,
  projectsCompleted: 50,
  clientsServed: 30,
  
  // About
  about: `I'm a passionate multidisciplinary creator at the intersection of technology, finance, and design. With a strong foundation in web development, data science, and creative design, I build digital solutions that bridge innovation with functionality.

As the founder of PyTunisia, I'm dedicated to educating and empowering the next generation of programmers and tech enthusiasts in Tunisia. I believe in the power of technology to transform lives and create opportunities.

My expertise spans across FinTech development, UI/UX design, brand identity creation, and project management. I'm constantly exploring new technologies and methodologies to deliver cutting-edge solutions for individuals and businesses alike.

When I'm not coding or designing, you'll find me leading community initiatives, mentoring aspiring developers, or exploring the latest trends in artificial intelligence and financial technology.`,

  // Experience - Now with categories
  experience: [
    {
      id: "exp-1",
      title: "Founder & Lead Developer",
      company: "PyTunisia",
      location: "Tunisia",
      startDate: "2022",
      category: "leadership",
      description: [
        "Founded an educational initiative focused on teaching Python and data science to Tunisian students",
        "Created and delivered 10+ comprehensive programming courses reaching 500+ learners",
        "Organized 3 successful seminars on technology and programming",
        "Built and maintained the PyTunisia digital platform using modern web technologies"
      ],
      skills: ["Python", "Data Science", "Education", "Community Building", "Leadership"]
    },
    {
      id: "exp-2",
      title: "Creative Director & Brand Designer",
      company: "Freelance",
      location: "Remote",
      startDate: "2021",
      category: "design",
      description: [
        "Created complete brand identities including logos, visual systems, and brand guidelines",
        "Designed marketing materials, social media assets, and promotional campaigns",
        "Developed UI/UX designs for web and mobile applications",
        "Delivered 25+ branding projects for startups and established businesses"
      ],
      skills: ["Brand Identity", "UI/UX Design", "Graphic Design", "Adobe Creative Suite", "Figma"]
    },
    {
      id: "exp-3",
      title: "Web Developer",
      company: "Freelance",
      location: "Remote",
      startDate: "2021",
      category: "development",
      description: [
        "Designed and developed custom websites for businesses and individuals",
        "Specialized in React, Tailwind CSS, and modern frontend technologies",
        "Built responsive, SEO-optimized, and high-performance web applications",
        "Delivered 30+ successful projects across various industries"
      ],
      skills: ["React", "Tailwind CSS", "TypeScript", "JavaScript", "HTML/CSS"]
    },
    {
      id: "exp-4",
      title: "FinTech Developer",
      company: "Independent Projects",
      location: "Tunisia",
      startDate: "2023",
      category: "fintech",
      description: [
        "Developed financial dashboards and automation tools",
        "Created data visualization solutions for stock market analysis",
        "Built automation scripts for financial data processing",
        "Integrated APIs for real-time market data retrieval"
      ],
      skills: ["Python", "Pandas", "Financial APIs", "Data Visualization", "Automation"]
    }
  ],

  // Education (kept for data but not displayed)
  education: [
    {
      id: "edu-1",
      school: "University of Tunisia",
      degree: "Bachelor's Degree",
      field: "Computer Science / Finance",
      startDate: "2021",
      endDate: "Present",
      description: "Pursuing studies in technology and finance with a focus on FinTech applications",
      activities: ["PyTunisia Founder", "Tech Community Leader", "Hackathon Participant"]
    }
  ],

  // Certifications - Now with categories and expanded
  certifications: [
    // Development
    {
      id: "cert-dev-1",
      name: "Web Development Fundamentals",
      issuer: "freeCodeCamp",
      issueDate: "2022",
      credentialUrl: "#",
      category: "development"
    },
    {
      id: "cert-dev-2",
      name: "React - The Complete Guide",
      issuer: "Udemy",
      issueDate: "2023",
      credentialUrl: "#",
      category: "development"
    },
    {
      id: "cert-dev-3",
      name: "JavaScript Algorithms and Data Structures",
      issuer: "freeCodeCamp",
      issueDate: "2022",
      credentialUrl: "#",
      category: "development"
    },
    
    // Design
    {
      id: "cert-design-1",
      name: "UI/UX Design Principles",
      issuer: "Google",
      issueDate: "2023",
      credentialUrl: "#",
      category: "design"
    },
    {
      id: "cert-design-2",
      name: "Graphic Design Specialization",
      issuer: "Coursera",
      issueDate: "2023",
      credentialUrl: "#",
      category: "design"
    },
    {
      id: "cert-design-3",
      name: "Brand Identity Design",
      issuer: "Skillshare",
      issueDate: "2022",
      credentialUrl: "#",
      category: "design"
    },
    
    // Finance / FinTech
    {
      id: "cert-fintech-1",
      name: "Python for Data Science",
      issuer: "Coursera",
      issueDate: "2023",
      credentialUrl: "#",
      category: "fintech"
    },
    {
      id: "cert-fintech-2",
      name: "Financial Markets",
      issuer: "Yale University (Coursera)",
      issueDate: "2023",
      credentialUrl: "#",
      category: "fintech"
    },
    {
      id: "cert-fintech-3",
      name: "Data Analysis with Python",
      issuer: "IBM",
      issueDate: "2023",
      credentialUrl: "#",
      category: "fintech"
    },
    
    // Management & Leadership
    {
      id: "cert-lead-1",
      name: "Project Management Fundamentals",
      issuer: "Google",
      issueDate: "2023",
      credentialUrl: "#",
      category: "leadership"
    },
    {
      id: "cert-lead-2",
      name: "Leadership and Management",
      issuer: "LinkedIn Learning",
      issueDate: "2022",
      credentialUrl: "#",
      category: "leadership"
    }
  ],

  // Skills
  skills: [
    // Technical
    { name: "Python", category: "technical", endorsements: 15 },
    { name: "React", category: "technical", endorsements: 12 },
    { name: "JavaScript", category: "technical", endorsements: 10 },
    { name: "Tailwind CSS", category: "technical", endorsements: 8 },
    { name: "HTML/CSS", category: "technical", endorsements: 14 },
    { name: "Data Science", category: "technical", endorsements: 7 },
    { name: "Firebase", category: "technical", endorsements: 5 },
    { name: "Git", category: "technical", endorsements: 6 },
    
    // Business
    { name: "Project Management", category: "business", endorsements: 8 },
    { name: "Team Leadership", category: "business", endorsements: 6 },
    { name: "Strategic Planning", category: "business", endorsements: 4 },
    
    // Creative
    { name: "UI/UX Design", category: "creative", endorsements: 11 },
    { name: "Brand Identity", category: "creative", endorsements: 9 },
    { name: "Graphic Design", category: "creative", endorsements: 7 },
    { name: "Adobe Creative Suite", category: "creative", endorsements: 5 },
    
    // Languages
    { name: "Arabic", category: "language" },
    { name: "French", category: "language" },
    { name: "English", category: "language" }
  ],

  // Volunteer Experience (kept for data but not displayed)
  volunteerExperience: [
    {
      id: "vol-1",
      role: "Tech Education Volunteer",
      organization: "PyTunisia",
      cause: "Education",
      startDate: "2022",
      description: "Teaching programming and technology skills to underprivileged students"
    },
    {
      id: "vol-2",
      role: "Community Organizer",
      organization: "Local Tech Meetups",
      cause: "Science and Technology",
      startDate: "2023",
      description: "Organizing technology-focused events and workshops for the local community"
    }
  ],

  // Organizations (kept for data but not displayed)
  organizations: [
    {
      id: "org-1",
      name: "PyTunisia",
      role: "Founder & President",
      startDate: "2022",
      description: "Educational initiative teaching Python and data science in Tunisia"
    },
    {
      id: "org-2",
      name: "X Cube",
      role: "Member",
      startDate: "2023",
      description: "Innovation and entrepreneurship community"
    },
    {
      id: "org-3",
      name: "Interact Club",
      role: "Active Member",
      startDate: "2022",
      description: "Youth service organization focused on community development"
    },
    {
      id: "org-4",
      name: "Leo Club",
      role: "Member",
      startDate: "2022",
      description: "Lions Club youth organization promoting leadership and service"
    }
  ],

  // Featured
  featuredLinks: [
    {
      title: "Houcine.tech",
      description: "Web development services and portfolio",
      url: "/dev"
    },
    {
      title: "Houcine.studio",
      description: "Design services and creative work",
      url: "/designs"
    },
    {
      title: "PyTunisia",
      description: "Educational platform for Python and data science",
      url: "https://www.instagram.com/pytunisia/"
    }
  ]
};
