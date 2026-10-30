import { getDatabase } from "@/server/db/client";
import { getPublicProjects } from "@/server/db/projects";
import { projectEditSchema } from "@/features/projects/model/schema";
import { handleAdmin, readJson, json } from "@/server/http";
import { HttpError } from "@/server/http";
import { findProject } from "@/data/projects";
import type { ProjectResource } from "@/features/projects/model/types";
type ProjectRecord = {
  projectId: string;
  resources?: ProjectResource[];
  resourceUpdatedAt?: string;
  resourceHistory?: { resources: ProjectResource[]; recordedAt: string }[];
};
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleAdmin(request, false, async () =>
    json(await getPublicProjects()),
  );
}
export async function POST(request: Request) {
  return handleAdmin(request, true, async (owner) => {
    const input = await readJson(request, projectEditSchema);
    const db = await getDatabase();
    if (
      input.coverMediaId &&
      !(await db
        .collection("media")
        .findOne({
          id: input.coverMediaId,
          ownerId: owner.ownerId,
          publishedAt: { $type: "string" },
          previewUrl: { $type: "string" },
        }))
    )
      throw new HttpError(
        400,
        "Choose one of your published images, or use the default artwork.",
      );
    const projectRecords = db.collection<ProjectRecord>("projects");
    const previous = await projectRecords.findOne({
      projectId: input.projectId,
    });
    const previousResources =
      previous?.resources || findProject(input.projectId)?.resources || [];
    const changed =
      JSON.stringify(previousResources) !== JSON.stringify(input.resources);
    const now = new Date().toISOString();
    await projectRecords.updateOne(
      { projectId: input.projectId },
      {
        $set: {
          ...input,
          updatedAt: now,
          schemaVersion: 1,
          ...(changed ? { resourceUpdatedAt: now } : {}),
        },
        ...(changed
          ? {
              $push: {
                resourceHistory: {
                  $each: [
                    ...(!previous?.resourceHistory?.length &&
                    previousResources.length
                      ? [
                          {
                            resources: previousResources,
                            recordedAt:
                              previous?.resourceUpdatedAt ||
                              findProject(input.projectId)?.resourceUpdatedAt ||
                              now,
                          },
                        ]
                      : []),
                    { resources: input.resources, recordedAt: now },
                  ],
                  $slice: -50,
                },
              },
            }
          : {}),
      },
      { upsert: true },
    );
    return json({ ok: true });
  });
}
