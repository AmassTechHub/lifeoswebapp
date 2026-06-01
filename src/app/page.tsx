import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/marketing/LandingPage";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
