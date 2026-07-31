import React from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

/** Placeholder for modules being redesigned next — keeps nav fully functional. */
const ComingSoonPage = ({ title, description = "This redesigned module is coming very soon." }) => (
  <div>
    <PageHeader title={title} />
    <EmptyState icon="solar:magic-stick-3-bold-duotone" title="Being redesigned" description={description} className="py-24" />
  </div>
);

export default ComingSoonPage;
