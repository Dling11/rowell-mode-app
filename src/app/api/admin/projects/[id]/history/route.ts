import { getDatabase } from "@/server/db/client";
import { findProject } from "@/data/projects";
import { handleAdmin, json, HttpError } from "@/server/http";
import { resourceSchema } from "@/features/projects/model/schema";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleAdmin(request, false, async () => {
    const { id } = await params;
    const seed = findProject(id);
    if (!seed) throw new HttpError(404, "Project not found.");
    const record = await (
      await getDatabase()
    )
      .collection("projects")
      .findOne(
        { projectId: id },
        { projection: { _id: 0, resourceHistory: 1 } },
      );
    const history =
      record?.resourceHistory ||
      (seed.resources?.length
        ? [{ resources: seed.resources, recordedAt: seed.resourceUpdatedAt }]
        : []);
    return json(
      history
        .slice(-50)
        .reverse()
        .flatMap((entry: { resources: unknown; recordedAt: unknown }) => {
          const links = resourceSchema
            .array()
            .max(12)
            .safeParse(entry.resources);
          return links.success && typeof entry.recordedAt === "string"
            ? [{ resources: links.data, recordedAt: entry.recordedAt }]
            : [];
        }),
    );
  });
}
