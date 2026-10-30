import type { Metadata } from "next";
import { getPublicProjects } from "@/server/db/projects";
import { getSitePolicy } from "@/server/site-policy/service";
import { DownloadsDirectory } from "@/features/downloads/components/DownloadsDirectory";

export const metadata: Metadata = {
  title: "Downloads",
  description: "Public Android and Windows packages, all in one place.",
};
export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; q?: string }>;
}) {
  const params = await searchParams;
  const platform = ["android", "windows"].includes(params.platform || "")
    ? params.platform!
    : "all";
  const query =
    typeof params.q === "string" ? params.q.slice(0, 100).trim() : "";
  const [projects, policy] = await Promise.all([
    getPublicProjects(),
    getSitePolicy(),
  ]);
  return (
    <main id="main" className="container">
      <div className="page-intro">
        <p className="eyebrow">FIND IT. PICK A PLATFORM. MAKE IT YOURS.</p>
        <h1>A home for the downloads.</h1>
        <p>
          Public packages, clear versions, and a little less hunting for the
          right link.
        </p>
      </div>
      <DownloadsDirectory
        projects={projects}
        policy={policy}
        platform={platform}
        query={query}
      />
    </main>
  );
}
