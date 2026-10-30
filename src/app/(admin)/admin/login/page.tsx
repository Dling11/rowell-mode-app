import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole, ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import {
  authConfigured,
  authOrigin,
  sessionConfigured,
} from "@/server/auth/config";
import { getOwner } from "@/server/auth/session";
import { OwnerSignIn } from "@/features/auth/components/OwnerSignIn";
import { site } from "@/data/site";
import { BrandMark } from "@/components/layout/BrandMark";
import { ownerDestination } from "@/features/auth/model/navigation";
import styles from "@/app/(admin)/admin/login/page.module.css";
export const metadata: Metadata = {
  title: "Owner access",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    expired?: string;
    returnTo?: string;
  }>;
}) {
  const params = await searchParams;
  const destination = ownerDestination(params.returnTo);
  if (
    sessionConfigured() &&
    (await headers()).get("host") !== new URL(authOrigin()).host
  )
    redirect(
      `${authOrigin()}/admin/login${destination === "/admin" ? "" : `?returnTo=${encodeURIComponent(destination)}`}`,
    );
  if (await getOwner()) redirect(destination);
  const configured = authConfigured();
  return (
    <main id="main" className={styles.page}>
      <div className={styles.card}>
        <Link className={styles.brand} href="/">
          <BrandMark size={42} />
          {site.name}
        </Link>
        <div className={styles.lock}>
          <LockKeyhole size={25} strokeWidth={1.4} />
        </div>
        <p className="eyebrow">JUST FOR THE OWNER</p>
        <h1>Back to the workbench.</h1>
        <p>
          Private notes, published progress,
          <br />
          and the controls behind the scenes.
        </p>
        {params.error && (
          <p className="error-text" role="alert">
            Sign-in was not completed. Access is limited to your private owner
            account.
          </p>
        )}
        {params.expired && (
          <p className="notice" role="status">
            Your session ended. Sign in again to continue.
          </p>
        )}
        <OwnerSignIn configured={configured} destination={destination} />
        {!configured && (
          <p className={styles.setup}>
            Owner sign-in needs its private service configuration.
          </p>
        )}
        <Link className="text-link" href="/">
          <ArrowLeft size={14} /> Back to the website
        </Link>
        <span className={styles.foot}>
          Private by default. No visitor account needed.
        </span>
      </div>
    </main>
  );
}
