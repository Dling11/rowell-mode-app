import { adminApi } from "@/store/api";
import type { Note } from "@/features/notes/model/schema";
import type { PaginatedResponse } from "@/lib/pagination";
export const notesApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    publishNote: build.mutation<
      { id: string; alreadyExists: boolean },
      { id: string; updatedAt: string; projectId: string; status: string }
    >({
      query: (body) => ({ url: "notes/publish", method: "POST", body }),
      invalidatesTags: ["Updates", "Overview"],
    }),
    notes: build.query<PaginatedResponse<Note>, number>({
      query: (page) => `notes?page=${page}`,
      providesTags: ["Notes"],
    }),
    saveNote: build.mutation<
      Note,
      Partial<Pick<Note, "id" | "updatedAt">> & Pick<Note, "title" | "body">
    >({
      query: (body) => ({ url: "notes", method: "POST", body }),
      invalidatesTags: ["Notes", "Overview"],
    }),
    deleteNote: build.mutation<{ ok: true }, Pick<Note, "id" | "updatedAt">>({
      query: (body) => ({ url: "notes", method: "DELETE", body }),
      invalidatesTags: ["Notes", "Overview"],
    }),
  }),
});
