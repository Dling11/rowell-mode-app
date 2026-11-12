import "server-only";
import { z } from "zod";
import { HttpError } from "@/server/http";
import { repositoryUrlSchema, upstreamSchema } from "@/features/research/model/schema";

async function github(path: string) {
  const response = await fetch(`https://api.github.com/repos/${path}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Rowell-Mode-private-research" },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(503, "GitHub could not be checked. Your saved notes are unchanged. Try again later.");
  if (Number(response.headers.get("content-length") || 0) > 1024 * 1024) throw new HttpError(503, "GitHub returned too much data.");
  return response.json();
}
export async function checkResearchUpstream(repositoryUrl: string) {
  const repository = repositoryUrlSchema.parse(repositoryUrl).slice("https://github.com/".length);
  const repo = z.object({ default_branch: z.string().max(250), pushed_at: z.string().datetime().nullable(), archived: z.boolean(), private: z.literal(false) }).parse(await github(repository));
  const [commit, releases] = await Promise.all([
    github(`${repository}/commits/${encodeURIComponent(repo.default_branch)}`),
    github(`${repository}/releases?per_page=1`),
  ]);
  const head = z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/) }).parse(commit);
  const latest = z.array(z.object({ tag_name: z.string().max(250), published_at: z.string().datetime().nullable(), prerelease: z.boolean(), draft: z.boolean() })).parse(releases).find((release) => !release.draft);
  return upstreamSchema.parse({ checkedAt: new Date().toISOString(), defaultBranch: repo.default_branch, latestCommit: head.sha, pushedAt: repo.pushed_at, archived: repo.archived, release: latest ? { tag: latest.tag_name, publishedAt: latest.published_at, prerelease: latest.prerelease } : null });
}
