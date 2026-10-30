import "server-only";
import { projects as seed } from "@/data/projects";
import { databaseConfigured, getDatabase } from "@/server/db/client";
import type { Project } from "@/features/projects/model/types";
import { releasePointerSchema } from "@/features/downloads/model/release-schema";
import { resourceSchema } from "@/features/projects/model/schema";

export async function getPublicProjects(): Promise<Project[]> {
  if (!databaseConfigured()) return seed;
  try {
    const db = await getDatabase();
    const [records, releases] = await Promise.all([
      db
        .collection("projects")
        .find(
          {},
          {
            projection: {
              _id: 0,
              projectId: 1,
              summary: 1,
              description: 1,
              status: 1,
              resources: 1,
              resourceUpdatedAt: 1,
              coverMediaId: 1,
            },
          },
        )
        .limit(50)
        .toArray(),
      db
        .collection("releases")
        .find(
          {},
          { projection: { _id: 0, projectId: 1, platform: 1, pointer: 1 } },
        )
        .limit(10)
        .toArray(),
    ]);
    const covers = await db
      .collection("media")
      .find(
        {
          id: {
            $in: records
              .map((r) => r.coverMediaId)
              .filter((id) => typeof id === "string"),
          },
          publishedAt: { $type: "string" },
          previewUrl: { $type: "string" },
        },
        { projection: { _id: 0, id: 1, alt: 1 } },
      )
      .limit(50)
      .toArray();
    return seed.map((project) => {
      const record = records.find((r) => r.projectId === project.id);
      const resources = resourceSchema
        .array()
        .max(12)
        .safeParse(record?.resources);
      const cover = covers.find((c) => c.id === record?.coverMediaId);
      const approvedTags: Project["approvedTags"] = {};
      for (const release of releases) {
        const parsed = releasePointerSchema.safeParse(release.pointer);
        if (
          parsed.success &&
          parsed.data.projectId === project.id &&
          parsed.data.projectId === release.projectId &&
          parsed.data.platform === release.platform
        )
          approvedTags[parsed.data.platform] = parsed.data.tag;
      }
      const tags = Object.values(approvedTags);
      const sameTag = tags.length > 0 && tags.every((tag) => tag === tags[0]);
      return {
        ...project,
        approvedTags,
        version: tags.length
          ? sameTag
            ? tags[0].replace(/^rowell-|^v/, "")
            : null
          : project.version,
        releaseLabel:
          tags.length &&
          (!sameTag ||
            tags[0] !== (project.id === "mh-tri" ? "rowell-1.4.13" : "v1.0.2"))
            ? "Owner-approved public release"
            : project.releaseLabel,
        release:
          tags.length && project.release
            ? `${project.repository}/releases`
            : project.release,
        summary:
          typeof record?.summary === "string"
            ? record.summary
            : project.summary,
        description:
          typeof record?.description === "string"
            ? record.description
            : project.description,
        status: ["Released", "In testing", "In progress", "On hold"].includes(
          record?.status,
        )
          ? record!.status
          : project.status,
        resources: resources.success ? resources.data : project.resources || [],
        resourceUpdatedAt:
          typeof record?.resourceUpdatedAt === "string"
            ? record.resourceUpdatedAt
            : project.resourceUpdatedAt,
        coverMediaId: cover ? String(cover.id) : null,
        coverImage: cover
          ? {
              src: `/media/${cover.id}`,
              alt: String(cover.alt || project.name),
            }
          : undefined,
      };
    });
  } catch {
    return seed;
  }
}
