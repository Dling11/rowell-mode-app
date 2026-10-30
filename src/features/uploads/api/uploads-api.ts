import { adminApi } from "@/store/api";
import type {
  MediaRecord,
  UploadSignature,
} from "@/features/uploads/model/schema";
import type { PaginatedResponse } from "@/lib/pagination";
export const uploadsApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    publishMedia: build.mutation<
      { ok: true },
      {
        id: string;
        alt: string;
        caption: string;
        publish: boolean;
        updatedAt: string;
      }
    >({
      query: (body) => ({ url: "uploads/publication", method: "POST", body }),
      invalidatesTags: ["Media", "Projects"],
    }),
    media: build.query<PaginatedResponse<MediaRecord>, number>({
      query: (page) => `uploads?page=${page}`,
      providesTags: ["Media"],
    }),
    signUpload: build.mutation<
      UploadSignature,
      { name: string; bytes: number; mime: string }
    >({
      query: (body) => ({ url: "uploads/signature", method: "POST", body }),
    }),
    completeUpload: build.mutation<MediaRecord, { id: string }>({
      query: (body) => ({ url: "uploads/complete", method: "POST", body }),
      invalidatesTags: ["Media", "Overview"],
    }),
  }),
});
