import { getSession } from "@/lib/auth";
import AdminConsole from "@/components/admin-console";
import { redirect } from "next/navigation";

export const instant = false;

export default async function AdminPage() {
  const user = await getSession();
  if (user?.role !== "admin") redirect("/");
  return <AdminConsole />;
}
