import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CalendarRange, Users } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams } from "wouter";
import { Event, Participant } from "@shared/schema";

export default function EventPage() {
  const params = useParams();
  const eventId = params?.id ? parseInt(params.id) : null;
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId, // Only run query if we have a valid ID
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: [`/api/events/${eventId}/participants`],
    enabled: !!eventId, // Only run query if we have a valid ID
  });

  const addAvailabilityMutation = useMutation({
    mutationFn: async (availability: string) => {
      if (!eventId) throw new Error("Invalid event ID");
      const res = await apiRequest("PUT", `/api/events/${eventId}/availability`, {
        availability,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
    },
  });

  if (!eventId) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-destructive">Invalid event ID</h1>
      </div>
    );
  }

  if (eventLoading || participantsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-destructive">Event not found</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">{event.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              {event.plannerId === user?.id
                ? "You are the planner"
                : "You are a participant"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center">
                <CalendarRange className="mr-2 h-4 w-4" />
                <span>Invite Code: {event.inviteCode}</span>
              </div>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                <span>{participants.length} Participants</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between"
                >
                  <span>User {participant.userId}</span>
                  <Button variant="outline" size="sm">
                    View Availability
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}