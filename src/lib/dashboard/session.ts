import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieNames } from "./config";
import { sessionFromToken } from "./tokens";

export async function getSession(): Promise<{ email: string } | null> {
  const jar = await cookies();
  return sessionFromToken(jar.get(cookieNames().session)?.value);
}

/** Every dashboard page and API calls this itself; the proxy is a convenience, never the only gate. */
export async function requireSession(): Promise<{ email: string }> {
  const s = await getSession();
  if (!s) redirect("/dashboard/login");
  return s;
}
