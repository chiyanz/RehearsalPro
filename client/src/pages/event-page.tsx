import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CalendarRange, Users } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRoute } from "wouter";
import { Event, Participant } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { UserMenu } from "@/components/user-menu";
import { format } from "date-fns";

export default function EventPage() {
  const [, params] = useRoute<{ id: string }>("/events/:id");
  const eventId = params?.id ? parseInt(params.id) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: [`/api/events/${eventId}/participants`],
    enabled: !!eventId && !!event,
  });

  const addAvailabilityMutation = useMutation({
    mutationFn: async (dates: Date[]) => {
      if (!eventId) throw new Error("Invalid event ID");
      const availability = JSON.stringify(dates.map(d => d.toISOString()));
      const res = await apiRequest("PUT", `/api/events/${eventId}/availability`, {
        availability,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Success",
        description: "Your availability has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAvailabilityUpdate = () => {
    addAvailabilityMutation.mutate(selectedDates);
  };

  // Parse the stored JSON string of dates back into Date objects
  const getParticipantAvailability = (participant: Participant): Date[] => {
    try {
      const dates = JSON.parse(participant.availability);
      return dates.map((dateStr: string) => new Date(dateStr));
    } catch {
      return [];
    }
  };

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
        <UserMenu />
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
            <CardTitle>Set Your Availability</CardTitle>
            <CardDescription>Select the dates you're available</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates || [])}
              className="rounded-md border"
            />
            <Button
              onClick={handleAvailabilityUpdate}
              disabled={addAvailabilityMutation.isPending}
              className="w-full"
            >
              {addAvailabilityMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Availability
            </Button>
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
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                >
                  <span>User {participant.userId}</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedParticipant(participant)}
                      >
                        View Availability
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Available Dates</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Calendar
                          mode="multiple"
                          selected={getParticipantAvailability(participant)}
                          className="rounded-md border"
                          disabled
                        />
                        <div className="text-sm text-muted-foreground">
                          {getParticipantAvailability(participant).map((date, index) => (
                            <div key={index}>
                              {format(date, 'MMMM d, yyyy')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}