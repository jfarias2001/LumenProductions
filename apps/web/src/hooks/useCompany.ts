import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompanyProfileInput } from '@content-engine/shared';
import { api } from '../lib/api.js';

/** Base de conhecimento da empresa (PRD-005). Embasa as gerações de IA. */
export function useCompanyProfile() {
  return useQuery<CompanyProfileInput>({
    queryKey: ['company-profile'],
    queryFn: () => api.get('/company-profile'),
  });
}

export function useSaveCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyProfileInput) => api.put<CompanyProfileInput>('/company-profile', input),
    onSuccess: (data) => qc.setQueryData(['company-profile'], data),
  });
}
