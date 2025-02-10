import { users, type User, type InsertUser, type Event, type InsertEvent, type Participant } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { randomBytes } from "crypto";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createEvent(event: InsertEvent & { plannerId: number }): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventByInviteCode(code: string): Promise<Event | undefined>;
  getUserEvents(userId: number): Promise<Event[]>;
  
  addParticipant(eventId: number, userId: number, availability: string): Promise<Participant>;
  getEventParticipants(eventId: number): Promise<Participant[]>;
  updateParticipantAvailability(userId: number, eventId: number, availability: string): Promise<void>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private participants: Map<number, Participant>;
  private currentUserId: number;
  private currentEventId: number;
  private currentParticipantId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.participants = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.currentParticipantId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createEvent(event: InsertEvent & { plannerId: number }): Promise<Event> {
    const id = this.currentEventId++;
    const inviteCode = randomBytes(6).toString('hex');
    const newEvent = { ...event, id, inviteCode };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventByInviteCode(code: string): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.inviteCode === code,
    );
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    const participantEventIds = Array.from(this.participants.values())
      .filter(p => p.userId === userId)
      .map(p => p.eventId);
    
    return Array.from(this.events.values()).filter(
      event => event.plannerId === userId || participantEventIds.includes(event.id)
    );
  }

  async addParticipant(eventId: number, userId: number, availability: string): Promise<Participant> {
    const id = this.currentParticipantId++;
    const participant = { id, eventId, userId, availability };
    this.participants.set(id, participant);
    return participant;
  }

  async getEventParticipants(eventId: number): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(
      p => p.eventId === eventId
    );
  }

  async updateParticipantAvailability(userId: number, eventId: number, availability: string): Promise<void> {
    const participant = Array.from(this.participants.values()).find(
      p => p.userId === userId && p.eventId === eventId
    );
    if (participant) {
      participant.availability = availability;
      this.participants.set(participant.id, participant);
    }
  }
}

export const storage = new MemStorage();
