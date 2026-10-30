import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
const baseQuery = fetchBaseQuery({
  baseUrl: "/api/admin/",
  credentials: "same-origin",
  cache: "no-store",
});
export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: async (args, api, extra) => {
    const result = await baseQuery(args, api, extra);
    if (result.error?.status === 401 && typeof window !== "undefined") {
      const page = window.location.pathname;
      const returnTo =
        page === "/gallery" || page === "/updates"
          ? `&returnTo=${encodeURIComponent(page)}`
          : "";
      window.location.replace(`/admin/login?expired=1${returnTo}`);
    }
    return result;
  },
  keepUnusedDataFor: 30,
  tagTypes: [
    "Overview",
    "Notes",
    "Updates",
    "Projects",
    "Settings",
    "Releases",
    "Media",
  ],
  endpoints: () => ({}),
});
