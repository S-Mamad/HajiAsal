import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { CustomerUser, UserAddress } from "@/types/auth";
import { readJsonFile, writeJsonFile } from "./db";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toBool,
  toIso,
  withMysqlTransaction,
} from "./mysql";
import { decodeAddressLabel, encodeAddressLabel } from "@/lib/address-meta";

const PROFILES_FILE = "profiles.json";
const ADDRESSES_FILE = "user-addresses.json";
const WISHLISTS_FILE = "user-wishlists.json";

function mapProfileRow(row: Record<string, unknown>): CustomerUser {
  return {
    id: row.id as string,
    phone: row.phone as string,
    fullName: (row.full_name as string) ?? null,
    email: (row.email as string) ?? null,
    newsletterOptIn: toBool(row.newsletter_opt_in),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapAddressRow(row: Record<string, unknown>): UserAddress {
  const rawLabel = (row.label as string) ?? null;
  const meta = decodeAddressLabel(rawLabel);
  return {
    id: row.id as string,
    userId: row.user_id as string,
    label: meta.displayLabel,
    province: row.province as string,
    city: row.city as string,
    address: row.address as string,
    postalCode: row.postal_code as string,
    isDefault: toBool(row.is_default),
    createdAt: toIso(row.created_at),
    lat: meta.lat ?? null,
    lng: meta.lng ?? null,
    plaque: meta.plaque ?? null,
    unit: meta.unit ?? null,
    receiverName: meta.receiverName ?? null,
    receiverPhone: meta.receiverPhone ?? null,
  };
}

export async function findProfileByPhone(
  phone: string,
): Promise<CustomerUser | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM profiles WHERE phone = ? LIMIT 1",
        [phone],
      );
      if (row) return mapProfileRow(row);
    } catch (error) {
      console.error(
        "[profiles] findProfileByPhone mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const profiles = await readJsonFile<CustomerUser[]>(PROFILES_FILE, []);
  return profiles.find((p) => p.phone === phone) ?? null;
}

export async function findProfileById(
  id: string,
): Promise<CustomerUser | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM profiles WHERE id = ? LIMIT 1",
        [id],
      );
      if (row) return mapProfileRow(row);
    } catch (error) {
      console.error(
        "[profiles] findProfileById mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const profiles = await readJsonFile<CustomerUser[]>(PROFILES_FILE, []);
  return profiles.find((p) => p.id === id) ?? null;
}

export async function createProfile(input: {
  phone: string;
  fullName?: string | null;
  email?: string | null;
  newsletterOptIn?: boolean;
}): Promise<CustomerUser> {
  const now = new Date().toISOString();
  const id = randomUUID();

  const profile: CustomerUser = {
    id,
    phone: input.phone,
    fullName: input.fullName ?? null,
    email: input.email ?? null,
    newsletterOptIn: input.newsletterOptIn ?? false,
    createdAt: now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO profiles (id, phone, full_name, email, newsletter_opt_in, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.id,
          profile.phone,
          profile.fullName,
          profile.email,
          profile.newsletterOptIn,
          profile.createdAt,
          profile.updatedAt,
        ],
      );
      return profile;
    } catch (error) {
      console.error(
        "[profiles] createProfile mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
      // Local/dev: fall through to JSON. Production keeps throwing so ops notice DB outage.
      if (process.env.NODE_ENV === "production") throw error;
    }
  }

  const profiles = await readJsonFile<CustomerUser[]>(PROFILES_FILE, []);
  profiles.push(profile);
  await writeJsonFile(PROFILES_FILE, profiles);
  return profile;
}

export async function findOrCreateProfileByPhone(
  phone: string,
): Promise<CustomerUser> {
  const existing = await findProfileByPhone(phone);
  if (existing) return existing;
  return createProfile({ phone });
}

export async function updateProfile(
  id: string,
  updates: Partial<
    Pick<CustomerUser, "fullName" | "email" | "newsletterOptIn">
  >,
): Promise<CustomerUser | null> {
  const now = new Date().toISOString();

  if (isMysqlConfigured()) {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];
      if (updates.fullName !== undefined) {
        sets.push("full_name = ?");
        params.push(updates.fullName);
      }
      if (updates.email !== undefined) {
        sets.push("email = ?");
        params.push(updates.email);
      }
      if (updates.newsletterOptIn !== undefined) {
        sets.push("newsletter_opt_in = ?");
        params.push(updates.newsletterOptIn);
      }
      sets.push("updated_at = ?");
      params.push(now);
      params.push(id);

      const result = await mysqlExecute(
        `UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      if (result.affectedRows === 0) return null;

      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM profiles WHERE id = ? LIMIT 1",
        [id],
      );
      return row ? mapProfileRow(row) : null;
    } catch (error) {
      console.error(
        "[profiles] updateProfile mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
      if (process.env.NODE_ENV === "production") throw error;
    }
  }

  const profiles = await readJsonFile<CustomerUser[]>(PROFILES_FILE, []);
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  profiles[idx] = {
    ...profiles[idx],
    ...updates,
    updatedAt: now,
  };
  await writeJsonFile(PROFILES_FILE, profiles);
  return profiles[idx];
}

// Addresses
export async function getAddressesByUserId(
  userId: string,
): Promise<UserAddress[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM user_addresses WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
      );
      return rows.map(mapAddressRow);
    } catch (error) {
      console.error(
        "[profiles] getAddressesByUserId mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
      if (process.env.NODE_ENV === "production") throw error;
    }
  }

  const all = await readJsonFile<UserAddress[]>(ADDRESSES_FILE, []);
  return all
    .filter((a) => a.userId === userId)
    .map((a) => {
      const meta = decodeAddressLabel(a.label);
      return {
        ...a,
        label: meta.displayLabel,
        lat: a.lat ?? meta.lat ?? null,
        lng: a.lng ?? meta.lng ?? null,
        plaque: a.plaque ?? meta.plaque ?? null,
        unit: a.unit ?? meta.unit ?? null,
        receiverName: a.receiverName ?? meta.receiverName ?? null,
        receiverPhone: a.receiverPhone ?? meta.receiverPhone ?? null,
      };
    });
}

export async function createAddress(
  userId: string,
  input: Omit<UserAddress, "id" | "userId" | "createdAt">,
): Promise<UserAddress> {
  const storedLabel = encodeAddressLabel({
    displayLabel: input.label,
    lat: input.lat,
    lng: input.lng,
    plaque: input.plaque,
    unit: input.unit,
    receiverName: input.receiverName,
    receiverPhone: input.receiverPhone,
  });

  const address: UserAddress = {
    id: randomUUID(),
    userId,
    ...input,
    label: input.label ?? null,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    if (input.isDefault) {
      await mysqlExecute(
        "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?",
        [userId],
      );
    }
    await mysqlExecute(
      `INSERT INTO user_addresses
        (id, user_id, label, province, city, address, postal_code, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        address.id,
        userId,
        storedLabel,
        input.province,
        input.city,
        input.address,
        input.postalCode,
        input.isDefault ?? false,
        address.createdAt,
      ],
    );
    return address;
  }

  const allJson = await readJsonFile<UserAddress[]>(ADDRESSES_FILE, []);
  if (input.isDefault) {
    for (const a of allJson) {
      if (a.userId === userId) a.isDefault = false;
    }
  }
  allJson.push({ ...address, label: storedLabel });
  await writeJsonFile(ADDRESSES_FILE, allJson);
  return address;
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<boolean> {
  if (isMysqlConfigured()) {
    const existing = await mysqlQueryOne<RowDataPacket>(
      "SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1",
      [addressId, userId],
    );
    if (!existing) return false;

    const result = await mysqlExecute(
      "DELETE FROM user_addresses WHERE id = ? AND user_id = ?",
      [addressId, userId],
    );
    if (result.affectedRows === 0) return false;

    if (toBool(existing.is_default)) {
      const next = await mysqlQueryOne<RowDataPacket>(
        "SELECT id FROM user_addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [userId],
      );
      if (next) {
        await mysqlExecute(
          "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
          [next.id, userId],
        );
      }
    }
    return true;
  }

  const all = await readJsonFile<UserAddress[]>(ADDRESSES_FILE, []);
  const target = all.find((a) => a.id === addressId && a.userId === userId);
  if (!target) return false;

  const next = all.filter((a) => !(a.id === addressId && a.userId === userId));
  if (target.isDefault) {
    const replacement = next.find((a) => a.userId === userId);
    if (replacement) replacement.isDefault = true;
  }
  await writeJsonFile(ADDRESSES_FILE, next);
  return true;
}

export async function setDefaultAddress(
  userId: string,
  addressId: string,
): Promise<UserAddress | null> {
  if (isMysqlConfigured()) {
    const existing = await mysqlQueryOne<RowDataPacket>(
      "SELECT id FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1",
      [addressId, userId],
    );
    if (!existing) return null;

    await withMysqlTransaction(async (conn) => {
      await conn.execute(
        "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?",
        [userId],
      );
      await conn.execute(
        "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
        [addressId, userId],
      );
    });

    const row = await mysqlQueryOne<RowDataPacket>(
      "SELECT * FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1",
      [addressId, userId],
    );
    return row ? mapAddressRow(row) : null;
  }

  const all = await readJsonFile<UserAddress[]>(ADDRESSES_FILE, []);
  const target = all.find((a) => a.id === addressId && a.userId === userId);
  if (!target) return null;

  for (const a of all) {
    if (a.userId === userId) a.isDefault = a.id === addressId;
  }
  await writeJsonFile(ADDRESSES_FILE, all);
  return { ...target, isDefault: true };
}

// Wishlist
export async function getWishlistProductIds(userId: string): Promise<string[]> {
  if (isMysqlConfigured()) {
    const rows = await mysqlQuery<RowDataPacket>(
      "SELECT product_id FROM user_wishlists WHERE user_id = ?",
      [userId],
    );
    return rows.map((r) => r.product_id as string);
  }

  const all = await readJsonFile<
    Array<{ userId: string; productId: string }>
  >(WISHLISTS_FILE, []);
  return all.filter((w) => w.userId === userId).map((w) => w.productId);
}

export async function mergeWishlist(
  userId: string,
  productIds: string[],
): Promise<string[]> {
  const existing = new Set(await getWishlistProductIds(userId));
  for (const id of productIds) existing.add(id);
  const merged = [...existing];

  if (isMysqlConfigured()) {
    for (const productId of productIds) {
      await mysqlExecute(
        `INSERT INTO user_wishlists (user_id, product_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)`,
        [userId, productId],
      );
    }
    return merged;
  }

  const all = await readJsonFile<
    Array<{ userId: string; productId: string }>
  >(WISHLISTS_FILE, []);
  const without = all.filter((w) => w.userId !== userId);
  for (const productId of merged) {
    without.push({ userId, productId });
  }
  await writeJsonFile(WISHLISTS_FILE, without);
  return merged;
}

export async function setWishlist(
  userId: string,
  productIds: string[],
): Promise<void> {
  if (isMysqlConfigured()) {
    await mysqlExecute("DELETE FROM user_wishlists WHERE user_id = ?", [
      userId,
    ]);
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "(?, ?)").join(", ");
      const params = productIds.flatMap((productId) => [userId, productId]);
      await mysqlExecute(
        `INSERT INTO user_wishlists (user_id, product_id) VALUES ${placeholders}`,
        params,
      );
    }
    return;
  }

  const all = await readJsonFile<
    Array<{ userId: string; productId: string }>
  >(WISHLISTS_FILE, []);
  const without = all.filter((w) => w.userId !== userId);
  for (const productId of productIds) {
    without.push({ userId, productId });
  }
  await writeJsonFile(WISHLISTS_FILE, without);
}

export interface ProfileWithStats extends CustomerUser {
  orderCount: number;
  totalSpent: number;
}

export async function getAllProfilesWithStats(): Promise<ProfileWithStats[]> {
  const { getAllOrders } = await import("./orders");
  const orders = await getAllOrders();

  const statsByUser = new Map<string, { orderCount: number; totalSpent: number }>();
  const statsByPhone = new Map<string, { orderCount: number; totalSpent: number }>();

  for (const order of orders) {
    const key = order.userId ?? order.customer.phone;
    const map = order.userId ? statsByUser : statsByPhone;
    const current = map.get(key) ?? { orderCount: 0, totalSpent: 0 };
    current.orderCount += 1;
    current.totalSpent += order.total;
    map.set(key, current);
  }

  let profiles: CustomerUser[] = [];

  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM profiles ORDER BY created_at DESC",
      );
      profiles = rows.map(mapProfileRow);
    } catch (error) {
      console.error(
        "[profiles] getAllProfilesWithStats mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
      profiles = await readJsonFile<CustomerUser[]>(PROFILES_FILE, []);
    }
  } else {
    profiles = await readJsonFile<CustomerUser[]>(PROFILES_FILE, []);
  }

  const seen = new Set<string>();
  const result: ProfileWithStats[] = profiles.map((profile) => {
    seen.add(profile.id);
    const stats =
      statsByUser.get(profile.id) ??
      statsByPhone.get(profile.phone) ?? { orderCount: 0, totalSpent: 0 };
    return { ...profile, ...stats };
  });

  for (const order of orders) {
    if (order.userId && seen.has(order.userId)) continue;
    const phone = order.customer.phone;
    if (profiles.some((p) => p.phone === phone)) continue;
    const stats = statsByPhone.get(phone) ?? { orderCount: 0, totalSpent: 0 };
    result.push({
      id: `guest-${phone}`,
      phone,
      fullName: order.customer.fullName,
      email: null,
      newsletterOptIn: false,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      ...stats,
    });
  }

  return result.sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
}
