import { UserDropdown } from "./_components/user-dropdown";
import { validateRequest } from "~/server/auth";
import type { PropsWithChildren } from "react";
import { redirect } from "next/navigation";

export default async function Layout({ children }: Readonly<PropsWithChildren>) {
  const { user } = await validateRequest();
  if (!user) redirect("/");

  return (
    <div className="flex h-svh flex-col">
      <div className="flex justify-between px-4 py-2">
        <div className="text-3xl font-bold">UnWebhook</div>
        <UserDropdown username={user.username} />
      </div>
      <main className="h-full">{children}</main>
    </div>
  );
}
