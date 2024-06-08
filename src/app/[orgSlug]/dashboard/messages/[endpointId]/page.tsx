import { EndpointMessages } from "./_components/endpoint-messages";
import { EndpointHeader } from "./_components/endpoint-header";
import type { TypeId } from "~/server/utils/typeid";

export default function Page({
  params,
}: {
  params: { endpointId: TypeId<"endpoint">; orgSlug: string };
}) {
  return (
    <div className="flex h-svh flex-col gap-2">
      <EndpointHeader />
      <EndpointMessages />
    </div>
  );
}
