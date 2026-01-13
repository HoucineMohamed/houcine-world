import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { user, isAdmin, loading, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/admin");
    }
  }, [user, isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    setEmailSent(true);
    setIsSubmitting(false);
    toast.success("Magic link sent! Check your email.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Admin Access
          </h1>
          <p className="text-muted-foreground">
            Houcine.world Control Panel
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg">
          {emailSent ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Check your email
              </h2>
              <p className="text-muted-foreground mb-6">
                We sent a magic link to <strong className="text-foreground">{email}</strong>
              </p>
              <Button
                variant="ghost"
                onClick={() => setEmailSent(false)}
                className="text-accent hover:text-accent/80"
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-border"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-6">
          Only authorized administrators can access this panel.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
