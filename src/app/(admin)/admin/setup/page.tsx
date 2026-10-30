import type { Metadata } from "next";
import Link from "@/components/ui/AppLink";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authOrigin, sessionConfigured } from "@/server/auth/config";
import { getOwner } from "@/server/auth/session";
import { OwnerSetup } from "@/features/auth/components/OwnerSetup";
import { BrandMark } from "@/components/layout/BrandMark";
import styles from "../login/page.module.css";
export const metadata: Metadata = {
  title: "Owner setup",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function SetupPage() {
  if (
    sessionConfigured() &&
    (await headers()).get("host") !== new URL(authOrigin()).host
  )
    redirect(`${authOrigin()}/admin/setup`);
  if (await getOwner()) redirect("/admin");
  return (
    <main id="main" className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand}>
          <BrandMark size={42} />
          Rowell-Mode
        </Link>
        <h1>Make yourself at home.</h1>
        <p>
          Create your private owner account. This requires your private setup
          link.
        </p>
        <OwnerSetup />
        <Link href="/admin/login" className="text-link">
          Already set up? Sign in
        </Link>
      </section>
    </main>
  );
}
