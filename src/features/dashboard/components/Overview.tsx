"use client";
import Link from "@/components/ui/AppLink";
import { dashboardApi } from "@/features/dashboard/api/dashboard-api";
import { QueryState } from "@/components/ui/QueryState";
import styles from "@/components/workspace/Workspace.module.css";
export function Overview() {
  const query = dashboardApi.useOverviewQuery();
  return (
    <>
      <div className={styles.heading}>
        <p className="eyebrow">YOUR WORKBENCH</p>
        <h1>A little room to build.</h1>
        <p>Keep the private bits private. Share progress when it’s ready.</p>
      </div>
      <QueryState
        loading={query.isLoading} fetching={query.isFetching}
        error={query.error}
        retry={query.refetch}
      />
      <nav
        className={styles.actions}
        aria-label="Quick workspace links"
        style={{ marginBottom: 24 }}
      >
        <Link className="button secondary" href="/admin/notes">
          Write a private note
        </Link>
        <Link className="button secondary" href="/admin/uploads">
          Upload & manage photos
        </Link>
        <Link className="button secondary" href="/admin/projects">
          Edit cards & resource links
        </Link>
      </nav>
      {query.data && (
        <>
          <div className={styles.stats}>
            {[
              ["Private notes", query.data.notes, "Owner only"],
              ["Draft updates", query.data.drafts, "Not published"],
              [
                "Published updates",
                query.data.published,
                "Visible on the website",
              ],
              ["Media uploads", query.data.media, "Authenticated images"],
            ].map(([label, count, hint]) => (
              <div className={styles.stat} key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
                <small>{hint}</small>
              </div>
            ))}
          </div>
          <section className={styles.panel}>
            <h2>Site status</h2>
            <p>
              {query.data.policy.available
                ? `Current mode: ${query.data.policy.mode}`
                : "Policy store unavailable. Downloads are blocked."}
            </p>
            <Link className="text-link" href="/admin/settings">
              Manage site controls →
            </Link>
          </section>
          <section className={styles.panel}>
            <h2>Download link clicks</h2>
            <p>
              Successful redirect requests through this website. These counts
              don’t confirm completed downloads. Automated traffic is filtered
              on a best-effort basis.
            </p>
            {query.data.clicks.length ? (
              <div className={styles.rows}>
                {query.data.clicks.map((click) => (
                  <div className={styles.row} key={click.id}>
                    <span>{click.id.replace(":", " / ")}</span>
                    <strong>{click.count.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 20 }}>
                No download link clicks recorded yet.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
