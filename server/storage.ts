import { users, events, participants, type User, type InsertUser, type Event, type InsertEvent, type Participant } from "@shared/schema";
import { db } from "./db";
import { eq, or, and, exists } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";

const PostgresSessionStore = connectPg(session);

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

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: db.$client,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createEvent(event: InsertEvent & { plannerId: number }): Promise<Event> {
    const [newEvent] = await db.insert(events).values({
      ...event,
      inviteCode: this.generateInviteCode(),
    }).returning();
    return newEvent;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventByInviteCode(code: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.inviteCode, code));
    return event;
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    return await db.select()
      .from(events)
      .where(
        or(
          eq(events.plannerId, userId),
          exists(
            db.select()
              .from(participants)
              .where(
                and(
                  eq(participants.userId, userId),
                  eq(participants.eventId, events.id)
                )
              )
          )
        )
      );
  }

  async addParticipant(eventId: number, userId: number, availability: string): Promise<Participant> {
    const [participant] = await db.insert(participants)
      .values({ eventId, userId, availability })
      .returning();
    return participant;
  }

  async getEventParticipants(eventId: number): Promise<Participant[]> {
    return await db.select()
      .from(participants)
      .where(eq(participants.eventId, eventId));
  }

  async updateParticipantAvailability(userId: number, eventId: number, availability: string): Promise<void> {
    await db.update(participants)
      .set({ availability })
      .where(
        and(
          eq(participants.userId, userId),
          eq(participants.eventId, eventId)
        )
      );
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

export const storage = new DatabaseStorage();