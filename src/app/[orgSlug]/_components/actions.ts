"use server";

import { lucia, validateRequest } from "~/server/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function logout() {
  const { session } = await validateRequest();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect("/");
}
