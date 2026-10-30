import { adminApi } from "@/store/api";
import type { SiteSettings } from "@/features/site-settings/model/policy";
export type SettingsData = {
  settings: SiteSettings;
  updatedAt: string;
  effectiveMode: string;
  emergencyMode: string | null;
};
export const settingsApi = adminApi.injectEndpoints({
  endpoints: (build) => ({
    settings: build.query<SettingsData, void>({
      query: () => "settings",
      providesTags: ["Settings"],
    }),
    saveSettings: build.mutation<
      { ok: true },
      { settings: SiteSettings; updatedAt: string }
    >({
      query: (body) => ({ url: "settings", method: "POST", body }),
      invalidatesTags: ["Settings", "Overview"],
    }),
  }),
});
