import type { Metadata } from "next";
import Link from "@/components/ui/AppLink";
import { ArrowRight, NotebookPen } from "lucide-react";
import { getPublicUpdates } from "@/server/db/updates";
import { findProject } from "@/data/projects";
import { getOwner } from "@/server/auth/session";
import { QuickActions } from "@/components/workspace/QuickActions";
import styles from "@/app/(site)/updates/page.module.css";

export const metadata: Metadata = { title: "Updates" };
export default async function UpdatesPage() {
  const [{ updates, unavailable }, owner] = await Promise.all([
    getPublicUpdates(),
    getOwner(),
  ]);
  return (
    <main id="main" className="container">
      <div className="page-intro">
        <p className="eyebrow">FROM THE WORKBENCH</p>
        <h1>Small steps. Shared here.</h1>
        <p>
          Published notes on what’s changing, what’s being tested, and what’s
          ready to try.
        </p>
      </div>
      {owner && <QuickActions kind="note" />}
      {updates.length ? (
        <div className={styles.updates}>
          {updates.map((update) => (
            <article key={update.id}>
              <div>
                <span>
                  {findProject(update.projectId)?.shortName || "From Rowell"}
                </span>
                <time dateTime={update.publishedAt}>
                  {new Date(update.publishedAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "Asia/Taipei",
                  })}
                </time>
              </div>
              <h2>
                <Link href={`/updates/${update.id}`}>{update.title}</Link>
              </h2>
              <p>
                {update.body.slice(0, 200)}
                {update.body.length > 200 ? "…" : ""}
              </p>
              <Link className="text-link" href={`/updates/${update.id}`}>
                Read update <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <NotebookPen size={32} strokeWidth={1.2} />
          <h2>
            {unavailable
              ? "The workbench is taking a moment."
              : "The next note starts here."}
          </h2>
          <p>
            {unavailable
              ? "Updates couldn’t be loaded. Please try again shortly."
              : "No progress notes published yet. In the meantime, explore the projects and their public releases."}
          </p>
          <Link
            className="button secondary"
            href={unavailable ? "/updates" : "/projects"}
          >
            {unavailable ? "Try again" : "Explore the projects"}
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </main>
  );
}
