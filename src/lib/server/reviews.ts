import type { RowDataPacket } from "mysql2/promise";
import reviewsData from "@/data/reviews.json";
import { GENERAL_REVIEW_PRODUCT_ID } from "@/lib/review-constants";
import { readJsonFile, writeJsonFile } from "./db";
import {
  memoryGetReviews,
  memoryPushReview,
  memorySetReviews,
  memoryUpdateReview,
} from "./memory-store";
import { canUseFilesystemPersistence } from "./production";
import { isMysqlConfigured, mysqlExecute, mysqlQuery, mysqlQueryOne, newId, toBool } from "./mysql";
import { getProductById } from "@/lib/products";

export { GENERAL_REVIEW_PRODUCT_ID } from "@/lib/review-constants";

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  adminReply?: string | null;
}

const staticReviews = reviewsData as Review[];
const DYNAMIC_REVIEWS_FILE = "reviews-submissions.json";

function mapReviewRow(row: Record<string, unknown>): Review {
  const rawCreatedAt = row.created_at ?? row.date;
  const createdAt =
    rawCreatedAt instanceof Date
      ? rawCreatedAt.toISOString()
      : String(rawCreatedAt ?? "");
  const verified =
    row.verified != null
      ? toBool(row.verified)
      : row.approved != null
        ? toBool(row.approved)
        : false;
  return {
    id: String(row.id),
    productId: (row.product_id as string) ?? (row.productId as string) ?? GENERAL_REVIEW_PRODUCT_ID,
    author: String(row.author ?? "").trim(),
    rating: Number(row.rating ?? 0),
    comment: String(row.comment ?? "").trim(),
    date: createdAt.includes("T") ? createdAt.split("T")[0]! : createdAt || new Date().toISOString().slice(0, 10),
    verified,
    adminReply: row.admin_reply != null ? String(row.admin_reply).trim() || null : null,
  };
}

function sanitizeText(value: string, max: number): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function getDynamicReviews(): Promise<Review[]> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<Review[]>(DYNAMIC_REVIEWS_FILE, []);
  }
  return memoryGetReviews<Review>();
}

async function saveDynamicReviews(reviews: Review[]): Promise<void> {
  if (canUseFilesystemPersistence()) {
    await writeJsonFile(DYNAMIC_REVIEWS_FILE, reviews);
    return;
  }
  memorySetReviews(reviews);
}

export function getAllStaticReviews(): Review[] {
  return staticReviews;
}

export async function getAllReviews(): Promise<Review[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM product_reviews ORDER BY created_at DESC",
      );
      const dynamic = rows.map(mapReviewRow);
      const byId = new Map<string, Review>();
      for (const r of staticReviews) byId.set(r.id, r);
      for (const r of dynamic) byId.set(r.id, r);
      return [...byId.values()].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } catch (error) {
      console.error(
        "[reviews] fetch failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const dynamic = await getDynamicReviews();
  const byId = new Map<string, Review>();
  for (const r of staticReviews) byId.set(r.id, r);
  for (const r of dynamic) byId.set(r.id, r);
  return [...byId.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getReviewsByProduct(productId: string): Promise<Review[]> {
  const all = await getAllReviews();
  return all
    .filter((r) => r.productId === productId && r.verified)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getFeaturedReviews(limit = 6): Review[] {
  return staticReviews.filter((r) => r.verified && r.rating >= 4).slice(0, limit);
}

export async function getFeaturedReviewsAsync(limit = 8): Promise<Review[]> {
  const all = await getAllReviews();
  return all
    .filter((r) => r.verified && r.rating >= 4)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export async function getVerifiedReviews(): Promise<Review[]> {
  const all = await getAllReviews();
  return all
    .filter((r) => r.verified && r.comment.length > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createReview(input: {
  productId?: string;
  author: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const author = sanitizeText(input.author, 60);
  const comment = sanitizeText(input.comment, 500);
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  let productId = (input.productId ?? GENERAL_REVIEW_PRODUCT_ID).trim();

  if (productId !== GENERAL_REVIEW_PRODUCT_ID && !getProductById(productId)) {
    productId = GENERAL_REVIEW_PRODUCT_ID;
  }

  if (author.length < 2) throw new Error("نام نامعتبر است");
  if (comment.length < 10) throw new Error("متن نظر کوتاه است");

  if (isMysqlConfigured()) {
    const id = newId();
    try {
      await mysqlExecute(
        "INSERT INTO product_reviews (id, product_id, author, rating, comment, verified) VALUES (?, ?, ?, ?, ?, ?)",
        [id, productId, author, rating, comment, false],
      );
      const saved = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM product_reviews WHERE id = ? LIMIT 1",
        [id],
      );
      if (saved) return mapReviewRow(saved);
      throw new Error("ثبت نظر ناموفق بود");
    } catch (error) {
      throw error instanceof Error ? error : new Error("ثبت نظر ناموفق بود");
    }
  }

  const review: Review = {
    id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    productId,
    author,
    rating,
    comment,
    date: new Date().toISOString().slice(0, 10),
    verified: false,
  };

  if (canUseFilesystemPersistence()) {
    const dynamic = await getDynamicReviews();
    dynamic.unshift(review);
    await saveDynamicReviews(dynamic);
  } else {
    memoryPushReview(review);
  }

  return review;
}

export async function moderateReview(
  id: string,
  input: { approved?: boolean; adminReply?: string },
): Promise<Review | null> {
  if (isMysqlConfigured()) {
    try {
      const setParts: string[] = [];
      const params: unknown[] = [];
      if (input.approved !== undefined) {
        setParts.push("verified = ?");
        params.push(input.approved);
      }
      if (input.adminReply !== undefined) {
        setParts.push("admin_reply = ?");
        params.push(input.adminReply);
      }

      let updated: RowDataPacket | null = null;
      if (setParts.length > 0) {
        const result = await mysqlExecute(
          `UPDATE product_reviews SET ${setParts.join(", ")} WHERE id = ?`,
          [...params, id],
        );
        if (result.affectedRows > 0) {
          updated = await mysqlQueryOne<RowDataPacket>(
            "SELECT * FROM product_reviews WHERE id = ? LIMIT 1",
            [id],
          );
        }
      } else {
        updated = await mysqlQueryOne<RowDataPacket>(
          "SELECT * FROM product_reviews WHERE id = ? LIMIT 1",
          [id],
        );
      }
      if (updated) return mapReviewRow(updated);

      // Copy-on-write: static seed review moderated into DB
      const seed = staticReviews.find((r) => r.id === id);
      if (seed) {
        await mysqlExecute(
          `INSERT INTO product_reviews (id, product_id, author, rating, comment, verified, admin_reply, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE verified = VALUES(verified), admin_reply = VALUES(admin_reply)`,
          [
            seed.id,
            seed.productId,
            seed.author,
            seed.rating,
            seed.comment,
            input.approved ?? seed.verified,
            input.adminReply ?? null,
            `${seed.date}T00:00:00.000Z`,
          ],
        );
        const inserted = await mysqlQueryOne<RowDataPacket>(
          "SELECT * FROM product_reviews WHERE id = ? LIMIT 1",
          [seed.id],
        );
        if (inserted) return mapReviewRow(inserted);
      }
      return null;
    } catch (error) {
      console.error(
        "[reviews] moderate failed:",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  const dynamic = await getDynamicReviews();
  const idx = dynamic.findIndex((r) => r.id === id);
  if (idx !== -1) {
    if (input.approved !== undefined) {
      dynamic[idx]!.verified = input.approved;
    }
    await saveDynamicReviews(dynamic);
    return dynamic[idx]!;
  }

  // Copy-on-write for static seed reviews without Supabase
  const seed = staticReviews.find((r) => r.id === id);
  if (!seed) {
    if (input.approved === undefined) return null;
    return memoryUpdateReview<Review>(id, { verified: input.approved });
  }

  const copied: Review = {
    ...seed,
    verified: input.approved ?? seed.verified,
  };
  dynamic.unshift(copied);
  await saveDynamicReviews(dynamic);
  return copied;
}
