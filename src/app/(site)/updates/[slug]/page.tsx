import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPublicUpdate } from "@/server/db/updates";
import styles from "@/app/(site)/updates/page.module.css";

export default async function UpdatePage({params}:{params:Promise<{slug:string}>}) {
  const {slug} = await params;
  const {update,unavailable} = await getPublicUpdate(slug);
  if (unavailable) return <main id="main" className="container"><div className="page-intro"><h1>Update unavailable.</h1><p>Please try again shortly.</p><Link className="text-link" href={`/updates/${slug}`}>Try again</Link></div></main>;
  if (!update) notFound();
  return <main id="main" className="container"><div className="page-intro"><Link className="text-link" href="/updates"><ArrowLeft size={15}/> All updates</Link><p className="eyebrow">{update.status}</p><h1>{update.title}</h1><time className="muted" dateTime={update.publishedAt}>{new Date(update.publishedAt).toLocaleDateString("en",{dateStyle:"long",timeZone:"Asia/Taipei"})}</time></div><article className={styles.body}>{update.body}</article><Link className="text-link" href={`/projects/${update.projectId}`}>View project</Link></main>;
}
