/** Instrument Panel design system: browser-resident BYOB document library backed by IndexedDB. */
import { useEffect, useRef, useState } from "react";
import { AlertCircle, BookOpen, FilePlus2, FileText, Grid2X2, List, LoaderCircle, MoreHorizontal, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Link } from "wouter";
import AppFrame from "@/components/AppFrame";
import { deleteLocalDocument, listLocalDocuments, saveLocalDocument, type LocalDocument } from "@/lib/localStore";

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function Library() {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isLoading, setLoading] = useState(true);
  const [isImporting, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = async () => { setLoading(true); try { setDocuments(await listLocalDocuments()); } catch { setNotice("This browser blocked local document storage. Try a standard browser profile."); } finally { setLoading(false); } };
  useEffect(() => { refresh(); }, []);
  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    try {
      const imported = await Promise.all(Array.from(files).map((file) => saveLocalDocument(file)));
      const failures = imported.filter((document) => document.parseStatus === "error");
      setNotice(failures.length ? `${imported.length - failures.length} imported. ${failures.length} saved but needs a more readable file.` : `${imported.length} document${imported.length > 1 ? "s" : ""} parsed and saved locally.`);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The selected files could not be imported.");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const removeDocument = async (id: string) => { await deleteLocalDocument(id); setNotice("Document removed from this browser."); await refresh(); };
  return <AppFrame title="Library — device-local documents"><section className="page-heading library-heading"><div><span className="eyebrow">BYOB LIBRARY</span><h1>Your documents stay on this device.</h1><p>Import files directly into browser storage. No uploads, accounts, or cloud sync.</p></div><div className="library-heading__actions"><div className="view-toggle"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={17} /></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List size={17} /></button></div><button className="primary-cta" disabled={isImporting} onClick={() => fileInput.current?.click()}>{isImporting ? <LoaderCircle className="animate-spin" size={17} /> : <Upload size={17} />} {isImporting ? "Parsing locally" : "Import files"}</button><input ref={fileInput} className="visually-hidden" type="file" multiple accept=".pdf,.epub,.txt,.md,text/plain,text/markdown,application/pdf,application/epub+zip" onChange={(event) => importFiles(event.target.files)} /></div></section><section className="local-first-banner"><ShieldCheck size={20} /><div><b>Private library, stored locally</b><span>TXT, Markdown, PDF, and EPUB text is parsed and retained in IndexedDB with its original file.</span></div></section>{notice && <div className="inline-notice"><span>{notice}</span><button onClick={() => setNotice("")}>Dismiss</button></div>}<section className={`library-content ${view === "list" ? "library-content--list" : ""}`}>{isLoading ? <div className="empty-library">Loading local library…</div> : documents.length === 0 ? <div className="empty-library"><div className="empty-library__icon"><FilePlus2 size={26} /></div><h2>Start with a book from your device.</h2><p>Supported local formats include PDF, EPUB, TXT, and Markdown.</p><button className="primary-cta" disabled={isImporting} onClick={() => fileInput.current?.click()}>{isImporting ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />} {isImporting ? "Parsing locally" : "Choose local files"}</button></div> : documents.map((document) => <article className="document-card" key={document.id}><div className="document-card__icon">{document.parseStatus === "error" ? <AlertCircle size={22} /> : <FileText size={22} />}</div><div className="document-card__main"><span className="document-kind">{document.kind.toUpperCase()} · {document.parseStatus === "ready" ? `${document.wordCount.toLocaleString()} words` : "Needs review"}</span><h2>{document.name}</h2><p>{formatSize(document.size)} · {Math.round(document.progress)}% complete</p>{document.parseStatus === "error" && <p className="document-error">{document.parseMessage}</p>}<div className="document-progress"><span style={{ width: `${document.progress}%` }} /></div></div><div className="document-card__actions">{document.parseStatus === "ready" && <Link href={`/pacing-engine?document=${encodeURIComponent(document.id)}`} aria-label={`Read ${document.name}`}><BookOpen size={17} /></Link>}<button onClick={() => removeDocument(document.id)} aria-label={`Remove ${document.name}`}><Trash2 size={17} /></button><button aria-label={`Document details for ${document.name}`}><MoreHorizontal size={18} /></button></div></article>)}</section></AppFrame>;
}
