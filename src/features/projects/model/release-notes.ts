import type { Project } from "./types";

export function getProjectWhatsNew(project: Project): Project["whatsNew"] {
  const notes = project.whatsNew;
  if (!notes) return undefined;
  if (notes.platform || notes.tag) {
    if (!notes.platform || !notes.tag) return undefined;
    return project.approvedTags?.[notes.platform] === notes.tag ? notes : undefined;
  }
  return notes.version === project.version ? notes : undefined;
}
