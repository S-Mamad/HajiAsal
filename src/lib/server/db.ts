import { promises as fs } from "fs";
import path from "path";
import { canUseFilesystemPersistence } from "./production";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  if (!canUseFilesystemPersistence()) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  if (!canUseFilesystemPersistence()) {
    return fallback;
  }

  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    await writeJsonFile(filename, fallback);
    return fallback;
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  if (!canUseFilesystemPersistence()) {
    throw new Error(
      "Filesystem persistence is disabled in production. Configure MySQL.",
    );
  }

  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function appendToJsonArray<T>(
  filename: string,
  item: T,
  fallback: T[] = [],
): Promise<T[]> {
  const list = await readJsonFile<T[]>(filename, fallback);
  list.push(item);
  await writeJsonFile(filename, list);
  return list;
}
