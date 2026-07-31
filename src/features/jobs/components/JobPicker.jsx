import React, { useMemo } from "react";
import SearchSelect from "@/components/ui/SearchSelect";

/** Shared "which job am I looking at?" picker for the Board/Calendar/Table views. */
const JobPicker = ({ jobs = [], value, onChange, placeholder = "Choose a job…" }) => {
  const options = useMemo(
    () => jobs.map((j) => ({ value: j.id, label: j.project_name, sublabel: j.customer?.name })),
    [jobs]
  );

  return (
    <div className="w-full sm:w-72">
      <SearchSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder="Search jobs…"
        emptyText="No jobs match"
      />
    </div>
  );
};

export default JobPicker;
