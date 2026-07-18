import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "crypto";
import {
  asJson,
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  parseJsonField,
  toBool,
  toIso,
  newId,
} from "./mysql";
import { readJsonFile, writeJsonFile } from "./db";
import { canUseFilesystemPersistence } from "./production";

async function fsList<T>(file: string): Promise<T[]> {
  return readJsonFile<T[]>(file, []);
}

async function fsSave<T>(file: string, data: T[]): Promise<void> {
  await writeJsonFile(file, data);
}

// ─── Brands ───────────────────────────────────────────

export interface BrandRecord {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listBrands(): Promise<BrandRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM brands ORDER BY sort_order ASC, name ASC",
      );
      return rows.map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        name: String(r.name),
        logo: r.logo ? String(r.logo) : null,
        description: r.description ? String(r.description) : null,
        sortOrder: Number(r.sort_order ?? 0),
        isActive: toBool(r.is_active),
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList<BrandRecord>("brands.json");
  return [];
}

export async function upsertBrand(
  input: Partial<BrandRecord> & { name: string; slug: string },
): Promise<BrandRecord> {
  const now = new Date().toISOString();
  const record: BrandRecord = {
    id: input.id ?? `brand_${randomUUID().slice(0, 8)}`,
    slug: input.slug,
    name: input.name,
    logo: input.logo ?? null,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO brands (id, slug, name, logo, description, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         slug=VALUES(slug), name=VALUES(name), logo=VALUES(logo),
         description=VALUES(description), sort_order=VALUES(sort_order),
         is_active=VALUES(is_active), updated_at=VALUES(updated_at)`,
      [
        record.id,
        record.slug,
        record.name,
        record.logo,
        record.description,
        record.sortOrder,
        record.isActive ? 1 : 0,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  if (canUseFilesystemPersistence()) {
    const list = await fsList<BrandRecord>("brands.json");
    const idx = list.findIndex((b) => b.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await fsSave("brands.json", list);
  }
  return record;
}

export async function deleteBrand(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    const r = await mysqlExecute("DELETE FROM brands WHERE id = ?", [id]);
    return (r.affectedRows ?? 0) > 0;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<BrandRecord>("brands.json");
    const next = list.filter((b) => b.id !== id);
    await fsSave("brands.json", next);
    return next.length !== list.length;
  }
  return false;
}

// ─── Generic JSON-entity helpers for new modules ──────

export interface ArticleRecord {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  coverImage?: string | null;
  categoryId?: string | null;
  tags?: string[];
  seo?: Record<string, unknown>;
  status: string;
  publishedAt?: string | null;
  authorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listArticles(): Promise<ArticleRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM articles ORDER BY created_at DESC",
      );
      return rows.map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        title: String(r.title),
        excerpt: r.excerpt ? String(r.excerpt) : null,
        body: r.body ? String(r.body) : null,
        coverImage: r.cover_image ? String(r.cover_image) : null,
        categoryId: r.category_id ? String(r.category_id) : null,
        tags: parseJsonField<string[]>(r.tags, []),
        seo: parseJsonField<Record<string, unknown>>(r.seo, {}),
        status: String(r.status ?? "draft"),
        publishedAt: r.published_at ? toIso(r.published_at) : null,
        authorId: r.author_id ? String(r.author_id) : null,
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList("articles.json");
  return [];
}

export async function upsertArticle(
  input: Partial<ArticleRecord> & { title: string; slug: string },
): Promise<ArticleRecord> {
  const now = new Date().toISOString();
  const record: ArticleRecord = {
    id: input.id ?? `art_${randomUUID().slice(0, 8)}`,
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt ?? null,
    body: input.body ?? null,
    coverImage: input.coverImage ?? null,
    categoryId: input.categoryId ?? null,
    tags: input.tags ?? [],
    seo: input.seo ?? {},
    status: input.status ?? "draft",
    publishedAt: input.publishedAt ?? null,
    authorId: input.authorId ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO articles
        (id, slug, title, excerpt, body, cover_image, category_id, tags, seo, status, published_at, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         slug=VALUES(slug), title=VALUES(title), excerpt=VALUES(excerpt), body=VALUES(body),
         cover_image=VALUES(cover_image), category_id=VALUES(category_id), tags=VALUES(tags),
         seo=VALUES(seo), status=VALUES(status), published_at=VALUES(published_at), updated_at=VALUES(updated_at)`,
      [
        record.id,
        record.slug,
        record.title,
        record.excerpt,
        record.body,
        record.coverImage,
        record.categoryId,
        asJson(record.tags),
        asJson(record.seo),
        record.status,
        record.publishedAt,
        record.authorId,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<ArticleRecord>("articles.json");
    const idx = list.findIndex((a) => a.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await fsSave("articles.json", list);
  }
  return record;
}

export async function deleteArticle(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    const r = await mysqlExecute("DELETE FROM articles WHERE id = ?", [id]);
    return (r.affectedRows ?? 0) > 0;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<ArticleRecord>("articles.json");
    const next = list.filter((a) => a.id !== id);
    await fsSave("articles.json", next);
    return next.length !== list.length;
  }
  return false;
}

export interface BannerRecord {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  placement: string;
  sortOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listBanners(): Promise<BannerRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC",
      );
      return rows.map((r) => ({
        id: String(r.id),
        title: String(r.title),
        imageUrl: String(r.image_url),
        linkUrl: r.link_url ? String(r.link_url) : null,
        placement: String(r.placement ?? "home_slider"),
        sortOrder: Number(r.sort_order ?? 0),
        startsAt: r.starts_at ? toIso(r.starts_at) : null,
        endsAt: r.ends_at ? toIso(r.ends_at) : null,
        isActive: toBool(r.is_active),
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList("banners.json");
  return [];
}

export async function upsertBanner(
  input: Partial<BannerRecord> & { title: string; imageUrl: string },
): Promise<BannerRecord> {
  const now = new Date().toISOString();
  const record: BannerRecord = {
    id: input.id ?? `ban_${randomUUID().slice(0, 8)}`,
    title: input.title,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl ?? null,
    placement: input.placement ?? "home_slider",
    sortOrder: input.sortOrder ?? 0,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO banners
        (id, title, image_url, link_url, placement, sort_order, starts_at, ends_at, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title=VALUES(title), image_url=VALUES(image_url), link_url=VALUES(link_url),
         placement=VALUES(placement), sort_order=VALUES(sort_order), starts_at=VALUES(starts_at),
         ends_at=VALUES(ends_at), is_active=VALUES(is_active), updated_at=VALUES(updated_at)`,
      [
        record.id,
        record.title,
        record.imageUrl,
        record.linkUrl,
        record.placement,
        record.sortOrder,
        record.startsAt,
        record.endsAt,
        record.isActive ? 1 : 0,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<BannerRecord>("banners.json");
    const idx = list.findIndex((b) => b.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await fsSave("banners.json", list);
  }
  return record;
}

export async function deleteBanner(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    const r = await mysqlExecute("DELETE FROM banners WHERE id = ?", [id]);
    return (r.affectedRows ?? 0) > 0;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<BannerRecord>("banners.json");
    const next = list.filter((b) => b.id !== id);
    await fsSave("banners.json", next);
    return next.length !== list.length;
  }
  return false;
}

export interface CmsPageRecord {
  id: string;
  slug: string;
  title: string;
  body?: string | null;
  seo?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function listCmsPages(): Promise<CmsPageRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM cms_pages ORDER BY title ASC",
      );
      return rows.map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        title: String(r.title),
        body: r.body ? String(r.body) : null,
        seo: parseJsonField(r.seo, {}),
        status: String(r.status ?? "published"),
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList("cms-pages.json");
  return [];
}

export async function upsertCmsPage(
  input: Partial<CmsPageRecord> & { title: string; slug: string },
): Promise<CmsPageRecord> {
  const now = new Date().toISOString();
  const record: CmsPageRecord = {
    id: input.id ?? `page_${randomUUID().slice(0, 8)}`,
    slug: input.slug,
    title: input.title,
    body: input.body ?? null,
    seo: input.seo ?? {},
    status: input.status ?? "published",
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO cms_pages (id, slug, title, body, seo, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         slug=VALUES(slug), title=VALUES(title), body=VALUES(body),
         seo=VALUES(seo), status=VALUES(status), updated_at=VALUES(updated_at)`,
      [
        record.id,
        record.slug,
        record.title,
        record.body,
        asJson(record.seo),
        record.status,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<CmsPageRecord>("cms-pages.json");
    const idx = list.findIndex((p) => p.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await fsSave("cms-pages.json", list);
  }
  return record;
}

export async function deleteCmsPage(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    const r = await mysqlExecute("DELETE FROM cms_pages WHERE id = ?", [id]);
    return (r.affectedRows ?? 0) > 0;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<CmsPageRecord>("cms-pages.json");
    const next = list.filter((p) => p.id !== id);
    await fsSave("cms-pages.json", next);
    return next.length !== list.length;
  }
  return false;
}

export interface MediaRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  altText?: string | null;
  folder?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
}

export async function listMedia(): Promise<MediaRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM media_assets ORDER BY created_at DESC",
      );
      return rows.map((r) => ({
        id: String(r.id),
        filename: String(r.filename),
        originalName: String(r.original_name),
        mimeType: String(r.mime_type),
        sizeBytes: Number(r.size_bytes ?? 0),
        url: String(r.url),
        altText: r.alt_text ? String(r.alt_text) : null,
        folder: r.folder ? String(r.folder) : null,
        uploadedBy: r.uploaded_by ? String(r.uploaded_by) : null,
        createdAt: toIso(r.created_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList("media-assets.json");
  return [];
}

export async function createMedia(
  input: Omit<MediaRecord, "id" | "createdAt"> & { id?: string },
): Promise<MediaRecord> {
  const record: MediaRecord = {
    id: input.id ?? newId(),
    filename: input.filename,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    url: input.url,
    altText: input.altText ?? null,
    folder: input.folder ?? null,
    uploadedBy: input.uploadedBy ?? null,
    createdAt: new Date().toISOString(),
  };
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO media_assets
        (id, filename, original_name, mime_type, size_bytes, url, alt_text, folder, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.filename,
        record.originalName,
        record.mimeType,
        record.sizeBytes,
        record.url,
        record.altText,
        record.folder,
        record.uploadedBy,
        record.createdAt,
      ],
    );
    return record;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<MediaRecord>("media-assets.json");
    list.unshift(record);
    await fsSave("media-assets.json", list);
  }
  return record;
}

export async function deleteMedia(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    const r = await mysqlExecute("DELETE FROM media_assets WHERE id = ?", [id]);
    return (r.affectedRows ?? 0) > 0;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<MediaRecord>("media-assets.json");
    const next = list.filter((m) => m.id !== id);
    await fsSave("media-assets.json", next);
    return next.length !== list.length;
  }
  return false;
}

export interface QaRecord {
  id: string;
  productId: string;
  userId?: string | null;
  askerName?: string | null;
  question: string;
  answer?: string | null;
  status: string;
  answeredBy?: string | null;
  answeredAt?: string | null;
  createdAt: string;
}

export async function listQuestions(): Promise<QaRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM product_questions ORDER BY created_at DESC",
      );
      return rows.map((r) => ({
        id: String(r.id),
        productId: String(r.product_id),
        userId: r.user_id ? String(r.user_id) : null,
        askerName: r.asker_name ? String(r.asker_name) : null,
        question: String(r.question),
        answer: r.answer ? String(r.answer) : null,
        status: String(r.status ?? "pending"),
        answeredBy: r.answered_by ? String(r.answered_by) : null,
        answeredAt: r.answered_at ? toIso(r.answered_at) : null,
        createdAt: toIso(r.created_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList("product-questions.json");
  return [];
}

export async function updateQuestion(
  id: string,
  patch: Partial<Pick<QaRecord, "answer" | "status" | "answeredBy">>,
): Promise<QaRecord | null> {
  const list = await listQuestions();
  const item = list.find((q) => q.id === id);
  if (!item) return null;
  const next: QaRecord = {
    ...item,
    answer: patch.answer ?? item.answer,
    status: patch.status ?? item.status,
    answeredBy: patch.answeredBy ?? item.answeredBy,
    answeredAt:
      patch.answer || patch.status === "answered"
        ? new Date().toISOString()
        : item.answeredAt,
  };
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `UPDATE product_questions SET answer = ?, status = ?, answered_by = ?, answered_at = ? WHERE id = ?`,
      [next.answer, next.status, next.answeredBy, next.answeredAt, id],
    );
    return next;
  }
  if (canUseFilesystemPersistence()) {
    const all = await fsList<QaRecord>("product-questions.json");
    const idx = all.findIndex((q) => q.id === id);
    if (idx >= 0) {
      all[idx] = next;
      await fsSave("product-questions.json", all);
    }
  }
  return next;
}

export interface TicketRecord {
  id: string;
  subject: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  status: string;
  priority: string;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listTickets(): Promise<TicketRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM support_tickets ORDER BY updated_at DESC",
      );
      return rows.map((r) => ({
        id: String(r.id),
        subject: String(r.subject),
        customerId: r.customer_id ? String(r.customer_id) : null,
        customerName: r.customer_name ? String(r.customer_name) : null,
        customerPhone: r.customer_phone ? String(r.customer_phone) : null,
        status: String(r.status ?? "open"),
        priority: String(r.priority ?? "normal"),
        assignedTo: r.assigned_to ? String(r.assigned_to) : null,
        createdAt: toIso(r.created_at),
        updatedAt: toIso(r.updated_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList("support-tickets.json");
  return [];
}

export async function upsertTicket(
  input: Partial<TicketRecord> & { subject: string },
): Promise<TicketRecord> {
  const now = new Date().toISOString();
  const record: TicketRecord = {
    id: input.id ?? newId(),
    subject: input.subject,
    customerId: input.customerId ?? null,
    customerName: input.customerName ?? null,
    customerPhone: input.customerPhone ?? null,
    status: input.status ?? "open",
    priority: input.priority ?? "normal",
    assignedTo: input.assignedTo ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO support_tickets
        (id, subject, customer_id, customer_name, customer_phone, status, priority, assigned_to, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         subject=VALUES(subject), status=VALUES(status), priority=VALUES(priority),
         assigned_to=VALUES(assigned_to), updated_at=VALUES(updated_at)`,
      [
        record.id,
        record.subject,
        record.customerId,
        record.customerName,
        record.customerPhone,
        record.status,
        record.priority,
        record.assignedTo,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<TicketRecord>("support-tickets.json");
    const idx = list.findIndex((t) => t.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await fsSave("support-tickets.json", list);
  }
  return record;
}

export interface NotificationRecord {
  id: string;
  channel: string;
  title: string;
  body?: string | null;
  targetRole?: string | null;
  targetUserId?: string | null;
  isRead: boolean;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export async function listNotifications(): Promise<NotificationRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200",
      );
      return rows.map((r) => ({
        id: String(r.id),
        channel: String(r.channel ?? "panel"),
        title: String(r.title),
        body: r.body ? String(r.body) : null,
        targetRole: r.target_role ? String(r.target_role) : null,
        targetUserId: r.target_user_id ? String(r.target_user_id) : null,
        isRead: toBool(r.is_read),
        meta: parseJsonField(r.meta, {}),
        createdAt: toIso(r.created_at),
      }));
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) return fsList("notifications.json");
  return [];
}

export async function createNotification(
  input: Omit<NotificationRecord, "id" | "createdAt" | "isRead"> & {
    isRead?: boolean;
  },
): Promise<NotificationRecord> {
  const record: NotificationRecord = {
    id: newId(),
    channel: input.channel,
    title: input.title,
    body: input.body ?? null,
    targetRole: input.targetRole ?? null,
    targetUserId: input.targetUserId ?? null,
    isRead: input.isRead ?? false,
    meta: input.meta ?? {},
    createdAt: new Date().toISOString(),
  };
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO notifications
        (id, channel, title, body, target_role, target_user_id, is_read, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.channel,
        record.title,
        record.body,
        record.targetRole,
        record.targetUserId,
        record.isRead ? 1 : 0,
        asJson(record.meta),
        record.createdAt,
      ],
    );
    return record;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<NotificationRecord>("notifications.json");
    list.unshift(record);
    await fsSave("notifications.json", list);
  }
  return record;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    const r = await mysqlExecute(
      "UPDATE notifications SET is_read = 1 WHERE id = ?",
      [id],
    );
    return (r.affectedRows ?? 0) > 0;
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsList<NotificationRecord>("notifications.json");
    const idx = list.findIndex((n) => n.id === id);
    if (idx < 0) return false;
    list[idx] = { ...list[idx], isRead: true };
    await fsSave("notifications.json", list);
    return true;
  }
  return false;
}

export async function listAuditLogs(limit = 100) {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT ${Math.floor(limit)}`,
      );
      return rows.map((r) => ({
        id: String(r.id),
        action: String(r.action),
        entityType: r.entity_type ? String(r.entity_type) : null,
        entityId: r.entity_id ? String(r.entity_id) : null,
        payload: parseJsonField(r.payload, null),
        adminUserId: r.admin_user_id ? String(r.admin_user_id) : null,
        ipAddress: r.ip_address ? String(r.ip_address) : null,
        createdAt: toIso(r.created_at),
      }));
    } catch {
      return [];
    }
  }
  return [];
}

export async function getDashboardStats() {
  const empty = {
    salesToday: 0,
    salesWeek: 0,
    salesMonth: 0,
    ordersCount: 0,
    customersCount: 0,
    productsCount: 0,
    lowStockCount: 0,
    avgOrderValue: 0,
    totalRevenue: 0,
    recentOrders: [] as unknown[],
    recentCustomers: [] as unknown[],
    recentMessages: [] as unknown[],
    salesChart: [] as { date: string; total: number }[],
    ordersChart: [] as { date: string; count: number }[],
  };

  if (!isMysqlConfigured()) return empty;

  try {
    const orders = await mysqlQuery<RowDataPacket>(
      `SELECT id, total, status, customer, created_at FROM orders ORDER BY created_at DESC LIMIT 500`,
    );
    const now = Date.now();
    const day = 86400000;
    let salesToday = 0;
    let salesWeek = 0;
    let salesMonth = 0;
    let totalRevenue = 0;
    const salesChartMap = new Map<string, number>();
    const ordersChartMap = new Map<string, number>();

    for (const o of orders) {
      const created = new Date(toIso(o.created_at)).getTime();
      const total = Number(o.total ?? 0);
      totalRevenue += total;
      if (now - created <= day) salesToday += total;
      if (now - created <= 7 * day) salesWeek += total;
      if (now - created <= 30 * day) salesMonth += total;
      const key = toIso(o.created_at).slice(0, 10);
      salesChartMap.set(key, (salesChartMap.get(key) ?? 0) + total);
      ordersChartMap.set(key, (ordersChartMap.get(key) ?? 0) + 1);
    }

    const customersCountRow = await mysqlQueryOne<RowDataPacket>(
      "SELECT COUNT(*) AS c FROM profiles",
    );
    const productsCountRow = await mysqlQueryOne<RowDataPacket>(
      "SELECT COUNT(*) AS c FROM products",
    );
    const lowStockRow = await mysqlQueryOne<RowDataPacket>(
      "SELECT COUNT(*) AS c FROM products WHERE stock_qty <= min_stock AND min_stock > 0",
    ).catch(() => ({ c: 0 }));

    const messages = await mysqlQuery<RowDataPacket>(
      "SELECT id, name, email, subject, created_at, status FROM contact_messages ORDER BY created_at DESC LIMIT 5",
    ).catch(() => []);

    const customers = await mysqlQuery<RowDataPacket>(
      "SELECT id, full_name, phone, created_at FROM profiles ORDER BY created_at DESC LIMIT 5",
    ).catch(() => []);

    return {
      salesToday,
      salesWeek,
      salesMonth,
      ordersCount: orders.length,
      customersCount: Number(customersCountRow?.c ?? 0),
      productsCount: Number(productsCountRow?.c ?? 0),
      lowStockCount: Number((lowStockRow as RowDataPacket)?.c ?? 0),
      avgOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0,
      totalRevenue,
      recentOrders: orders.slice(0, 8).map((o) => ({
        id: String(o.id),
        total: Number(o.total ?? 0),
        status: String(o.status),
        customer: parseJsonField(o.customer, {}),
        createdAt: toIso(o.created_at),
      })),
      recentCustomers: customers.map((c) => ({
        id: String(c.id),
        fullName: c.full_name ? String(c.full_name) : null,
        phone: String(c.phone),
        createdAt: toIso(c.created_at),
      })),
      recentMessages: messages.map((m) => ({
        id: String(m.id),
        name: String(m.name),
        email: String(m.email),
        subject: m.subject ? String(m.subject) : "",
        status: m.status ? String(m.status) : "new",
        createdAt: toIso(m.created_at),
      })),
      salesChart: [...salesChartMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, total]) => ({ date, total })),
      ordersChart: [...ordersChartMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, count]) => ({ date, count })),
    };
  } catch {
    return empty;
  }
}
