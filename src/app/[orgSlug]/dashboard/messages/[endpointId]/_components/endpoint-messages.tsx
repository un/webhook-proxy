"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Dialog, DialogTrigger } from "~/components/ui/dialog";
import { ArrowClockwise } from "@phosphor-icons/react";
import { CodeBlock, dracula } from "react-code-blocks";
import { Skeleton } from "~/components/ui/skeleton";
import type { TypeId } from "~/server/utils/typeid";
import { parseAsString, useQueryState } from "nuqs";
import { Button } from "~/components/ui/button";
import { useParams } from "next/navigation";
import { trpc } from "~/lib/trpc";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import { useMemo } from "react";
import { toast } from "sonner";

export function EndpointMessages() {
  const { endpointId, orgSlug } = useParams<{
    endpointId: TypeId<"endpoint">;
    orgSlug: string;
  }>();
  const [selectedMessage, setSelectedMessage] = useQueryState(
    "message",
    parseAsString.withDefault(""),
  );
  const {
    data: messages,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = trpc.messages.getEndpointMessages.useQuery({
    orgSlug,
    publicId: endpointId,
  });

  const selectedMessageObj = useMemo(
    () => messages?.find((m) => m.publicId === selectedMessage) ?? null,
    [messages, selectedMessage],
  );

  const {
    data: messageDeliveries,
    isLoading: isDeliveriesLoading,
    refetch: refetchDeliveries,
  } = trpc.messages.getMessagesDeliveries.useQuery(
    {
      messagePublicId: selectedMessage,
      orgSlug,
    },
    {
      enabled: !!selectedMessage,
    },
  );

  const { mutateAsync: resendMessage, isPending: isResending } =
    trpc.messages.replayMessage.useMutation({
      onSuccess: () => refetchDeliveries(),
      onError: (error) => {
        toast.error(error.message);
      },
    });

  if (!isLoading && !messages) return null;
  if (error && error.data?.code !== "NOT_FOUND")
    return <div className="mx-auto w-full text-center text-lg">{error?.message}</div>;
  return (
    <div className="flex h-full flex-1 flex-col px-2">
      <div className="flex h-full border">
        <div className="w-[25%] border-r p-2">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex w-full items-center justify-between border-b p-1">
                <span className="text-xl font-bold">Messages</span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isRefetching}
                  onClick={() => refetch()}
                >
                  <ArrowClockwise size={20} className={cn(isRefetching && "animate-spin")} />
                </Button>
              </div>
              {messages?.length === 0 ? (
                <div className="flex justify-center text-pretty p-2 text-center font-bold text-muted-foreground">
                  No Messages Yet, Try hitting the endpoint
                </div>
              ) : (
                <ScrollArea>
                  <div className="flex h-full flex-col gap-2 py-2">
                    {messages?.map((message) => (
                      <Button
                        key={message.publicId}
                        className="h-full w-full border p-2"
                        variant={selectedMessage === message.publicId ? "secondary" : "ghost"}
                        onClick={() => setSelectedMessage(message.publicId)}
                      >
                        <div className="flex h-full w-full flex-col gap-2">
                          <div className="w-full truncate p-1 text-left font-mono">
                            <span className="font-bold uppercase text-purple-600">
                              {message.method}{" "}
                            </span>
                            <span className="font-semibold text-orange-600">{message.path}</span>
                          </div>
                          <div className="self-end text-xs font-bold text-muted-foreground">
                            {format(message.createdAt, "do MMM yyyy, HH:mm:ss")}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
        <div className="w-[75%] flex-1 p-2">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !selectedMessageObj ? (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
              Select a message from the messages to view
            </div>
          ) : (
            <div className="flex h-full w-full flex-col">
              <div className="flex h-[70%] w-full flex-1 gap-4 border-b">
                <div className="flex w-[30%] flex-col gap-2 border-r p-2">
                  <span className="text-xl font-semibold">Headers</span>
                  <ScrollArea className="h-full">
                    <div className="flex flex-wrap justify-between gap-1 border-b-2 px-1 py-2">
                      <span className="font-semibold text-muted-foreground">Header </span>
                      <span className="font-semibold text-muted-foreground">Value</span>
                    </div>
                    {Object.entries(selectedMessageObj.headers).map(([key, value]) => (
                      <div
                        key={`${key}-${value}`}
                        className="flex flex-wrap justify-between gap-1 border-b px-1 py-2 font-mono"
                      >
                        <span className="font-semibold text-muted-foreground">{key}: </span>
                        <span className="break-all">{value}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <div className="flex w-[70%] flex-1 flex-col gap-2">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xl font-semibold">Payload</span>
                    <div className="flex gap-1">
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="outline" disabled={isResending}>
                                <ArrowClockwise
                                  size={20}
                                  className={cn(isResending && "animate-spin")}
                                />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Resend this message</TooltipContent>
                        </Tooltip>
                        <DropdownMenuPortal>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={async () => {
                                if (!selectedMessageObj) return;
                                await resendMessage({
                                  orgSlug,
                                  messagePublicId: selectedMessageObj.publicId,
                                });
                              }}
                            >
                              Resend to Destinations
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              Send to a custom url (Soon)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenuPortal>
                      </DropdownMenu>
                    </div>
                  </div>
                  <ScrollArea className="relative h-full w-full font-mono">
                    <CodeBlock
                      text={tryBeautifyMessage(selectedMessageObj.body as string)}
                      language="json"
                      theme={dracula}
                      showLineNumbers
                    />
                  </ScrollArea>
                </div>
              </div>
              <div className="flex h-[30%] w-full flex-col gap-2 px-1">
                <span className="text-xl font-semibold">Deliveries</span>
                <div>
                  {isDeliveriesLoading ? (
                    <div className="h-full w-full p-2">
                      <Skeleton className="h-full w-full" />
                    </div>
                  ) : (
                    <ScrollArea>
                      <div className="flex w-max gap-2">
                        {messageDeliveries?.map((delivery, i) => (
                          <div
                            key={delivery.publicId}
                            className="flex max-w-64 flex-col gap-3 rounded border p-2"
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-muted-foreground">
                                Destination:
                              </span>
                              <span className="truncate">{delivery.destination.name}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-muted-foreground">Status:</span>
                              <span>{delivery.success ? "Delivered" : "Not Delivered"}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-muted-foreground">
                                Status Code:
                              </span>
                              <span>{delivery.response.code}</span>
                            </div>
                            <div className="flex flex-col gap-2">
                              <span className="font-semibold text-muted-foreground">Response:</span>
                              <Button
                                className="justify-start truncate font-mono text-muted-foreground"
                                variant="secondary"
                                disabled={!delivery.response.content}
                                onClick={() => {
                                  navigator.clipboard
                                    .writeText(delivery.response.content)
                                    .then(() => {
                                      toast.success("Copied to clipboard");
                                    })
                                    .catch(() => {
                                      toast.error("Failed to copy to clipboard");
                                    });
                                }}
                              >
                                {delivery.response.content.substring(0, 50) || "<NO RESPONSE>"}
                              </Button>
                            </div>
                            <div className="flex w-full gap-2 text-xs">
                              <span className="font-semibold text-muted-foreground">
                                Delivered At:
                              </span>
                              <span className="text-muted-foreground">
                                {format(delivery.createdAt, "do MMM yyyy, HH:mm:ss")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function tryBeautifyMessage(message: string) {
  try {
    return JSON.stringify(JSON.parse(message), null, 2);
  } catch (e) {
    return message;
  }
}
