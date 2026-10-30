import { adminApi } from "@/store/api";
import type { OverviewData } from "../model/types";

export const dashboardApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    overview: build.query<OverviewData, void>({
      query: () => "overview",
      providesTags: ["Overview"],
    }),
  }),
});
