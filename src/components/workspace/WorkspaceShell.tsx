"use client";
import Link from "@/components/ui/AppLink";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ActionButton } from "@/components/ui/ActionButton";
import { authClient } from "@/features/auth/lib/auth-client";
import {
  LayoutDashboard,
  FolderCode,
  NotebookPen,
  Radio,
  ImagePlus,
  SlidersHorizontal,
  ArrowUpRight,
  LogOut,
  Menu,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adminApi } from "@/store/api";
import { clearUploads } from "@/features/uploads/model/upload-slice";
import { site } from "@/data/site";
import { BrandMark } from "@/components/layout/BrandMark";
import styles from "@/components/workspace/Workspace.module.css";
import { MotionControl } from "@/features/appearance/components/MotionControl";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects & releases", icon: FolderCode },
  { href: "/admin/notes", label: "Private notes", icon: NotebookPen },
  { href: "/admin/updates", label: "Published progress", icon: Radio },
  { href: "/admin/uploads", label: "Media library", icon: ImagePlus },
  { href: "/admin/settings", label: "Manage site", icon: SlidersHorizontal },
  { href: "/admin/account", label: "Profile & security", icon: ShieldCheck },
  { href: "/install", label: "Install app", icon: Smartphone },
];
export function WorkspaceShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const dispatch = useAppDispatch();
  const activeUploads = useAppSelector(
    (state) =>
      state.uploads.filter(
        (u) => u.status === "uploading" || u.status === "verifying",
      ).length,
  );
  const navigation = (
    <nav className={styles.nav} aria-label="Owner navigation">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={path === item.href ? "page" : undefined}
        >
          <item.icon size={17} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
  async function logout() {
    if (signingOut || navigating) return;
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out failed");
      dispatch(adminApi.util.resetApiState());
      dispatch(clearUploads());
      toast.success("Signed out. Your workspace is locked.", { id: "owner-signed-out" });
      startNavigation(() => { router.replace("/admin/login"); router.refresh(); });
    } catch {
      toast.error("Couldn’t sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/admin" className={styles.brand}>
          <BrandMark size={32} />
          {site.name}
          <small>OWNER WORKSPACE</small>
        </Link>
        <div className={styles.topActions}>
          {activeUploads > 0 && (
            <span role="status">{activeUploads} upload in progress</span>
          )}
          <Link
            href="/"
            target="_blank"
            aria-label="View site (opens a new tab)"
          >
            <span>View site</span> <ArrowUpRight size={14} />
          </Link>
          <ActionButton pending={signingOut || navigating} aria-label="Sign out" data-leaves-workspace onClick={logout}>
            <LogOut size={17} />
          </ActionButton>
        </div>
      </header>
      <aside className={styles.sidebar}>
        <p className={styles.welcome}>
          Welcome back,
          <br />
          <strong>{name}</strong>
        </p>
        {navigation}
        <MotionControl />
        <p className={styles.privateNote}>
          Your notes and click counts
          <br />
          stay in this workspace.
        </p>
      </aside>
      <details className={styles.mobileNav}>
        <summary>
          <Menu size={17} /> Workspace navigation
        </summary>
        {navigation}
        <MotionControl />
      </details>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
