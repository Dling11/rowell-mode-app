import { adminApi } from "@/store/api";
import type { UpdateRecord } from "@/features/updates/model/types";
import type { PaginatedResponse } from "@/lib/pagination";
type SaveUpdate = Omit<UpdateRecord, "id" | "publishedAt" | "updatedAt"> & {
  id?: string;
  updatedAt?: string;
  publish: boolean;
};
export const updatesApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    updates: build.query<PaginatedResponse<UpdateRecord>, number>({
      query: (page) => `updates?page=${page}`,
      providesTags: ["Updates"],
    }),
    saveUpdate: build.mutation<UpdateRecord, SaveUpdate>({
      query: (body) => ({ url: "updates", method: "POST", body }),
      invalidatesTags: ["Updates", "Overview"],
    }),
    deleteUpdate: build.mutation<
      { ok: true },
      { id: string; updatedAt: string }
    >({
      query: (body) => ({ url: "updates", method: "DELETE", body }),
      invalidatesTags: ["Updates", "Overview"],
    }),
  }),
});
