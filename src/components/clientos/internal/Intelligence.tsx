import React from "react";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { AssistantChat } from "../AssistantChat";

// The internal Client Intelligence assistant: brands in view only (the brand filter narrows it further); read-only
// unless an administrator confirms a proposed action.
const Intelligence = () => {
  const { brandIds, scopeBrands, isSuperAdmin } = useClientOs();
  const brandId = brandIds?.length === 1 ? brandIds[0]! : null;
  return (
    <AssistantChat mode="internal" brandId={brandId} title="Client intelligence"
      intro={`Answers from the records of ${brandId ? scopeBrands[0]?.name : isSuperAdmin ? "every brand" : "the brands you administer"}, read fresh for each question. Observations, recommendations and missing information are kept apart; actions need your confirmation.`} />
  );
};
export default Intelligence;
