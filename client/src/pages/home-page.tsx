import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { insertEventSchema, Event, InsertEvent } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarRange, Loader2, Plus, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { UserMenu } from "@/components/user-menu";

const joinEventSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
});

type JoinEventData = z.infer<typeof joinEventSchema>;

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json() as Promise<Event>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const joinEventMutation = useMutation({
    mutationFn: async (data: JoinEventData) => {
      const res = await apiRequest("GET", `/api/events/invite/${data.inviteCode}`);
      const event = await res.json() as Event;
      await apiRequest("POST", `/api/events/${event.id}/participants`, {
        availability: JSON.stringify([]), // Initially empty availability
      });
      return event;
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setLocation(`/events/${event.id}`);
    },
  });

  const createForm = useForm({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      dateRange: JSON.stringify({
        start: new Date().toISOString(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    },
  });

  const joinForm = useForm({
    resolver: zodResolver(joinEventSchema),
    defaultValues: {
      inviteCode: "",
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user?.username}!</h1>
          <p className="text-muted-foreground">
            Manage your rehearsal events and schedules
          </p>
        </div>

        <div className="flex items-center gap-4">
          <UserMenu />
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Event</DialogTitle>
                </DialogHeader>
                <Form {...joinForm}>
                  <form
                    onSubmit={joinForm.handleSubmit((data) =>
                      joinEventMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={joinForm.control}
                      name="inviteCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter invite code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={joinEventMutation.isPending}
                    >
                      {joinEventMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Join Event
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit((data) =>
                      createEventMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={createForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createEventMutation.isPending}
                    >
                      {createEventMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Event
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`}>
            <Card className="cursor-pointer hover:bg-accent">
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>
                  {event.plannerId === user?.id
                    ? "You are the planner"
                    : "You are a participant"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarRange className="mr-2 h-4 w-4" />
                  <span>Invite Code: {event.inviteCode}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}