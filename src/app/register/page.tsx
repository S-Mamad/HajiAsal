import { redirect } from "next/navigation";
import { hajiasalPath } from "@/lib/paths";

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const q = new URLSearchParams({ tab: "register" });
  if (params.redirect) q.set("redirect", params.redirect);
  redirect(`${hajiasalPath("/login")}?${q.toString()}`);
}
