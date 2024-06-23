import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { NewEndpointDialog } from "./new-endpoint";
import { validateRequest } from "~/server/auth";
import { trpcServer } from "~/lib/trpc.server";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

export default async function EndpointsTable() {
  const { user } = await validateRequest();
  if (!user) return null;
  const endpoints = await trpcServer.endpoints.getAllEndpoints({
    orgSlug: user.username,
  });
  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="text-xl font-bold">Endpoints</div>
      <Table className="border">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead className="w-[200px]">Routing Strategy</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {endpoints.map((endpoint) => (
            <TableRow key={endpoint.publicId}>
              <TableCell>
                <Link
                  className="underline"
                  href={`/${user.username}/dashboard/messages/${endpoint.publicId}`}
                >
                  {endpoint.name}
                </Link>
              </TableCell>
              <TableCell>{endpoint.slug}</TableCell>
              <TableCell>
                <Badge className="uppercase">{endpoint.routingStrategy}</Badge>
              </TableCell>
              <TableCell>{format(endpoint.createdAt, "HH:mm 'on' do MMM yyy")}</TableCell>
            </TableRow>
          ))}

          <TableRow>
            <TableCell colSpan={4} className="text-center">
              <NewEndpointDialog orgSlug={user.username} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
