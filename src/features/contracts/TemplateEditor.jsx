import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";


import VariableSidebar from "./VariableSidebar";
import ContractDocument from "./ContractDocument";
import { quillModules, quillFormats, insertVariableAtCursor, renderTemplate, extractPlaceholders } from "./contractUtils";
import { useContractVariables, useTemplate, useCreateTemplate, useUpdateTemplate } from "./useContractsData";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";
import { cn } from "@/lib/cn";

const PREVIEW_SAMPLE = {
  employee_name: "John Doe", employee_email: "john.doe@example.com", employee_phone: "+92 300 0000000",
  employee_location: "Lahore, Pakistan", position: "Architect", start_date: "1st August, 2026",
  salary: "PKR 75,000 per month", probation_period: "3 months", work_location: "Remote",
  working_days: "Monday to Friday", notice_period: "10 days",
};

const TemplateEditor = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const quillRef = useRef(null);

  const { data: varsData } = useContractVariables();
  const { data: tpl } = useTemplate(isEdit ? id : null);
  const createTpl = useCreateTemplate();
  const updateTpl = useUpdateTemplate();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [previewValues, setPreviewValues] = useState({});
  const [mode, setMode] = useState("edit");

  useEffect(() => {
    if (varsData) {
      const seed = { ...PREVIEW_SAMPLE };
      Object.entries(varsData.defaults || {}).forEach(([k, v]) => { if (v !== "" && v != null) seed[k] = v; });
      setPreviewValues(seed);
    }
  }, [varsData]);

  useEffect(() => {
    if (tpl) { setTitle(tpl.title || ""); setBody(tpl.body || ""); }
  }, [tpl]);

  const catalog = varsData?.catalog || [];
  const labelByKey = useMemo(() => {
    const map = {};
    catalog.forEach((g) => g.items.forEach((it) => (map[it.key] = it.label)));
    return map;
  }, [catalog]);

  const usedKeys = useMemo(() => extractPlaceholders(body), [body]);
  const effectiveValues = useMemo(() => {
    const out = { ...previewValues };
    usedKeys.forEach((k) => { if (out[k] === undefined || out[k] === "") out[k] = previewValues[k] ?? `[${labelByKey[k] || k}]`; });
    return out;
  }, [previewValues, usedKeys, labelByKey]);
  const previewHtml = useMemo(() => renderTemplate(body, effectiveValues), [body, effectiveValues]);

  const handleInsert = (key) => {
    if (mode !== "edit") setMode("edit");
    setTimeout(() => insertVariableAtCursor(quillRef, key), 0);
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Please give the template a title.");
    try {
      if (isEdit) await updateTpl.mutateAsync({ id, data: { title: title.trim(), body } });
      else await createTpl.mutateAsync({ title: title.trim(), body });
      toast.success(isEdit ? "Template updated." : "Template created.");
      navigate("/contracts");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to save the template."));
    }
  };

  const saving = createTpl.isPending || updateTpl.isPending;

  return (
    <div className="pb-6">
      <div className="contract-quill-styles">
        <style>{`
          .contract-quill .ql-editor { line-height: 1.7; min-height: 440px; font-size: 14px; }
          .contract-quill .ql-editor p { margin: 0 0 10px; }
          .contract-quill .ql-editor h1,h2,h3,h4 { font-weight:700; margin: 16px 0 8px; }
        `}</style>
      </div>

      <PageHeader
        title={isEdit ? "Edit Template" : "New Template"}
        subtitle="Build the contract body and drop in variables — fill them when you send."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[var(--line-subtle)] p-0.5 bg-[var(--surface-sunken)]">
              {["edit", "preview"].map((m) => (
                <button key={m} onClick={() => setMode(m)} className={cn("px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors", mode === m ? "bg-[var(--surface-raised)] text-primary-600 dark:text-primary-400 shadow-soft" : "text-[var(--ink-secondary)]")}>
                  {m}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => navigate("/contracts")}>Cancel</Button>
            <Button icon="solar:check-circle-bold" isLoading={saving} onClick={handleSave}>Save Template</Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Template title (e.g. 3D Team — Employment Contract)"
          className="w-full px-4 py-3 text-base font-semibold rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 mb-4"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
          <div className="rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden h-[600px]">
            <VariableSidebar catalog={catalog} onInsert={handleInsert} />
          </div>

          <div className="rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden">
            {mode === "edit" ? (
              <div className="contract-quill p-3">
                <ReactQuill ref={quillRef} theme="snow" value={body} onChange={setBody} modules={quillModules} formats={quillFormats} placeholder="Write the contract here…" />
              </div>
            ) : (
              <div className="flex flex-col h-[600px]">
                {usedKeys.length > 0 && (
                  <div className="border-b border-[var(--line-subtle)] p-3 bg-[var(--surface-sunken)]">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)] mb-2">Sample values (preview only)</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {usedKeys.map((k) => (
                        <div key={k}>
                          <label className="block text-[10px] text-[var(--ink-tertiary)] mb-0.5">{labelByKey[k] || k}</label>
                          <input type="text" value={previewValues[k] ?? ""} onChange={(e) => setPreviewValues((p) => ({ ...p, [k]: e.target.value }))} className="w-full px-2 py-1 text-xs rounded border border-[var(--line-subtle)] bg-[var(--surface-raised)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface-sunken)]">
                  <div className="mx-auto max-w-3xl bg-white shadow-sm rounded-lg p-8 md:p-12">
                    {body ? <ContractDocument html={previewHtml} /> : <p className="text-center text-slate-400 text-sm py-10">Nothing to preview yet.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
