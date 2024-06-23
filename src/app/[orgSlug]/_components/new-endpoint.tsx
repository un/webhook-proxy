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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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

const formSchema = z.object({
  name: z
    .string()
    .min(3, "Endpoint name must be more than 3 letters")
    .max(64, "Endpoint name cant be less than 64 letters"),
  slug: z
    .string()
    .min(3, "Endpoint url must be more than 3 letters")
    .max(64, "Endpoint url cant be less than 64 letters"),
  routingStrategy: z.enum(["first", "all"], { message: "Select a valid routing strategy" }),
});

export function NewEndpointDialog({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { mutateAsync: createEndpoint, isPending } = trpc.endpoints.create.useMutation({
    onSuccess: (_, { name }) => {
      toast.success(`Endpoint named ${name} has been created`);
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
      name: "New Endpoint",
      slug: "",
      routingStrategy: "first",
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
          Create New Endpoint
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Endpoint</DialogTitle>
            <DialogDescription>
              A endpoint is a URL which will be used with the Webhooks you want to catch.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createEndpoint({ ...values, orgSlug }).catch(() => null),
              )}
              className="space-y-8"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Endpoint Name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the endpoint, this will be displayed in the table.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Endpoint URL" {...field} />
                    </FormControl>
                    <FormDescription>The URL where the endpoint will be available.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="routingStrategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routing Strategy</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="first">First</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="flex flex-col gap-1">
                      <span>The routing strategy determines how the endpoint will be routed.</span>
                      <span>
                        <span className="font-bold">First:</span> will deliver to the first
                        available destination.
                      </span>
                      <span>
                        <span className="font-bold">All:</span> will deliver to all available
                        destinations.
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating Endpoint..." : "Create Endpoint"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
