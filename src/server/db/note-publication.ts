import "server-only";
import { getDatabase } from "./client";
import type { z } from "zod";
import { publishNoteSchema } from "@/features/notes/model/schema";
import { HttpError } from "@/server/http";
export async function publishNoteCopy(
  ownerId: string,
  input: z.infer<typeof publishNoteSchema>,
) {
  const db = await getDatabase();
  const note = await db
    .collection("notes")
    .findOne({ id: input.id, ownerId, updatedAt: input.updatedAt });
  if (!note)
    throw new HttpError(
      409,
      "This note changed. Reload and review it before publishing.",
    );
  if (
    typeof note.body !== "string" ||
    !note.body.trim() ||
    note.body.length > 16000
  )
    throw new HttpError(
      400,
      "Public notes need 1–16,000 characters. Edit and save the note before publishing.",
    );
  const now = new Date().toISOString();
  // A stable copy ID makes retries safe. Private edits never update the public copy.
  const result = await db.collection("updates").updateOne(
    { id: input.id },
    {
      $setOnInsert: {
        id: input.id,
        title: note.title,
        body: note.body,
        projectId: input.projectId,
        status: input.status,
        publishedAt: now,
        updatedAt: now,
        schemaVersion: 1,
      },
    },
    { upsert: true },
  );
  return { id: input.id, alreadyExists: !result.upsertedCount };
}
