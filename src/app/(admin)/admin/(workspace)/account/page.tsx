import { AccountSecurity } from "@/features/auth/components/AccountSecurity";
import { getOwner } from "@/server/auth/session";
import { redirect } from "next/navigation";
export default async function AccountPage() {
  const owner = await getOwner();
  if (!owner) redirect("/admin/login");
  return (
    <AccountSecurity
      profile={{ name: owner.name || "", username: owner.username }}
    />
  );
}
