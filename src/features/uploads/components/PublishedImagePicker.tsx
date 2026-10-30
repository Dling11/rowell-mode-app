"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { uploadsApi } from "../api/uploads-api";
import { QueryState } from "@/components/ui/QueryState";
import styles from "./MediaLibrary.module.css";
import workspace from "@/components/workspace/Workspace.module.css";

export function PublishedImagePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [page, setPage] = useState(1);
  const query = uploadsApi.useMediaQuery(page);
  const photos = query.data?.items.filter((media) => media.publishedAt) || [];
  return (
    <fieldset className={styles.chooser}>
      <legend>Project card & spotlight image</legend>
      <p>
        Choose a published photo, or keep the original artwork.{" "}
        <Link href="/admin/uploads" className="text-link">
          Upload & publish images →
        </Link>
      </p>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      <div className={styles.choices}>
        <button
          type="button"
          className={styles.choice}
          aria-pressed={!value}
          onClick={() => onChange(null)}
        >
          <span>Original artwork</span>
        </button>
        {value && !photos.some((photo) => photo.id === value) && (
          <button type="button" className={styles.choice} aria-pressed="true">
            <Image
              src={`/media/${value}`}
              alt="Current card image"
              fill
              unoptimized
            />
            <span>Current image</span>
          </button>
        )}
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            aria-pressed={value === photo.id}
            aria-label={`Use ${photo.alt || photo.name}`}
            className={styles.choice}
            onClick={() => onChange(photo.id)}
          >
            <Image
              src={`/media/${photo.id}`}
              alt=""
              fill
              unoptimized
              sizes="200px"
            />
            <span>{photo.alt || photo.name}</span>
          </button>
        ))}
      </div>
      {!photos.length && !query.isLoading && (
        <p>No published photos on this page.</p>
      )}
      <div className={workspace.pagination}>
        <button
          type="button"
          className="button secondary"
          disabled={page === 1 || query.isFetching}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous images
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!query.data?.nextPage || query.isFetching}
          onClick={() => setPage(query.data!.nextPage!)}
        >
          Next images
        </button>
      </div>
    </fieldset>
  );
}
