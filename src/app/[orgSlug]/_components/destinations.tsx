import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { NewDestinationDialog } from "./new-destination";
import { validateRequest } from "~/server/auth";
import { trpcServer } from "~/lib/trpc.server";
import { format } from "date-fns";

export default async function DestinationsTable() {
  const { user } = await validateRequest();
  if (!user) return null;
  const destinations = await trpcServer.destinations.getAllDestinations({
    orgSlug: user.username,
  });
  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="text-xl font-bold">Destinations</div>
      <Table className="border">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Url</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {destinations.map((destination) => (
            <TableRow key={destination.publicId}>
              <TableCell>{destination.name}</TableCell>
              <TableCell>{destination.url}</TableCell>
              <TableCell>{format(destination.createdAt, "HH:mm 'on' do MMM yyy")}</TableCell>
            </TableRow>
          ))}

          <TableRow>
            <TableCell colSpan={4} className="text-center">
              <NewDestinationDialog orgSlug={user.username} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
