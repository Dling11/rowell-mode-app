import { adminApi } from "@/store/api";
import type { PaginatedResponse } from "@/lib/pagination";
import type { ResearchItem, ResearchFields } from "../model/schema";
export const researchApi = adminApi.injectEndpoints({ endpoints: (build) => ({
  research: build.query<PaginatedResponse<ResearchItem>, { page: number; q: string; status: string }>({ query: ({ page, q, status }) => `research?${new URLSearchParams({ page: String(page), q, status })}`, providesTags: ["Research"] }),
  saveResearch: build.mutation<ResearchItem, ResearchFields & Partial<Pick<ResearchItem, "id" | "updatedAt">>>({ query: (body) => ({ url: "research", method: "POST", body }), invalidatesTags: ["Research"] }),
  deleteResearch: build.mutation<{ ok: true }, Pick<ResearchItem, "id" | "updatedAt">>({ query: (body) => ({ url: "research", method: "DELETE", body }), invalidatesTags: ["Research"] }),
  checkResearch: build.mutation<ResearchItem, Pick<ResearchItem, "id" | "updatedAt">>({ query: ({ id, updatedAt }) => ({ url: `research/${id}/check`, method: "POST", body: { updatedAt } }), invalidatesTags: ["Research"] }),
}) });
