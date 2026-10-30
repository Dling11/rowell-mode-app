import { adminApi } from "@/store/api";
import type { ReleasePointer } from "@/features/downloads/model/release-schema";
export type ApprovedRelease = {
  projectId: string;
  platform: string;
  pointer: ReleasePointer;
  verifiedAt: string;
};
export const releasesApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    releases: build.query<ApprovedRelease[], void>({
      query: () => "releases",
      providesTags: ["Releases"],
    }),
    approveRelease: build.mutation<{ ok: true }, ReleasePointer>({
      query: (body) => ({ url: "releases", method: "POST", body }),
      invalidatesTags: ["Releases"],
    }),
  }),
});
