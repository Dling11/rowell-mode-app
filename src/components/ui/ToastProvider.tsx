"use client";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { consumeOwnerNotice } from "@/features/auth/lib/owner-notice";
import { Spinner } from "./Spinner";
import styles from "./Toast.module.css";
export function ToastProvider() {
  useEffect(() => {
    const notice = consumeOwnerNotice();
    if (notice === "signed-in") toast.success("Signed in. Welcome back, Rowell.", { id: "owner-signed-in" });
    else if (notice === "signed-out") toast.success("Signed out. Your workspace is locked.", { id: "owner-signed-out" });
  }, []);
  return <Toaster theme="dark" position="bottom-right" closeButton duration={6000} visibleToasts={3} containerAriaLabel="Action notifications" mobileOffset={{ bottom: 18, left: 16, right: 16 }} style={{ zIndex: 2000 }} icons={{ loading: <Spinner /> }} toastOptions={{classNames:{toast:styles.toast,success:styles.success,error:styles.error,loading:styles.loading},style:{background:"var(--surface)",border:"1px solid var(--border)",color:"var(--text)"}}}/>;
}
