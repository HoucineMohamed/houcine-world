import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Heart, 
  Users, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Linkedin,
  Star,
  Calendar,
  Building,
  BookOpen
} from "lucide-react";
import { Link } from "react-router-dom";
import profile from "@/assets/profile.png";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import CustomCursor from "@/components/CustomCursor";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { profileData } from "@/data/profileData";

const AboutMe = () => {
  const [expandedExperience, setExpandedExperience] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  
  const headerAnimation = useScrollAnimation();
  const aboutAnimation = useScrollAnimation();
  const featuredAnimation = useScrollAnimation();
  const experienceAnimation = useScrollAnimation();
  const educationAnimation = useScrollAnimation();
  const skillsAnimation = useScrollAnimation();
  const certificationsAnimation = useScrollAnimation();
  const volunteerAnimation = useScrollAnimation();
  const organizationsAnimation = useScrollAnimation();

  const toggleExperience = (id: string) => {
    setExpandedExperience(expandedExperience === id ? null : id);
  };

  const technicalSkills = profileData.skills.filter(s => s.category === "technical");
  const businessSkills = profileData.skills.filter(s => s.category === "business");
  const creativeSkills = profileData.skills.filter(s => s.category === "creative");
  const languageSkills = profileData.skills.filter(s => s.category === "language");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgressBar />
      <CustomCursor />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur bg-background/95">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(profileData.linkedInUrl, '_blank')}
            className="gap-2"
          >
            <Linkedin className="w-4 h-4" />
            View LinkedIn
          </Button>
        </div>
      </header>

      <main className="pt-24 pb-16">
        {/* Profile Header Section */}
        <section 
          ref={headerAnimation.ref}
          className={`relative transition-all duration-700 ${
            headerAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* Banner */}
          <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Profile Info */}
          <div className="container mx-auto px-6 -mt-20 relative z-10">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Profile Photo */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity" />
                <img 
                  src={profile} 
                  alt={`${profileData.firstName} ${profileData.lastName}`}
                  className="relative w-40 h-40 md:w-48 md:h-48 rounded-full object-cover border-4 border-background shadow-2xl"
                />
              </div>

              {/* Name & Info */}
              <div className="flex-1 pt-4 md:pt-8">
                <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
                  {profileData.firstName} {profileData.lastName}
                </h1>
                <p className="text-lg text-muted-foreground mb-3 max-w-2xl">
                  {profileData.headline}
                </p>
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{profileData.location}</span>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{profileData.yearsOfExperience}+</p>
                    <p className="text-sm text-muted-foreground">Years Experience</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{profileData.projectsCompleted}+</p>
                    <p className="text-sm text-muted-foreground">Projects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{profileData.clientsServed}+</p>
                    <p className="text-sm text-muted-foreground">Clients</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-6 mt-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Section */}
              <section
                ref={aboutAnimation.ref}
                className={`transition-all duration-700 delay-100 ${
                  aboutAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <BookOpen className="w-5 h-5 text-primary" />
                      About
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {profileData.about}
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Featured Section */}
              {profileData.featuredLinks && profileData.featuredLinks.length > 0 && (
                <section
                  ref={featuredAnimation.ref}
                  className={`transition-all duration-700 delay-150 ${
                    featuredAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                  }`}
                >
                  <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Star className="w-5 h-5 text-primary" />
                        Featured
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {profileData.featuredLinks.map((link, index) => (
                          <Link
                            key={index}
                            to={link.url}
                            className="group p-4 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                          >
                            <h4 className="font-semibold group-hover:text-primary transition-colors mb-1">
                              {link.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {link.description}
                            </p>
                            <ExternalLink className="w-4 h-4 mt-2 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Experience Section */}
              <section
                ref={experienceAnimation.ref}
                className={`transition-all duration-700 delay-200 ${
                  experienceAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Briefcase className="w-5 h-5 text-primary" />
                      Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {profileData.experience.map((exp, index) => (
                      <div 
                        key={exp.id}
                        className={`relative pl-6 ${index !== profileData.experience.length - 1 ? 'pb-6 border-l-2 border-border/50' : ''}`}
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary" />
                        
                        <div 
                          className="cursor-pointer group"
                          onClick={() => toggleExperience(exp.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                {exp.title}
                              </h4>
                              <p className="text-muted-foreground">{exp.company}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
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
                            <Button variant="ghost" size="icon" className="shrink-0">
                              {expandedExperience === exp.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          
                          {/* Expanded content */}
                          <div className={`overflow-hidden transition-all duration-300 ${
                            expandedExperience === exp.id ? 'max-h-96 mt-4' : 'max-h-0'
                          }`}>
                            <ul className="space-y-2 text-muted-foreground">
                              {exp.description.map((item, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary mt-1.5">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                            {exp.skills && exp.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4">
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
                    ))}
                  </CardContent>
                </Card>
              </section>

              {/* Education Section */}
              <section
                ref={educationAnimation.ref}
                className={`transition-all duration-700 delay-250 ${
                  educationAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {profileData.education.map((edu) => (
                      <div key={edu.id} className="group">
                        <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {edu.school}
                        </h4>
                        <p className="text-muted-foreground">
                          {edu.degree} • {edu.field}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{edu.startDate} - {edu.endDate}</span>
                        </div>
                        {edu.description && (
                          <p className="text-sm text-muted-foreground mt-2">{edu.description}</p>
                        )}
                        {edu.activities && edu.activities.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {edu.activities.map((activity) => (
                              <Badge key={activity} variant="outline" className="text-xs">
                                {activity}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>

              {/* Volunteer Experience */}
              <section
                ref={volunteerAnimation.ref}
                className={`transition-all duration-700 delay-300 ${
                  volunteerAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Heart className="w-5 h-5 text-primary" />
                      Volunteer Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {profileData.volunteerExperience.map((vol) => (
                      <div key={vol.id} className="group">
                        <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {vol.role}
                        </h4>
                        <p className="text-muted-foreground">{vol.organization}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{vol.startDate} - {vol.endDate || "Present"}</span>
                          {vol.cause && (
                            <>
                              <span>•</span>
                              <span>{vol.cause}</span>
                            </>
                          )}
                        </div>
                        {vol.description && (
                          <p className="text-sm text-muted-foreground mt-2">{vol.description}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Sidebar - Right Column */}
            <div className="space-y-8">
              {/* Skills Section */}
              <section
                ref={skillsAnimation.ref}
                className={`transition-all duration-700 delay-200 ${
                  skillsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300 sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Star className="w-5 h-5 text-primary" />
                      Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Technical Skills */}
                    <div>
                      <h5 className="text-sm font-semibold text-muted-foreground mb-3">Technical</h5>
                      <div className="flex flex-wrap gap-2">
                        {(showAllSkills ? technicalSkills : technicalSkills.slice(0, 6)).map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="secondary"
                            className="hover:bg-primary/20 transition-colors cursor-default"
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
                      <h5 className="text-sm font-semibold text-muted-foreground mb-3">Creative</h5>
                      <div className="flex flex-wrap gap-2">
                        {(showAllSkills ? creativeSkills : creativeSkills.slice(0, 4)).map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="secondary"
                            className="hover:bg-primary/20 transition-colors cursor-default"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Business Skills */}
                    <div>
                      <h5 className="text-sm font-semibold text-muted-foreground mb-3">Business</h5>
                      <div className="flex flex-wrap gap-2">
                        {businessSkills.map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="secondary"
                            className="hover:bg-primary/20 transition-colors cursor-default"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <h5 className="text-sm font-semibold text-muted-foreground mb-3">Languages</h5>
                      <div className="flex flex-wrap gap-2">
                        {languageSkills.map((skill) => (
                          <Badge 
                            key={skill.name} 
                            variant="outline"
                            className="hover:bg-primary/10 transition-colors cursor-default"
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
                        className="w-full"
                        onClick={() => setShowAllSkills(!showAllSkills)}
                      >
                        {showAllSkills ? "Show Less" : "Show All Skills"}
                        {showAllSkills ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Certifications Section */}
              <section
                ref={certificationsAnimation.ref}
                className={`transition-all duration-700 delay-250 ${
                  certificationsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Award className="w-5 h-5 text-primary" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileData.certifications.map((cert) => (
                      <div 
                        key={cert.id} 
                        className="group p-3 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer"
                        onClick={() => cert.credentialUrl && window.open(cert.credentialUrl, '_blank')}
                      >
                        <h4 className="font-semibold group-hover:text-primary transition-colors">
                          {cert.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Issued {cert.issueDate}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>

              {/* Organizations Section */}
              <section
                ref={organizationsAnimation.ref}
                className={`transition-all duration-700 delay-300 ${
                  organizationsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur hover:border-primary/30 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Users className="w-5 h-5 text-primary" />
                      Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileData.organizations.map((org) => (
                      <div 
                        key={org.id} 
                        className="group p-3 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                              {org.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">{org.role}</p>
                          </div>
                        </div>
                        {org.description && (
                          <p className="text-xs text-muted-foreground mt-2">{org.description}</p>
                        )}
                      </div>
                    ))}
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
