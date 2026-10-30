"use client";
import { useState } from "react";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { uploadsApi } from "../api/uploads-api";
import { QueryState } from "@/components/ui/QueryState";
import { MediaEditor } from "./MediaEditor";
import workspace from "@/components/workspace/Workspace.module.css";
import styles from "./MediaLibrary.module.css";
export function MediaLibrary() {
  const [page, setPage] = useState(1);
  const query = uploadsApi.useMediaQuery(page);
  return (
    <section className={workspace.panel}>
      <div className={styles.intro}>
        <h2>Saved images</h2>
        <Link className="text-link" href="/gallery">
          View public gallery →
        </Link>
      </div>
      <p>
        Uploads start private. Add a description, then publish the photos you
        want to share.
      </p>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data?.items.length === 0 && (
        <div className={workspace.empty}>
          <ImagePlus size={28} />
          <p>No images uploaded yet. Your first photo starts above.</p>
        </div>
      )}
      <div className={styles.grid}>
        {query.data?.items.map((media) => (
          <MediaEditor
            media={media}
            key={media.id + ":" + (media.updatedAt || media.createdAt)}
          />
        ))}
      </div>
      <div className={workspace.pagination}>
        <button
          className="button secondary"
          disabled={page === 1 || query.isFetching}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <button
          className="button secondary"
          disabled={!query.data?.nextPage || query.isFetching}
          onClick={() => setPage(query.data!.nextPage!)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
