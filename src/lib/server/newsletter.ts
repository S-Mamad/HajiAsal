import type { RowDataPacket } from "mysql2/promise";
import { appendToJsonArray, readJsonFile, writeJsonFile } from "./db";
import {
  isDuplicateKeyError,
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  newId,
  toIso,
} from "./mysql";

export interface NewsletterSubscriber {
  email: string;
  subscribedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  source?: string;
  readAt?: string;
  repliedAt?: string;
  adminNote?: string;
}

export async function subscribeNewsletter(email: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        "INSERT INTO newsletter_subscribers (id, email, subscribed_at) VALUES (?, ?, ?)",
        [newId(), email, new Date().toISOString()],
      );
      return true;
    } catch (error) {
      if (isDuplicateKeyError(error)) return false;
      throw error;
    }
  }

  const subscribers = await readJsonFile<NewsletterSubscriber[]>(
    "newsletter.json",
    [],
  );
  if (subscribers.some((s) => s.email === email)) return false;
  await appendToJsonArray("newsletter.json", {
    email,
    subscribedAt: new Date().toISOString(),
  });
  return true;
}

export async function saveContactMessage(
  data: Omit<ContactMessage, "id" | "createdAt"> & { source?: string },
): Promise<ContactMessage> {
  const message: ContactMessage = {
    ...data,
    source: data.source ?? "hajiasal",
    id: `MSG-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO contact_messages (id, name, email, phone, subject, message, created_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.name,
          message.email,
          message.phone,
          message.subject,
          message.message,
          message.createdAt,
          message.source,
        ],
      );
      return message;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  await appendToJsonArray("contact.json", message);
  return message;
}

export async function getAllNewsletterSubscribers(): Promise<
  NewsletterSubscriber[]
> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC",
      );
      return rows.map((r) => ({
        email: String(r.email),
        subscribedAt: toIso(r.subscribed_at),
      }));
    } catch (error) {
      console.error(
        "[newsletter] fetch failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return readJsonFile<NewsletterSubscriber[]>("newsletter.json", []);
}

function mapContactRow(r: Record<string, unknown>): ContactMessage {
  return {
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    phone: r.phone as string,
    subject: r.subject as string,
    message: r.message as string,
    createdAt: r.created_at as string,
    source: (r.source as string) ?? "hajiasal",
    readAt: r.read_at as string | undefined,
    repliedAt: r.replied_at as string | undefined,
    adminNote: r.admin_note as string | undefined,
  };
}

export async function getAllContactMessages(): Promise<ContactMessage[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM contact_messages ORDER BY created_at DESC",
      );
      return rows.map(mapContactRow);
    } catch (error) {
      console.error(
        "[contact] fetch failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return readJsonFile<ContactMessage[]>("contact.json", []);
}

export async function getContactMessagesBySource(
  source: string,
): Promise<ContactMessage[]> {
  const all = await getAllContactMessages();
  return all.filter((m) => (m.source ?? "hajiasal") === source);
}

export async function markContactMessageRead(id: string): Promise<boolean> {
  const now = new Date().toISOString();

  if (isMysqlConfigured()) {
    try {
      const result = await mysqlExecute(
        "UPDATE contact_messages SET read_at = ? WHERE id = ?",
        [now, id],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(
        "[contact] mark read failed:",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  const all = await readJsonFile<ContactMessage[]>("contact.json", []);
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  all[idx].readAt = now;
  await writeJsonFile("contact.json", all);
  return true;
}

export async function updateContactMessageNote(
  id: string,
  adminNote: string,
): Promise<boolean> {
  if (isMysqlConfigured()) {
    try {
      const result = await mysqlExecute(
        "UPDATE contact_messages SET admin_note = ? WHERE id = ?",
        [adminNote, id],
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error(
        "[contact] update note failed:",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  const all = await readJsonFile<ContactMessage[]>("contact.json", []);
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  all[idx].adminNote = adminNote;
  await writeJsonFile("contact.json", all);
  return true;
}
