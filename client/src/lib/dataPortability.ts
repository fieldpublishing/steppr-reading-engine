/** Local-only privacy utilities: browser storage estimates plus export/import archives with no network transport. */
import type { ReaderPreferences } from "@/hooks/useReaderPreferences";
import { getLocalTelemetry, listDiagnosticResults, listLocalDocuments, listReadingSessions, putLocalDocument, replaceLocalTelemetry, saveDiagnosticResult, saveReadingSession, type DiagnosticResult, type LocalDocument, type LocalTelemetry, type ReadingSession } from "@/lib/localStore";

type ArchivedDocument = Omit<LocalDocument, "blob"> & { blobData?: string };

export type StepprArchive = {
  format: "steppr-local-archive";
  version: 1;
  exportedAt: string;
  preferences: Partial<ReaderPreferences>;
  telemetry: LocalTelemetry;
  sessions: ReadingSession[];
  diagnostics: DiagnosticResult[];
  documents?: ArchivedDocument[];
};

export type StorageSnapshot = {
  browserUsage?: number;
  browserQuota?: number;
  libraryBytes: number;
  metricsBytes: number;
  preferenceBytes: number;
};

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const fromDataUrl = (value?: string) => {
  if (!value) return new Blob([]);
  const [header, payload = ""] = value.split(",", 2);
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
};

export const formatBytes = (value = 0) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(2)} MB`;

export async function getStorageSnapshot(preferences: ReaderPreferences): Promise<StorageSnapshot> {
  const [documents, telemetry, sessions, estimate] = await Promise.all([
    listLocalDocuments(), getLocalTelemetry(), listReadingSessions(), navigator.storage?.estimate?.() ?? Promise.resolve(undefined),
  ]);
  return {
    browserUsage: estimate?.usage,
    browserQuota: estimate?.quota,
    libraryBytes: documents.reduce((total, document) => total + document.size, 0),
    metricsBytes: new Blob([JSON.stringify({ telemetry, sessions })]).size,
    preferenceBytes: new Blob([JSON.stringify(preferences)]).size,
  };
}

export async function createMetricsExport(preferences: ReaderPreferences): Promise<StepprArchive> {
  const [telemetry, sessions, diagnostics] = await Promise.all([getLocalTelemetry(), listReadingSessions(), listDiagnosticResults()]);
  return { format: "steppr-local-archive", version: 1, exportedAt: new Date().toISOString(), preferences, telemetry, sessions, diagnostics };
}

export async function createFullArchive(preferences: ReaderPreferences): Promise<StepprArchive> {
  const [base, documents] = await Promise.all([createMetricsExport(preferences), listLocalDocuments()]);
  const archivedDocuments = await Promise.all(documents.map(async (document) => ({ ...document, blobData: await toDataUrl(document.blob) })));
  return { ...base, documents: archivedDocuments };
}

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readAndMergeArchive(file: File): Promise<{ preferences?: Partial<ReaderPreferences>; importedDocuments: number }> {
  const candidate = JSON.parse(await file.text()) as Partial<StepprArchive>;
  if (candidate.format !== "steppr-local-archive" || candidate.version !== 1) throw new Error("Choose a valid Steppr local archive JSON file.");
  if (candidate.telemetry) await replaceLocalTelemetry({ ...candidate.telemetry, id: "lifetime" });
  await Promise.all((candidate.sessions ?? []).map((session) => saveReadingSession(session)));
  await Promise.all((candidate.diagnostics ?? []).map((result) => saveDiagnosticResult(result)));
  const documents = candidate.documents ?? [];
  await Promise.all(documents.map(async (document) => {
    const restored: LocalDocument = { ...document, blob: fromDataUrl(document.blobData), parseStatus: document.parseStatus ?? "ready", text: document.text ?? "", wordCount: document.wordCount ?? 0 };
    await putLocalDocument(restored);
  }));
  return { preferences: candidate.preferences, importedDocuments: documents.length };
}
