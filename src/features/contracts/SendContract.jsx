import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchSelect from "@/components/ui/SearchSelect";
import ReactQuill from "react-quill";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { quillModules, quillFormats, renderTemplate, extractPlaceholders, isDateKey, formatPrettyDate } from "./contractUtils";
import { useContractVariables, useTemplates, useTemplate, useCreateContract } from "./useContractsData";
import { useAllEmployees } from "@/features/employees/useEmployeesData";

import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/api/client";
import DatePicker from "@/components/ui/DatePicker";


const SendContract = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTemplateId = searchParams.get("template");

  const { data: varsData } = useContractVariables();
  const { data: templatesRaw } = useTemplates();
  const { data: employeesRaw = [] } = useAllEmployees();
  const createContract = useCreateContract();

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedTemplateOpt, setSelectedTemplateOpt] = useState(null);
  const { data: fullTemplate } = useTemplate(selectedTemplateOpt?.value);
  const [templateBody, setTemplateBody] = useState("");
  const [title, setTitle] = useState("");
  const [values, setValues] = useState({});
  const [dateIsoValues, setDateIsoValues] = useState({}); // ISO strings backing the date pickers
  const [body, setBody] = useState("");
  const [manualEdit, setManualEdit] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (varsData) {
      setValues(varsData.defaults || {});
      setDateIsoValues({ contract_date: new Date().toISOString().slice(0, 10) });
    }
  }, [varsData]);

  const templates = (templatesRaw || []).map((t) => ({ value: t.id, label: t.title }));

  useEffect(() => {
    if (presetTemplateId && templates.length && !selectedTemplateOpt) {
      const found = templates.find((o) => String(o.value) === String(presetTemplateId));
      if (found) setSelectedTemplateOpt(found);
    }
  }, [presetTemplateId, templates, selectedTemplateOpt]);

  useEffect(() => {
    if (fullTemplate) {
      setManualEdit(false);
      setTemplateBody(fullTemplate.body || "");
      setTitle((prev) => prev || fullTemplate.title || "");
    }
  }, [fullTemplate]);

  const labelByKey = useMemo(() => {
    const map = {};
    (varsData?.catalog || []).forEach((g) => g.items.forEach((it) => (map[it.key] = it.label)));
    return map;
  }, [varsData]);

  const groupedInputs = useMemo(() => {
    const extra = extractPlaceholders(templateBody).filter((k) => !labelByKey[k]);
    const groups = (varsData?.catalog || []).map((g) => ({ group: g.group, keys: g.items.map((i) => i.key) }));
    if (extra.length) groups.push({ group: "Other", keys: extra });
    return groups;
  }, [varsData, templateBody, labelByKey]);

  useEffect(() => {
    if (manualEdit) return;
    setBody(renderTemplate(templateBody, values));
  }, [templateBody, values, manualEdit]);

  const employees = employeesRaw.map((e) => ({ value: e.id, label: `${e.name}${e.email ? ` · ${e.email}` : ""}`, employee: e }));

  const handleEmployee = (option) => {
    setSelectedEmployee(option);
    const e = option?.employee;
    setValues((v) => ({ ...v, employee_name: e?.name || "", employee_email: e?.email || "", employee_phone: e?.phone || "" }));
  };

  const handleSend = async () => {
    if (!selectedEmployee) return toast.error("Please choose an employee.");
    if (!selectedTemplateOpt) return toast.error("Please choose a template.");
    if (!title.trim()) return toast.error("Please enter a contract title.");
    if (!body || !body.replace(/<[^>]*>/g, "").trim()) return toast.error("The contract content is empty.");

    try {
      const res = await createContract.mutateAsync({
        recipient_id: selectedEmployee.value,
        template_id: selectedTemplateOpt.value,
        title: title.trim(),
        body,
        variables: values,
      });
      toast.success(res.data?.message || "Contract sent.");
      navigate("/contracts");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to send the contract."));
    }
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="Send a Contract"
        subtitle="Pick an employee and a template, review the filled contract, then send."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview((s) => !s)} className="lg:hidden px-3 py-2 text-sm rounded-lg border border-[var(--line-subtle)]">
              {showPreview ? "Edit fields" : "Preview"}
            </button>
            <Button icon="solar:plain-2-bold" isLoading={createContract.isPending} onClick={handleSend}>Generate &amp; Send</Button>
          </div>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-4 grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4">
        <div className={`${showPreview ? "hidden" : "block"} lg:block space-y-4 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] p-4 h-fit`}>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Employee</label>
            <SearchSelect options={employees} value={selectedEmployee?.value ?? null} onChange={(v, opt) => handleEmployee(opt)} placeholder="Choose an employee…" searchPlaceholder="Search employees…" clearable />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Template</label>
            <SearchSelect options={templates} value={selectedTemplateOpt?.value ?? null} onChange={(v, opt) => setSelectedTemplateOpt(opt)} placeholder="Choose a template…" searchPlaceholder="Search templates…" emptyText="No templates yet" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5">Contract Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Employment Contract" className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
          </div>

          {selectedTemplateOpt && (
            <div className="pt-1 space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">Contract details</div>
              {groupedInputs.map((g) => (
                <div key={g.group}>
                  <div className="text-[11px] text-[var(--ink-tertiary)] mb-1.5">{g.group}</div>
                  <div className="space-y-2">
                    {g.keys.map((k) =>
                      isDateKey(k) ? (
                        <div key={k}>
                          <label className="block text-[11px] text-[var(--ink-secondary)] mb-0.5">{labelByKey[k] || k}</label>
                          <DatePicker
                            anchorClassName="flex w-full"
                            value={dateIsoValues[k] || ""}
                            trigger={
                              <span className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] cursor-pointer">
                                {values[k] || <span className="text-[var(--ink-tertiary)]">Select a date</span>}
                              </span>
                            }
                            onChange={(iso) => {
                              setDateIsoValues((p) => ({ ...p, [k]: iso || "" }));
                              setValues((v) => ({ ...v, [k]: iso ? formatPrettyDate(new Date(`${iso}T00:00:00`)) : "" }));
                            }}
                          />
                        </div>
                      ) : (
                        <div key={k}>
                          <label className="block text-[11px] text-[var(--ink-secondary)] mb-0.5">{labelByKey[k] || k}</label>
                          <input type="text" value={values[k] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-[var(--line-subtle)] bg-[var(--surface-raised)] focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${showPreview ? "block" : "hidden"} lg:block rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line-subtle)] bg-[var(--surface-sunken)]">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink-secondary)]">
              <Icon icon="solar:document-text-linear" className="text-primary-500" />
              Contract Preview
              {manualEdit && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">edited</span>}
            </div>
            {manualEdit && (
              <button onClick={() => { setManualEdit(false); setBody(renderTemplate(templateBody, values)); }} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                <Icon icon="solar:refresh-linear" className="text-xs" /> Reset to template
              </button>
            )}
          </div>

          {!selectedTemplateOpt ? (
            <div className="p-16 text-center text-[var(--ink-tertiary)] text-sm">Choose an employee and a template to see the contract here.</div>
          ) : (
            <div className="contract-quill p-3">
              <ReactQuill
                theme="snow"
                value={body}
                onChange={(content, _delta, source) => { setBody(content); if (source === "user") setManualEdit(true); }}
                modules={quillModules}
                formats={quillFormats}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendContract;
