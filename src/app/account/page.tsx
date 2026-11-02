import { getSession } from "@/lib/auth";
import CustomerAccount from "@/components/customer-account";
import { redirect } from "next/navigation";

export const instant = false;

export default async function AccountPage() {
  const user = await getSession();
  if (!user || user.role === "admin") redirect(user?.role === "admin" ? "/admin" : "/");
  if (user.role === "seller") redirect("/seller");
  return <CustomerAccount name={user.name} email={user.email} />;
}
