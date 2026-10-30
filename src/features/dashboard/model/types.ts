import type { SitePolicy } from "@/features/site-settings/model/policy";

export type OverviewData = {
  notes: number;
  drafts: number;
  published: number;
  media: number;
  clicks: { id: string; count: number }[];
  policy: SitePolicy;
};
