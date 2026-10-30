import { ToastProvider } from "@/components/ui/ToastProvider";
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<ToastProvider /></>;
}
