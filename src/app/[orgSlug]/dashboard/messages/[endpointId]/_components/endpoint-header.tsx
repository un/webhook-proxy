"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ArrowLeft, Plus } from "@phosphor-icons/react";
import { Skeleton } from "~/components/ui/skeleton";
import type { TypeId } from "~/server/utils/typeid";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { trpc } from "~/lib/trpc";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { env } from "~/env";

export function EndpointHeader() {
  const { endpointId, orgSlug } = useParams<{
    endpointId: TypeId<"endpoint">;
    orgSlug: string;
  }>();
  const utils = trpc.useUtils();
  const {
    data: endpoint,
    isLoading,
    error,
  } = trpc.endpoints.getEndpoint.useQuery({
    orgSlug,
    publicId: endpointId,
  });

  const { mutateAsync: changeStrategy, isPending } = trpc.endpoints.setEndpointStrategy.useMutation(
    {
      onSuccess: () => {
        utils.endpoints.getEndpoint.setData({ orgSlug, publicId: endpointId }, (updater) => {
          if (!updater) return;
          return {
            ...updater,
            routingStrategy: endpoint?.routingStrategy === "first" ? "all" : "first",
          };
        });
      },
      onError: (err) => {
        toast.error("Failed to change routing strategy", {
          description: err.message,
        });
      },
    },
  );

  const { mutateAsync: removeEndpoint, isPending: isRemovingEndpoint } =
    trpc.endpoints.removeEndpointDestination.useMutation({
      onSuccess: (_, { destinationPublicId }) => {
        utils.endpoints.getEndpoint.setData({ orgSlug, publicId: endpointId }, (updater) => {
          if (!updater) return;
          return {
            ...updater,
            destinations: updater.destinations.filter(
              (d) => d.destination.publicId !== destinationPublicId,
            ),
          };
        });
      },
      onError: (err) => {
        toast.error("Failed to remove destination", {
          description: err.message,
        });
      },
    });

  if ((!isLoading && !endpoint) || error)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="text-2xl font-bold">Error</div>
        <div className="text-lg">{error?.message ?? "Endpoint not found"}</div>
      </div>
    );

  return (
    <div className="flex flex-col px-2">
      <div className="flex flex-wrap items-center justify-between rounded border p-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost">
            <Link href="../">
              <ArrowLeft size={24} />
            </Link>
          </Button>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-xl font-bold">{endpoint?.name}</div>
              <div className="flex select-all rounded bg-card p-2 font-mono text-card-foreground">{`https://${env.NEXT_PUBLIC_PRIMARY_DOMAIN}/${orgSlug}/endpoint/${endpoint?.slug}`}</div>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <Label>Routing Strategy</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-28" />
            ) : (
              <Select
                value={endpoint?.routingStrategy}
                disabled={isPending}
                onValueChange={() =>
                  changeStrategy({
                    orgSlug,
                    publicId: endpointId,
                    strategy: endpoint?.routingStrategy === "first" ? "all" : "first",
                  }).catch(() => true)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex max-w-96 flex-col gap-1">
            <Label>Destinations</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <div className="flex flex-wrap gap-1">
                {endpoint?.destinations
                  .sort((a, b) => a.order - b.order)
                  .map((destination) => (
                    <Badge
                      key={destination.destination.publicId}
                      className={cn(
                        (!destination.enabled || isRemovingEndpoint) &&
                          "cursor-not-allowed opacity-50",
                        "flex gap-2",
                      )}
                    >
                      {destination.destination.name}
                      <button
                        className="rounded-full"
                        onClick={async () => {
                          if (isRemovingEndpoint) return;
                          await removeEndpoint({
                            orgSlug,
                            publicId: endpointId,
                            destinationPublicId: destination.destination.publicId,
                          });
                        }}
                      >
                        <Plus className="rotate-45" size={14} />
                      </button>
                    </Badge>
                  ))}
                <AddDestinationDialog
                  orgSlug={orgSlug}
                  publicId={endpointId}
                  alreadyAdded={endpoint?.destinations.map((d) => d.destination.publicId) ?? []}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDestinationDialog({
  orgSlug,
  alreadyAdded,
  publicId,
}: {
  orgSlug: string;
  alreadyAdded: string[];
  publicId: TypeId<"endpoint">;
}) {
  const {
    data: destinations,
    isLoading,
    error,
  } = trpc.destinations.getAllDestinations.useQuery({
    orgSlug,
  });
  const filteredDestinations = useMemo(
    () => destinations?.filter((endpoint) => !alreadyAdded.includes(endpoint.publicId)) ?? [],
    [destinations, alreadyAdded],
  );

  const utils = trpc.useUtils();

  const { mutateAsync: addDestination, isPending } =
    trpc.endpoints.addEndpointDestination.useMutation({
      onSuccess: (_, { destinationPublicId, publicId }) => {
        utils.endpoints.getEndpoint.setData({ orgSlug, publicId }, (updater) => {
          if (!updater || !destinations) return;
          return {
            ...updater,
            destinations: [
              ...updater.destinations,
              {
                destination: destinations.find((d) => d.publicId === destinationPublicId)!,
                order: updater.destinations.length,
                enabled: true,
              },
            ],
          };
        });
      },
      onError: (err) => {
        toast.error("Failed to add destination", {
          description: err.message,
        });
      },
      onSettled: () => setOpen(false),
    });

  const [open, setOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (isPending) return;
        if (open) setSelectedEndpoint("");
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Plus size={24} />
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Destination</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : error ? (
            <div className="flex flex-col">
              <span>Something Went Wrong</span>
              <span>{error.message}</span>
            </div>
          ) : filteredDestinations.length === 0 ? (
            <span>No more endpoints available</span>
          ) : (
            <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
              <SelectTrigger>
                <SelectValue placeholder="Select Destination" />
              </SelectTrigger>
              <SelectContent>
                {filteredDestinations.map((endpoint) => (
                  <SelectItem key={endpoint.publicId} value={endpoint.publicId}>
                    {endpoint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={async () => {
              if (!selectedEndpoint) return;
              await addDestination({ orgSlug, destinationPublicId: selectedEndpoint, publicId });
            }}
            disabled={isPending || !selectedEndpoint}
          >
            {isPending ? "Adding Destination..." : "Add Destination"}
          </Button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
