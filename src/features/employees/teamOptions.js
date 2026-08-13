// Teams are fixed labels agreed with management; the backend stores a free
// string, so adding one later is a one-line change here. Kept in its own
// tiny module (not inside EmployeeFormPage.jsx) so lighter-weight consumers
// — like the Policies page, which every employee opens — don't have to pull
// in the whole employee-form bundle just for this list.
export const TEAM_OPTIONS = [
  { value: "BIM Team", label: "BIM Team" },
  { value: "3D Team", label: "3D Team" },
  { value: "Outsource Department", label: "Outsource Department" },
  { value: "Business Team", label: "Business Team" },
];
