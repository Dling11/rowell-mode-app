import { adminApi } from "@/store/api";
import type { Project } from "@/features/projects/model/types";
import type { ProjectResource } from "@/features/projects/model/types";
export const projectsApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    projectHistory: build.query<
      { resources: ProjectResource[]; recordedAt: string }[],
      string
    >({
      query: (id) => `projects/${id}/history`,
      providesTags: ["Projects"],
    }),
    projects: build.query<Project[], void>({
      query: () => "projects",
      providesTags: ["Projects"],
    }),
    saveProject: build.mutation<
      { ok: true },
      {
        projectId: string;
        summary: string;
        description: string;
        status: string;
        resources: ProjectResource[];
        coverMediaId: string | null;
      }
    >({
      query: (body) => ({ url: "projects", method: "POST", body }),
      invalidatesTags: ["Projects"],
    }),
  }),
});
