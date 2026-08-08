import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { atLeast } from "@/lib/roles";
import { fetchMessages, sendMessage, type WorkspaceMessage } from "@/services/messages";

const BrandMessages = () => {
  const { brandId } = useParams();
  const { user } = useWorkspace();
  const { role, isSuperAdmin } = useActiveBrand();
  const [rows, setRows] = useState<WorkspaceMessage[]>([]);
  const [body, setBody] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const canPost = isSuperAdmin || atLeast(role, "editor");

  const load = () => {
    if (!brandId) return;
    fetchMessages(brandId).then(setRows).catch(() => setRows([]));
  };

  useEffect(load, [brandId]);
  useRealtimeTable("messages", brandId, load);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [rows.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !brandId || !user) return;
    try {
      await sendMessage(brandId, user.id, body.trim());
      setBody("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Message blocked");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <h1 className="text-2xl font-bold text-foreground mb-6">Messages</h1>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {rows.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground mb-1">
              {new Date(m.created_at).toLocaleString()}
              {m.sender_id === user?.id ? " · you" : ""}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground py-8 text-center">No messages yet.</p>}
        <div ref={bottom} />
      </div>
      {canPost ? (
        <form onSubmit={submit} className="flex gap-2 pt-4">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" />
          <Button type="submit"><Send className="w-4 h-4" /></Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground pt-4">You have read-only access to messages.</p>
      )}
    </div>
  );
};

export default BrandMessages;
