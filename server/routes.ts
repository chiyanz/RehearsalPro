import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertEventSchema, insertParticipantSchema } from "@shared/schema";

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
    const event = await storage.getEvent(parseInt(req.params.id));
    if (!event) return res.sendStatus(404);
    res.json(event);
  });

  app.get("/api/events/invite/:code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const event = await storage.getEventByInviteCode(req.params.code);
    if (!event) return res.sendStatus(404);
    res.json(event);
  });

  app.post("/api/events/:id/participants", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const eventId = parseInt(req.params.id);
    const event = await storage.getEvent(eventId);
    if (!event) return res.sendStatus(404);
    
    const participantData = insertParticipantSchema.parse(req.body);
    const participant = await storage.addParticipant(
      eventId,
      req.user.id,
      participantData.availability
    );
    res.json(participant);
  });

  app.get("/api/events/:id/participants", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const eventId = parseInt(req.params.id);
    const participants = await storage.getEventParticipants(eventId);
    res.json(participants);
  });

  app.put("/api/events/:id/availability", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const eventId = parseInt(req.params.id);
    const { availability } = insertParticipantSchema.parse(req.body);
    
    await storage.updateParticipantAvailability(
      req.user.id,
      eventId,
      availability
    );
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}
