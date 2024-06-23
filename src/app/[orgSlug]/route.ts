import { validateRequest } from "~/server/auth";
import { redirect } from "next/navigation";

export const GET = async () => {
  const { user } = await validateRequest();
  if (!user) return redirect("/");
  return redirect(`/${user.username}/dashboard`);
};
