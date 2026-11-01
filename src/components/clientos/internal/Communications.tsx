import React from "react";
import { clientOsApi } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { LoadingGrid } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { ConversationsView } from "../Conversations";

// Communication with clients and partners, plus team-only threads. Internal notes are never shown outside the team.
const Communications = () => {
  const { brandIds, scopeBrands, userId } = useClientOs();
  const projects = useAsync(() => clientOsApi.projects(brandIds), [JSON.stringify(brandIds)]);
  const rels = useAsync(() => clientOsApi.relationships(brandIds, ["client", "prospect"]), [JSON.stringify(brandIds)]);
  if (!projects.value || !rels.value) return <LoadingGrid tiles={3} />;
  return (
    <ConversationsView brandIds={brandIds} side="team" me={userId}
      starters={{ brands: scopeBrands, projects: projects.value, contacts: rels.value.map((r) => ({ id: r.contact_id, name: r.contact?.name ?? "Client", brand_id: r.brand_id })), audiences: ["client", "partner", "internal"] }} />
  );
};

export default Communications;
