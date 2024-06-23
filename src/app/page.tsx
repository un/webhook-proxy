import { ArrowRight, ArrowUpRight, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { Button } from "~/components/ui/button";
import { validateRequest } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const { user } = await validateRequest();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-fit flex-col items-center justify-center gap-4">
      <h1 className="text-5xl font-bold">UnWebhook</h1>
      <p className="text-lg font-semibold">
        A Webhook Request Catcher/Relayer/Replayer by{" "}
        <a className="underline" href="https://u22n.com">
          u22n
        </a>
      </p>
      <div className="flex flex-col items-center gap-4 rounded border bg-card p-8 shadow-md">
        <Button asChild className="flex w-fit gap-2">
          <a href="/api/login">
            <GithubLogo weight="duotone" size={24} className="fill-card" />
            <span className="text-base">Login with Github</span>
            <ArrowRight size={20} />
          </a>
        </Button>
        <Button asChild className="flex w-fit gap-2" variant="secondary">
          <a href="/github" target="_blank">
            <GithubLogo weight="duotone" size={24} />
            <span className="text-base">Checkout the Project on Github</span>
            <ArrowUpRight size={16} />
          </a>
        </Button>
      </div>
    </div>
  );
}
