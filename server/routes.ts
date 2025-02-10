import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertEventSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed)) throw new Error("Invalid ID");
    return parsed;
  }),
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const eventData = insertEventSchema.parse(req.body);
    const event = await storage.createEvent({
      ...eventData,
      plannerId: req.user.id,
    });
    res.json(event);
  });

  app.get("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const events = await storage.getUserEvents(req.user.id);
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const event = await storage.getEvent(id);
      if (!event) return res.sendStatus(404);
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid event ID" });
    }
  });

  app.get("/api/events/invite/:code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const event = await storage.getEventByInviteCode(req.params.code);
    if (!event) return res.sendStatus(404);
    res.json(event);
  });

  app.post("/api/events/:id/participants", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const event = await storage.getEvent(id);
      if (!event) return res.sendStatus(404);

      const participantData = insertParticipantSchema.parse(req.body);
      const participant = await storage.addParticipant(
        id,
        req.user.id,
        participantData.availability
      );
      res.json(participant);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.get("/api/events/:id/participants", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const participants = await storage.getEventParticipants(id);
      res.json(participants);
    } catch (error) {
      res.status(400).json({ message: "Invalid event ID" });
    }
  });

  app.put("/api/events/:id/availability", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = idParamSchema.parse({ id: req.params.id });
      const { availability } = insertParticipantSchema.parse(req.body);

      await storage.updateParticipantAvailability(
        req.user.id,
        id,
        availability
      );
      res.sendStatus(200);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}