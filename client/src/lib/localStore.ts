/**
 * Instrument Panel design system: local-first Steppr storage contracts.
 * Browser storage is the application boundary: no document or session data is sent elsewhere.
 */
export type DocumentKind = "pdf" | "epub" | "txt" | "md" | "unknown";

export type LocalDocument = {
  id: string;
  name: string;
  kind: DocumentKind;
  size: number;
  importedAt: number;
  lastOpenedAt: number;
  progress: number;
  blob: Blob;
};

export type ReadingSession = {
  id: string;
  documentId: string;
  startedAt: number;
  completedAt?: number;
  tokenIndex: number;
  totalTokens: number;
  peakWpm: number;
  wordsRead: number;
};

export type LocalTelemetry = {
  id: "lifetime";
  totalWords: number;
  totalFocusSeconds: number;
  completedSessions: number;
  activeDays: string[];
  recallAccuracy: number;
};

const DATABASE_NAME = "steppr-local-reader";
const DATABASE_VERSION = 1;

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains("documents")) database.createObjectStore("documents", { keyPath: "id" });
    if (!database.objectStoreNames.contains("sessions")) database.createObjectStore("sessions", { keyPath: "id" });
    if (!database.objectStoreNames.contains("telemetry")) database.createObjectStore("telemetry", { keyPath: "id" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transactionResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const classifyDocument = (name: string): DocumentKind => {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || extension === "epub" || extension === "txt" || extension === "md") return extension;
  return "unknown";
};

export async function listLocalDocuments(): Promise<LocalDocument[]> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readonly");
  const records = await transactionResult(transaction.objectStore("documents").getAll());
  database.close();
  return records.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export async function saveLocalDocument(file: File): Promise<LocalDocument> {
  const document: LocalDocument = {
    id: crypto.randomUUID(),
    name: file.name,
    kind: classifyDocument(file.name),
    size: file.size,
    importedAt: Date.now(),
    lastOpenedAt: Date.now(),
    progress: 0,
    blob: file,
  };
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readwrite");
  await transactionResult(transaction.objectStore("documents").put(document));
  database.close();
  return document;
}

export async function updateDocumentProgress(id: string, progress: number): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readwrite");
  const store = transaction.objectStore("documents");
  const document = await transactionResult(store.get(id)) as LocalDocument | undefined;
  if (document) await transactionResult(store.put({ ...document, progress: Math.max(0, Math.min(100, progress)), lastOpenedAt: Date.now() }));
  database.close();
}

export async function deleteLocalDocument(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readwrite");
  await transactionResult(transaction.objectStore("documents").delete(id));
  database.close();
}

export async function saveReadingSession(session: ReadingSession): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("sessions", "readwrite");
  await transactionResult(transaction.objectStore("sessions").put(session));
  database.close();
}

export async function getLocalTelemetry(): Promise<LocalTelemetry> {
  const database = await openDatabase();
  const transaction = database.transaction("telemetry", "readonly");
  const stored = await transactionResult(transaction.objectStore("telemetry").get("lifetime")) as LocalTelemetry | undefined;
  database.close();
  return stored ?? { id: "lifetime", totalWords: 0, totalFocusSeconds: 0, completedSessions: 0, activeDays: [], recallAccuracy: 0 };
}

export async function updateLocalTelemetry(update: Partial<Omit<LocalTelemetry, "id">>): Promise<LocalTelemetry> {
  const current = await getLocalTelemetry();
  const next: LocalTelemetry = { ...current, ...update, id: "lifetime" };
  const database = await openDatabase();
  const transaction = database.transaction("telemetry", "readwrite");
  await transactionResult(transaction.objectStore("telemetry").put(next));
  database.close();
  return next;
}
