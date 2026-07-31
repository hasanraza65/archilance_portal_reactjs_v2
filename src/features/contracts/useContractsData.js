import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTemplates, fetchTemplate, createTemplate, updateTemplate, deleteTemplate,
  fetchContractVariables, fetchContracts, createContract, updateContractStatus, resendContract, deleteContract,
} from "@/api/contracts";

export function useTemplates() {
  return useQuery({ queryKey: ["contract-templates"], queryFn: () => fetchTemplates().then((r) => r.data) });
}

export function useTemplate(id) {
  return useQuery({ queryKey: ["contract-template", id], queryFn: () => fetchTemplate(id).then((r) => r.data), enabled: Boolean(id) });
}

export function useContractVariables() {
  return useQuery({ queryKey: ["contract-variables"], queryFn: () => fetchContractVariables().then((r) => r.data), staleTime: 5 * 60_000 });
}

export function useContracts(params) {
  return useQuery({ queryKey: ["contracts", params], queryFn: () => fetchContracts(params).then((r) => r.data), placeholderData: (p) => p });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ["contract-templates"] }) });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => updateTemplate(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["contract-templates"] }) });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ["contract-templates"] }) });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createContract, onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }) });
}

export function useUpdateContractStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }) => updateContractStatus(id, status), onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }) });
}

export function useResendContract() {
  return useMutation({ mutationFn: resendContract });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteContract, onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }) });
}
