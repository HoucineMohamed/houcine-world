import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Phone, 
  Calendar,
  Filter,
  Archive,
  CheckCircle,
  MessageSquare,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Submission {
  id: string;
  page_name: string;
  form_type: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  service_type: string | null;
  message: string | null;
  additional_data: unknown;
  status: string;
  created_at: string;
}

interface AdminInboxProps {
  onStatusChange?: () => void;
}

const AdminInbox: React.FC<AdminInboxProps> = ({ onStatusChange }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (sourceFilter !== "all") {
        query = query.eq("page_name", sourceFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [sourceFilter, statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("submissions")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      
      onStatusChange?.();
      toast.success(`Marked as ${newStatus}`);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-accent text-accent-foreground">New</Badge>;
      case "replied":
        return <Badge variant="secondary">Replied</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      "Houcine.studio": "bg-purple-500/20 text-purple-300",
      "Houcine.tech": "bg-blue-500/20 text-blue-300",
      "Houcine.education": "bg-green-500/20 text-green-300",
      "La Rosa View": "bg-pink-500/20 text-pink-300",
      "Houcine.world": "bg-cyan-500/20 text-cyan-300",
    };
    return (
      <Badge className={colors[source] || "bg-gray-500/20 text-gray-300"}>
        {source}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            Inbox
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px] bg-background border-border">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Houcine.studio">Houcine.studio</SelectItem>
                <SelectItem value="Houcine.tech">Houcine.tech</SelectItem>
                <SelectItem value="Houcine.education">Houcine.education</SelectItem>
                <SelectItem value="La Rosa View">La Rosa View</SelectItem>
                <SelectItem value="Houcine.world">Houcine.world</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No messages found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className={`p-4 rounded-lg border transition-colors ${
                  submission.status === "new"
                    ? "bg-accent/5 border-accent/20"
                    : "bg-background border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSourceBadge(submission.page_name)}
                    <Badge variant="outline" className="text-muted-foreground">
                      {submission.form_type}
                    </Badge>
                    {getStatusBadge(submission.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(submission.created_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">
                    {submission.user_name}
                  </h3>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <a
                      href={`mailto:${submission.user_email}`}
                      className="flex items-center gap-1 hover:text-accent transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {submission.user_email}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {submission.user_phone && (
                      <a
                        href={`tel:${submission.user_phone}`}
                        className="flex items-center gap-1 hover:text-accent transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {submission.user_phone}
                      </a>
                    )}
                  </div>

                  {submission.service_type && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Service:</strong> {submission.service_type}
                    </p>
                  )}

                  {submission.message && (
                    <p className="text-foreground mt-2 whitespace-pre-wrap">
                      {submission.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateStatus(submission.id, "replied")}
                    disabled={submission.status === "replied"}
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark Replied
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateStatus(submission.id, "archived")}
                    disabled={submission.status === "archived"}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Archive className="w-4 h-4 mr-1" />
                    Archive
                  </Button>
                  <a
                    href={`mailto:${submission.user_email}?subject=Re: Your ${submission.form_type} from ${submission.page_name}`}
                    className="inline-flex"
                  >
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminInbox;
