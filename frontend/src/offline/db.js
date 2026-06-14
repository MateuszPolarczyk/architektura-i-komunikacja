import { openDB } from "idb";

const DB_NAME = "parkingspot";
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {

        if (!db.objectStoreNames.contains("parkings")) {
          db.createObjectStore("parkings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("reservations")) {
          db.createObjectStore("reservations", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "localId", autoIncrement: true });
        }

        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function cachePut(store, items) {
  const db = await getDB();
  const tx = db.transaction(store, "readwrite");
  for (const item of items) await tx.store.put(item);
  await tx.done;
}

export async function cacheGetAll(store) {
  const db = await getDB();
  return db.getAll(store);
}

export async function cacheGet(store, id) {
  const db = await getDB();
  return db.get(store, id);
}

export async function cacheDelete(store, id) {
  const db = await getDB();
  return db.delete(store, id);
}

export async function cacheClear(store) {
  const db = await getDB();
  return db.clear(store);
}

export async function outboxAdd(entry) {
  const db = await getDB();
  const localId = await db.add("outbox", {
    ...entry,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return localId;
}

export async function outboxAll() {
  const db = await getDB();
  return db.getAll("outbox");
}

export async function outboxUpdate(localId, patch) {
  const db = await getDB();
  const existing = await db.get("outbox", localId);
  if (existing) await db.put("outbox", { ...existing, ...patch });
}

export async function outboxRemove(localId) {
  const db = await getDB();
  return db.delete("outbox", localId);
}

export async function outboxPendingCount() {
  const all = await outboxAll();
  return all.filter((e) => e.status !== "failed").length;
}

export async function metaSet(key, value) {
  const db = await getDB();
  return db.put("meta", { key, value });
}

export async function metaGet(key) {
  const db = await getDB();
  const row = await db.get("meta", key);
  return row?.value;
}
