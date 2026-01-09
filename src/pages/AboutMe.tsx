import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Briefcase, 
  Award, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Linkedin,
  Star,
  Calendar,
  BookOpen,
  Code,
  Palette,
  TrendingUp,
  Users
} from "lucide-react";
import logoH from "@/assets/logo-h.png";
import { Link } from "react-router-dom";
import profile from "@/assets/profile.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { profileData } from "@/data/profileData";

const categoryIcons = {
  development: Code,
  design: Palette,
  fintech: TrendingUp,
  leadership: Users
};

const categoryLabels = {
  development: "Development",
  design: "Design",
  fintech: "Finance & FinTech",
  leadership: "Management & Leadership"
};

const categoryColors = {
  development: "from-blue-500 to-cyan-500",
  design: "from-pink-500 to-rose-500",
  fintech: "from-emerald-500 to-green-500",
  leadership: "from-amber-500 to-orange-500"
};

const AboutMe = () => {
  const [expandedExperience, setExpandedExperience] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  
  const headerAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();
  const featuredAnimation = useScrollAnimation();
  const experienceAnimation = useScrollAnimation();
  const skillsAnimation = useScrollAnimation();
  const certificationsAnimation = useScrollAnimation();

  const toggleExperience = (id: string) => {
    setExpandedExperience(expandedExperience === id ? null : id);
  };

  const technicalSkills = profileData.skills.filter(s => s.category === "technical");
  const businessSkills = profileData.skills.filter(s => s.category === "business");
  const creativeSkills = profileData.skills.filter(s => s.category === "creative");
  const languageSkills = profileData.skills.filter(s => s.category === "language");

  // Group certifications by category
  const certsByCategory = {
    development: profileData.certifications.filter(c => c.category === "development"),
    design: profileData.certifications.filter(c => c.category === "design"),
    fintech: profileData.certifications.filter(c => c.category === "fintech"),
    leadership: profileData.certifications.filter(c => c.category === "leadership")
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="inline-block hover:scale-110 transition-all duration-200 group">
            <img 
              src={logoH} 
              alt="Houcine.world home" 
              className="h-7 sm:h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                filter: "drop-shadow(0 0 8px rgba(103, 232, 249, 0))",
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0.5))"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(103, 232, 249, 0))"}
            />
          </Link>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(profileData.linkedInUrl, '_blank')}
            className="gap-2 text-xs sm:text-sm"
          >
            <Linkedin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">View LinkedIn</span>
            <span className="sm:hidden">LinkedIn</span>
          </Button>
        </div>
      </header>

      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16">
        {/* Profile Header Section */}
        <section 
          ref={headerAnimation.ref}
          className={`relative transition-all duration-700 ${
            headerAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Banner */}
          <div className="h-36 sm:h-48 md:h-64 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Profile Info */}
          <div className="container mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-10">
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
              {/* Profile Photo */}
              <div className="relative group mx-auto md:mx-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <img 
                  src={profile} 
                  alt={`${profileData.firstName} ${profileData.lastName}`}
                  className="relative w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full object-cover border-4 border-background shadow-2xl"
                />
              </div>

              {/* Name & Info */}
              <div className="flex-1 pt-2 sm:pt-4 md:pt-8 text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-2">
                  {profileData.firstName} {profileData.lastName}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-3 max-w-2xl">
                  {profileData.headline}
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mb-4 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{profileData.location}</span>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap justify-center md:justify-start gap-4 sm:gap-6 mt-4 sm:mt-6">
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{profileData.yearsOfExperience}+</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Years Experience</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{profileData.projectsCompleted}+</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Projects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{profileData.clientsServed}+</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Clients</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
          {/* About Section - Full Width */}
          <section
            ref={aboutAnimation.ref}
            className={`transition-all duration-700 delay-100 mb-8 sm:mb-12 ${
              aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                  {profileData.about}
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Featured Section */}
          {profileData.featuredLinks && profileData.featuredLinks.length > 0 && (
            <section
              ref={featuredAnimation.ref}
              className={`transition-all duration-700 delay-150 mb-8 sm:mb-12 ${
                featuredAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    Featured
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {profileData.featuredLinks.map((link, index) => (
                      <Link
                        key={index}
                        to={link.url}
                        className="group p-3 sm:p-4 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                      >
                        <h4 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors mb-1">
                          {link.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {link.description}
                        </p>
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mt-2 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Certifications Section - Full Width, Categorized */}
          <section
            ref={certificationsAnimation.ref}
            className={`transition-all duration-700 delay-200 mb-8 sm:mb-12 ${
              certificationsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Certifications
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Professional certifications across my four main fields of expertise
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {(Object.keys(certsByCategory) as Array<keyof typeof certsByCategory>).map((category) => {
                    const certs = certsByCategory[category];
                    const Icon = categoryIcons[category];
                    const label = categoryLabels[category];
                    const colorClass = categoryColors[category];
                    
                    return (
                      <div 
                        key={category}
                        className="group relative p-4 sm:p-5 rounded-xl border border-border/50 bg-gradient-to-br from-background to-card hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
                      >
                        {/* Category Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}>
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base">{label}</h3>
                            <p className="text-xs text-muted-foreground">{certs.length} certification{certs.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        
                        {/* Certifications List */}
                        <div className="space-y-2 sm:space-y-3">
                          {certs.length > 0 ? (
                            certs.map((cert) => (
                              <div 
                                key={cert.id}
                                className="p-2 sm:p-3 rounded-lg bg-background/50 hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all duration-300 cursor-pointer"
                                onClick={() => cert.credentialUrl && window.open(cert.credentialUrl, '_blank')}
                              >
                                <h4 className="font-medium text-xs sm:text-sm group-hover:text-primary transition-colors">
                                  {cert.name}
                                </h4>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                                  <p className="text-xs text-muted-foreground">{cert.issueDate}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs sm:text-sm text-muted-foreground italic p-3">
                              More certifications coming soon...
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content - Experience */}
            <div className="lg:col-span-2">
              {/* Experience Section */}
              <section
                ref={experienceAnimation.ref}
                className={`transition-all duration-700 delay-250 ${
                  experienceAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      Experience
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Development • Design • FinTech • Leadership
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    {profileData.experience.map((exp, index) => {
                      const CategoryIcon = categoryIcons[exp.category];
                      const colorClass = categoryColors[exp.category];
                      
                      return (
                        <div 
                          key={exp.id}
                          className={`relative pl-4 sm:pl-6 ${index !== profileData.experience.length - 1 ? 'pb-4 sm:pb-6 border-l-2 border-border/50' : ''}`}
                        >
                          {/* Timeline dot with category color */}
                          <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gradient-to-br ${colorClass} border-2 border-background shadow-lg`} />
                          
                          <div 
                            className="cursor-pointer group"
                            onClick={() => toggleExperience(exp.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm sm:text-lg group-hover:text-primary transition-colors">
                                    {exp.title}
                                  </h4>
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <CategoryIcon className="w-3 h-3" />
                                    {categoryLabels[exp.category]}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{exp.company}</p>
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                                  <Calendar className="w-3 h-3" />
                                  <span>{exp.startDate} - {exp.endDate || "Present"}</span>
                                  {exp.location && (
                                    <>
                                      <span>•</span>
                                      <MapPin className="w-3 h-3" />
                                      <span>{exp.location}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                                {expandedExperience === exp.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            
                            {/* Expanded content */}
                            <div className={`overflow-hidden transition-all duration-300 ${
                              expandedExperience === exp.id ? 'max-h-96 mt-3 sm:mt-4' : 'max-h-0'
                            }`}>
                              <ul className="space-y-1 sm:space-y-2 text-muted-foreground text-xs sm:text-sm">
                                {exp.description.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                              {exp.skills && exp.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-4">
                                  {exp.skills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Sidebar - Skills */}
            <div>
              <section
                ref={skillsAnimation.ref}
                className={`transition-all duration-700 delay-300 ${
                  skillsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300 sticky top-24">
                  <CardHeader className="pb-2 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    {/* Technical Skills */}
                    <div>
                      <h5 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Technical</h5>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {(showAllSkills ? technicalSkills : technicalSkills.slice(0, 6)).map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="secondary"
                            className="hover:bg-primary/20 transition-colors cursor-default text-xs"
                          >
                            {skill.name}
                            {skill.endorsements && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                • {skill.endorsements}
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Creative Skills */}
                    <div>
                      <h5 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Creative</h5>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {(showAllSkills ? creativeSkills : creativeSkills.slice(0, 4)).map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="secondary"
                            className="hover:bg-primary/20 transition-colors cursor-default text-xs"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Business Skills */}
                    <div>
                      <h5 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Business</h5>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {businessSkills.map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="secondary"
                            className="hover:bg-primary/20 transition-colors cursor-default text-xs"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <h5 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3">Languages</h5>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {languageSkills.map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="outline"
                            className="hover:bg-primary/10 transition-colors cursor-default text-xs"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {(technicalSkills.length > 6 || creativeSkills.length > 4) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs sm:text-sm"
                        onClick={() => setShowAllSkills(!showAllSkills)}
                      >
                        {showAllSkills ? "Show Less" : "Show All Skills"}
                        {showAllSkills ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 ml-2" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutMe;
