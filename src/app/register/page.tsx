import { redirect } from "next/navigation";
import { hajiasalPath } from "@/lib/paths";

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.redirect) q.set("redirect", params.redirect);
  const qs = q.toString();
  redirect(qs ? `${hajiasalPath("/login")}?${qs}` : hajiasalPath("/login"));
}
