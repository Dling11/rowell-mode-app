import { adminApi } from "@/store/api";
import type { SaveFolder } from "../model/schema";
export const savesApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    saveFolders: build.query<SaveFolder[], void>({
      query: () => "game-saves",
      providesTags: ["GameSaves"],
    }),
    createSaveFolder: build.mutation<SaveFolder, { name: string }>({
      query: (body) => ({ url: "game-saves", method: "POST", body }),
      invalidatesTags: ["GameSaves"],
    }),
    updateSaveFolder: build.mutation<
      { folder: SaveFolder; token: string | null },
      { id: string; action: "rename" | "invite" | "revoke"; name?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `game-saves/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["GameSaves"],
    }),
    uploadSave: build.mutation<SaveFolder, { folder: string; body: FormData }>({
      query: ({ folder, body }) => ({
        url: `game-saves/${folder}/files`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GameSaves"],
    }),
    deleteSave: build.mutation<{ ok: true }, { folder: string; id: string }>({
      query: ({ folder, id }) => ({
        url: `game-saves/${folder}/files/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["GameSaves"],
    }),
  }),
});
