import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOwner } from "@/server/auth/session";
import { StoreProvider } from "@/store/StoreProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
export const metadata:Metadata={title:"Owner workspace",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}) {
  const owner=await getOwner();
  if (!owner) redirect("/admin/login");
  return <StoreProvider key={owner.ownerId}><WorkspaceShell name={owner.name || "Rowell"}>{children}</WorkspaceShell></StoreProvider>;
}
