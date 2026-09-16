/**
 * Instrument Panel design system: local-first Steppr storage contracts.
 * Document bytes and extracted text remain in the browser's IndexedDB boundary.
 */
import JSZip from "jszip";

export const LOCAL_DATA_CHANGED_EVENT = "steppr:local-data-changed";
export const notifyLocalDataChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT));
};

let pdfWorkerConfigured = false;
const loadPdfParser = async () => {
  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  if (!pdfWorkerConfigured) {
    GlobalWorkerOptions.workerSrc = workerModule.default;
    pdfWorkerConfigured = true;
  }
  return getDocument;
};

export type DocumentKind = "pdf" | "epub" | "txt" | "md" | "unknown";
export type ParseStatus = "ready" | "error";
export type ParseProgress = { phase: "reading" | "parsing" | "saving"; completed: number; total: number };

export type LocalDocument = {
  id: string;
  name: string;
  kind: DocumentKind;
  size: number;
  importedAt: number;
  lastOpenedAt: number;
  progress: number;
  resumeSentenceIndex?: number;
  resumeWordIndex?: number;
  blob: Blob;
  text: string;
  wordCount: number;
  parseStatus: ParseStatus;
  parseMessage?: string;
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

export type DiagnosticResult = {
  id: string;
  tier: string;
  baselineWpm: number;
  actualWpm: number;
  passageWords: number;
  correctAnswers: number;
  totalQuestions: number;
  comprehensionPercent: number;
  startedAt: number;
  completedAt: number;
};

const DATABASE_NAME = "steppr-local-reader";
const DATABASE_VERSION = 2;

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains("documents")) database.createObjectStore("documents", { keyPath: "id" });
    if (!database.objectStoreNames.contains("sessions")) database.createObjectStore("sessions", { keyPath: "id" });
    if (!database.objectStoreNames.contains("telemetry")) database.createObjectStore("telemetry", { keyPath: "id" });
    if (!database.objectStoreNames.contains("diagnostics")) database.createObjectStore("diagnostics", { keyPath: "id" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transactionResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const toPlainText = (value: string) => value
  .replace(/\u00a0/g, " ")
  .replace(/\r\n?/g, "\n")
  .replace(/[\t ]+\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[\t ]{2,}/g, " ")
  .trim();

const countWords = (value: string) => value.match(/[A-Za-z0-9À-ÿ][A-Za-z0-9À-ÿ'’-]*/g)?.length ?? 0;

const resolveZipPath = (basePath: string, href: string) => {
  const prefix = basePath.slice(0, Math.max(0, basePath.lastIndexOf("/") + 1));
  const parts = `${prefix}${href}`.split("/");
  const resolved: string[] = [];
  parts.forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") resolved.pop(); else resolved.push(part);
  });
  return resolved.join("/");
};

const parsePdf = async (file: File, onProgress?: (progress: ParseProgress) => void) => {
  const getDocument = await loadPdfParser();
  const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    onProgress?.({ phase: "parsing", completed: pageNumber, total: pdf.numPages });
  }
  return toPlainText(pages.join("\n\n"));
};

const parseEpub = async (file: File, onProgress?: (progress: ParseProgress) => void) => {
  const archive = await JSZip.loadAsync(file);
  const container = await archive.file("META-INF/container.xml")?.async("text");
  if (!container) throw new Error("The EPUB package is missing its container metadata.");
  const containerXml = new DOMParser().parseFromString(container, "application/xml");
  const packagePath = containerXml.querySelector("rootfile")?.getAttribute("full-path");
  if (!packagePath) throw new Error("The EPUB package does not specify a reading package.");
  const packageMarkup = await archive.file(packagePath)?.async("text");
  if (!packageMarkup) throw new Error("The EPUB reading package could not be opened.");
  const packageXml = new DOMParser().parseFromString(packageMarkup, "application/xml");
  const manifest = new Map(Array.from(packageXml.querySelectorAll("manifest > item")).map((item) => [item.getAttribute("id"), item]));
  const spine = Array.from(packageXml.querySelectorAll("spine > itemref"));
  const chapters: string[] = [];
  for (let chapterIndex = 0; chapterIndex < spine.length; chapterIndex += 1) {
    const entry = spine[chapterIndex];
    const item = manifest.get(entry.getAttribute("idref"));
    const href = item?.getAttribute("href");
    if (!href) { chapters.push(""); continue; }
    const markup = await archive.file(resolveZipPath(packagePath, href))?.async("text");
    chapters.push(markup ? new DOMParser().parseFromString(markup, "text/html").body.textContent ?? "" : "");
    onProgress?.({ phase: "parsing", completed: chapterIndex + 1, total: spine.length });
  }
  return toPlainText(chapters.join("\n\n"));
};

export const classifyDocument = (name: string): DocumentKind => {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || extension === "epub" || extension === "txt" || extension === "md") return extension;
  return "unknown";
};

export async function parseLocalDocument(file: File, onProgress?: (progress: ParseProgress) => void): Promise<{ text: string; wordCount: number }> {
  const kind = classifyDocument(file.name);
  if (kind === "unknown") throw new Error("Choose a TXT, Markdown, PDF, or EPUB file.");
  onProgress?.({ phase: "reading", completed: 0, total: 1 });
  const text = kind === "pdf" ? await parsePdf(file, onProgress) : kind === "epub" ? await parseEpub(file, onProgress) : toPlainText(await file.text());
  onProgress?.({ phase: "parsing", completed: 1, total: 1 });
  if (!text) throw new Error("No readable text was found in this file.");
  return { text, wordCount: countWords(text) };
}

export async function listLocalDocuments(): Promise<LocalDocument[]> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readonly");
  const records = await transactionResult(transaction.objectStore("documents").getAll()) as Partial<LocalDocument>[];
  database.close();
  return records.map((record) => ({
    ...record,
    text: record.text ?? "",
    wordCount: record.wordCount ?? 0,
    parseStatus: record.parseStatus ?? (record.text ? "ready" : "error"),
    parseMessage: record.parseMessage ?? (record.text ? undefined : "This older import needs to be imported again to extract readable text."),
  }) as LocalDocument).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export async function saveLocalDocument(file: File, onProgress?: (progress: ParseProgress) => void): Promise<LocalDocument> {
  const kind = classifyDocument(file.name);
  if (kind === "unknown") throw new Error("Choose a TXT, Markdown, PDF, or EPUB file.");
  const base = { id: crypto.randomUUID(), name: file.name, kind, size: file.size, importedAt: Date.now(), lastOpenedAt: Date.now(), progress: 0, blob: file };
  let document: LocalDocument;
  try {
    const parsed = await parseLocalDocument(file, onProgress);
    document = { ...base, ...parsed, parseStatus: "ready" };
  } catch (error) {
    document = { ...base, text: "", wordCount: 0, parseStatus: "error", parseMessage: error instanceof Error ? error.message : "This document could not be parsed." };
  }
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readwrite");
  await transactionResult(transaction.objectStore("documents").put(document));
  database.close();
  notifyLocalDataChanged();
  return document;
}

export async function getLocalDocument(id: string): Promise<LocalDocument | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readonly");
  const document = await transactionResult(transaction.objectStore("documents").get(id)) as LocalDocument | undefined;
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
  notifyLocalDataChanged();
}

export async function updateDocumentBookmark(id: string, bookmark: { progress: number; sentenceIndex: number; wordIndex: number }): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readwrite");
  const store = transaction.objectStore("documents");
  const document = await transactionResult(store.get(id)) as LocalDocument | undefined;
  if (document) await transactionResult(store.put({ ...document, progress: Math.max(0, Math.min(100, bookmark.progress)), resumeSentenceIndex: Math.max(0, bookmark.sentenceIndex), resumeWordIndex: Math.max(0, bookmark.wordIndex), lastOpenedAt: Date.now() }));
  database.close();
  notifyLocalDataChanged();
}

export async function deleteLocalDocument(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readwrite");
  await transactionResult(transaction.objectStore("documents").delete(id));
  database.close();
  notifyLocalDataChanged();
}

export async function putLocalDocument(document: LocalDocument): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("documents", "readwrite");
  await transactionResult(transaction.objectStore("documents").put(document));
  database.close();
  notifyLocalDataChanged();
}

export async function saveReadingSession(session: ReadingSession): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("sessions", "readwrite");
  await transactionResult(transaction.objectStore("sessions").put(session));
  database.close();
  notifyLocalDataChanged();
}

export async function listReadingSessions(): Promise<ReadingSession[]> {
  const database = await openDatabase();
  const transaction = database.transaction("sessions", "readonly");
  const sessions = await transactionResult(transaction.objectStore("sessions").getAll()) as ReadingSession[];
  database.close();
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

export async function saveDiagnosticResult(result: DiagnosticResult): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("diagnostics", "readwrite");
  await transactionResult(transaction.objectStore("diagnostics").put(result));
  database.close();
  notifyLocalDataChanged();
}

export async function listDiagnosticResults(): Promise<DiagnosticResult[]> {
  const database = await openDatabase();
  const transaction = database.transaction("diagnostics", "readonly");
  const results = await transactionResult(transaction.objectStore("diagnostics").getAll()) as DiagnosticResult[];
  database.close();
  return results.sort((a, b) => b.completedAt - a.completedAt);
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
  notifyLocalDataChanged();
  return next;
}

export async function replaceLocalTelemetry(telemetry: LocalTelemetry): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("telemetry", "readwrite");
  await transactionResult(transaction.objectStore("telemetry").put({ ...telemetry, id: "lifetime" }));
  database.close();
  notifyLocalDataChanged();
}

export async function deleteLocalDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other Steppr tabs before purging local data."));
  });
  notifyLocalDataChanged();
}
