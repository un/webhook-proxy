"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { trpc } from "~/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const LOCALHOST_REGEX =
  /^https?:\/\/(localhost|0|10|127|192(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1?\])/i;

const formSchema = z.object({
  name: z
    .string()
    .min(3, "Destination name must be more than 3 letters")
    .max(64, "Destination name cant be less than 64 letters"),
  url: z
    .string()
    .url("Destination url must be a valid URL")
    .max(1024, "Destination url cant be less than 1024 letters")
    .refine(
      (url) => !LOCALHOST_REGEX.test(url),
      `Destination Url can't be a local url as the relay calls are done on server. You can use a service like cloudflare/ngrok to tunnel your localhost to a public url`,
    ),
});

export function NewDestinationDialog({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { mutateAsync: createDestination, isPending } = trpc.destinations.create.useMutation({
    onSuccess: (_, { name }) => {
      toast.success(`Destination named ${name} has been created`);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Something Went Wrong", { description: error.message });
    },
    onSettled: () => setOpen(false),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "New Destination",
      url: "",
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        open && form.reset();
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus size={16} />
          Create New Destination
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Destination</DialogTitle>
            <DialogDescription>
              A destination is a URL where the events would be forwarded to.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createDestination({ ...values, orgSlug }).catch(() => null),
              )}
              className="space-y-8"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Destination Name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the destination, this will be displayed in the table.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Destination URL" {...field} />
                    </FormControl>
                    <FormDescription>The URL where the message will be relayed to.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating Destination..." : "Create Destination"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
