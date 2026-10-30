export type Platform = "android" | "windows";
export type ProjectStatus =
  "Released" | "In testing" | "In progress" | "On hold";
export type Project = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  platforms: Platform[];
  version: string | null;
  releaseLabel: string;
  repository: string;
  release: string | null;
  credits: string | null;
  attribution: string;
  highlights: string[];
  setup: string[];
  releaseDate: string | null;
  approvedTags?: Partial<Record<Platform, string>>;
  resources?: ProjectResource[];
  resourceUpdatedAt?: string;
  coverMediaId?: string | null;
  coverImage?: { src: string; alt: string };
};
export type ProjectResource = {
  title: string;
  url: string;
  kind: "Website" | "Game files" | "Documentation" | "Source";
};
