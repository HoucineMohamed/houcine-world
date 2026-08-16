import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { BRAND_ROLES, atLeast, brandRoleLabel } from "@/lib/roles";
import { updateBrand } from "@/services/brands";
import {
  changeMemberRole, fetchBrandMembers, grantMembership, revokeMembership, type BrandMember,
} from "@/services/memberships";
import ConnectedAccountsCard from "@/components/workspace/settings/ConnectedAccountsCard";

const BrandSettings = () => {
  const { brandId } = useParams();
  const { brand, role, isSuperAdmin, reload } = useActiveBrand();
  const canManage = isSuperAdmin || atLeast(role, "brand_admin");

  const [name, setName] = useState(brand?.name ?? "");
  const [status, setStatus] = useState(brand?.status ?? "active");
  const [members, setMembers] = useState<BrandMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  useEffect(() => { setName(brand?.name ?? ""); setStatus(brand?.status ?? "active"); }, [brand]);

  const loadMembers = useCallback(() => {
    if (!brandId) return;
    fetchBrandMembers(brandId).then(setMembers).catch(() => setMembers([]));
  }, [brandId]);
  useEffect(() => { loadMembers(); }, [loadMembers]);

  const saveBrand = async () => {
    try { await updateBrand(brandId!, { name, status }); toast.success("Brand updated"); reload(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Update blocked"); }
  };

  const run = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast.success(ok); loadMembers(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Blocked by the database"); }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">Brand profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} />
          <Select value={status} onValueChange={setStatus} disabled={!canManage}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {["active", "paused", "archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && <Button onClick={saveBrand}>Save changes</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{m.profile?.full_name || m.profile?.email || m.user_id}</p>
                <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
              </div>
              {canManage ? (
                <>
                  <Select
                    value={m.role}
                    onValueChange={(v) => run(() => changeMemberRole(brandId!, m.user_id, v), "Role updated")}
                  >
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {BRAND_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => run(() => revokeMembership(brandId!, m.user_id), "Access revoked")}
                  >
                    Revoke
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{brandRoleLabel(m.role)}</span>
              )}
            </div>
          ))}
          {!members.length && <p className="text-sm text-muted-foreground">No members visible.</p>}

          {canManage && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Input
                className="flex-1 min-w-[200px]" placeholder="existing user's email"
                value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {BRAND_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={() => run(async () => {
                  await grantMembership(brandId!, inviteEmail, inviteRole);
                  setInviteEmail("");
                }, "Access granted")}
              >
                Grant access
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Membership changes run through an audited server-side action and are enforced by database policies.
          </p>
        </CardContent>
      </Card>

      {brandId && (
        <div className="mt-8">
          <ConnectedAccountsCard brandId={brandId} canManage={canManage} />
        </div>
      )}
    </div>
  );
};

export default BrandSettings;
