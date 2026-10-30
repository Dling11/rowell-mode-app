import type { Metadata } from "next";
import Image from "next/image";
import { Smartphone, RefreshCw, LockKeyhole } from "lucide-react";
import { site } from "@/data/site";
import { InstallApp } from "@/features/install/components/InstallApp";
import styles from "@/app/(site)/install/page.module.css";
import { redirect } from "next/navigation";
import { getOwner } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Install the app",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function InstallPage() {
  if (!(await getOwner())) redirect("/admin/login?returnTo=%2Finstall");
  return (
    <main id="main" className="container">
      <div className="page-intro">
        <p className="eyebrow">A PLACE ON YOUR HOME SCREEN</p>
        <h1>Keep it a tap away.</h1>
        <p>
          Install {site.name} on your Android phone. Your private owner
          workspace, in an app window of its own.
        </p>
      </div>
      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="install-title">
          <Image
            className={styles.icon}
            src="/icons/app-192.png"
            alt=""
            width={84}
            height={84}
          />
          <p className="eyebrow">{site.name}</p>
          <h2 id="install-title">Your little corner. To go.</h2>
          <p className={styles.description}>
            Installation is free and requires your owner account.
          </p>
          <InstallApp />
          <ol className={styles.steps}>
            <li>Open this website’s HTTPS address in Chrome on your phone.</li>
            <li>Sign in as the owner, then open Install app.</li>
            <li>Use the install button when it appears, or Chrome’s menu.</li>
            <li>Confirm, then launch the app from your home screen.</li>
          </ol>
          <p className={styles.hint}>
            The address shown on this computer is a local preview. Phone
            installation becomes available after the website has an HTTPS
            address.
          </p>
        </section>
        <aside className={styles.details}>
          <div>
            <Smartphone size={21} />
            <h2>Made for a small screen.</h2>
            <p>
              A home-screen icon and a standalone app window, with the same
              responsive design.
            </p>
          </div>
          <div>
            <RefreshCw size={21} />
            <h2>Always the same project.</h2>
            <p>
              Website updates appear in the app too. Your notes, uploads and
              download controls still need an internet connection.
            </p>
          </div>
          <div>
            <LockKeyhole size={21} />
            <h2>Your workspace stays yours.</h2>
            <p>
              The app opens your private dashboard and requires your owner
              login. Visitors can explore the public website without an account.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
