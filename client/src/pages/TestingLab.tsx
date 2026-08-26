/** Instrument Panel design system: local paced diagnostics sharing the reader’s WPM timing model. */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, ChevronRight, CircleDashed, FlaskConical, Gauge, History, Play, RotateCcw, Sparkles } from "lucide-react";
import AppFrame from "@/components/AppFrame";
import { listDiagnosticResults, saveDiagnosticResult, type DiagnosticResult } from "@/lib/localStore";

type Tier = { code: string; title: string; range: string; baselineWpm: number };
type Stage = "intro" | "reading" | "questions" | "result";

const tiers: Tier[] = [
  { code: "T1", title: "Foundational", range: "1–350 WPM", baselineWpm: 250 }, { code: "T2", title: "Intermediate", range: "351–700 WPM", baselineWpm: 550 }, { code: "T3", title: "Advanced speed", range: "701–1,100 WPM", baselineWpm: 900 }, { code: "T4", title: "High velocity", range: "1,101–1,600 WPM", baselineWpm: 1350 }, { code: "T5", title: "Extreme velocity", range: "1,601–2,200 WPM", baselineWpm: 1900 }, { code: "T6", title: "Master velocity", range: "2,201–3,000 WPM", baselineWpm: 2600 }, { code: "T7", title: "Lab limit", range: "3,001–3,700 WPM", baselineWpm: 3400 },
];

const passage = "Small actions shape identity because each repeated choice becomes evidence of the person you are becoming. Goals name a direction, but systems decide what happens on ordinary days. A useful scorecard turns vague intentions into visible patterns, allowing a reader to notice which habits support progress and which habits create friction.";
const passageWords = passage.match(/\S+/g) ?? [];
const questions = [
  { prompt: "What does the passage say repeated choices become?", answers: ["Evidence of identity", "A new goal", "A daily reward"], correct: 0 },
  { prompt: "What decides what happens on ordinary days?", answers: ["Systems", "Motivation", "Speed"], correct: 0 },
  { prompt: "What does a scorecard make visible?", answers: ["Habit patterns", "Page numbers", "Speech voices"], correct: 0 },
];

export default function TestingLab() {
  const [stage, setStage] = useState<Stage>("intro");
  const [selectedTier, setSelectedTier] = useState<Tier>(tiers[0]);
  const [wordIndex, setWordIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [passageEndedAt, setPassageEndedAt] = useState(0);
  const [latest, setLatest] = useState<DiagnosticResult>();
  const [history, setHistory] = useState<DiagnosticResult[]>([]);
  const score = useMemo(() => answers.reduce((sum, answer, index) => sum + (answer === questions[index].correct ? 1 : 0), 0), [answers]);
  const percent = Math.round(score / questions.length * 100);
  const loadHistory = async () => setHistory(await listDiagnosticResults());
  useEffect(() => { loadHistory().catch(() => undefined); }, []);
  useEffect(() => {
    if (stage !== "reading") return;
    if (wordIndex >= passageWords.length) { setPassageEndedAt(Date.now()); setStage("questions"); return; }
    const timer = window.setTimeout(() => setWordIndex((index) => index + 1), Math.max(24, 60000 / selectedTier.baselineWpm));
    return () => window.clearTimeout(timer);
  }, [selectedTier.baselineWpm, stage, wordIndex]);
  const begin = () => { setAnswers([]); setWordIndex(0); setLatest(undefined); setStartedAt(Date.now()); setPassageEndedAt(0); setStage("reading"); };
  const chooseAnswer = (questionIndex: number, answerIndex: number) => setAnswers((current) => { const next = [...current]; next[questionIndex] = answerIndex; return next; });
  const submit = async () => {
    const completedAt = Date.now();
    const elapsedSeconds = Math.max(0.25, ((passageEndedAt || completedAt) - startedAt) / 1000);
    const result: DiagnosticResult = { id: crypto.randomUUID(), tier: selectedTier.code, baselineWpm: selectedTier.baselineWpm, actualWpm: Math.round(passageWords.length / elapsedSeconds * 60), passageWords: passageWords.length, correctAnswers: score, totalQuestions: questions.length, comprehensionPercent: percent, startedAt, completedAt };
    await saveDiagnosticResult(result);
    setLatest(result);
    setStage("result");
    await loadHistory();
  };
  const restart = () => { setStage("intro"); setAnswers([]); setWordIndex(0); setLatest(undefined); };
  const activeWord = passageWords[Math.min(wordIndex, passageWords.length - 1)] ?? "…";
  const focusAt = Math.max(1, Math.min(activeWord.length - 2, Math.round(activeWord.length * 0.42)));
  return <AppFrame title="Testing Lab — local diagnostic"><section className="page-heading"><div><span className="eyebrow">SPEED & COMPREHENSION</span><h1>Find a pace you can keep.</h1><p>Each test uses the same WPM timing model as the reader and keeps its result on this device.</p></div><div className="tier-badge"><FlaskConical size={17} /><span>{selectedTier.code} ready</span></div></section><section className="lab-grid"><aside className="tier-rail"><span className="eyebrow">DIAGNOSTIC TIERS</span>{tiers.map((tier) => <button key={tier.code} className={`tier-row ${tier.code === selectedTier.code ? "active" : ""}`} onClick={() => { if (stage !== "reading") { setSelectedTier(tier); restart(); } }} disabled={stage === "reading"}><b>{tier.code}</b><span><strong>{tier.title}</strong><small>{tier.range} · {tier.baselineWpm.toLocaleString()} baseline</small></span>{tier.code === selectedTier.code ? <ChevronRight size={15} /> : <Gauge size={14} />}</button>)}</aside><section className="lab-stage">{stage === "intro" && <div className="lab-intro"><div className="lab-mark"><Gauge size={27} /></div><span className="eyebrow">{selectedTier.code} / {selectedTier.title.toUpperCase()}</span><h2>Set a useful baseline.</h2><p>The passage will advance at {selectedTier.baselineWpm.toLocaleString()} WPM, then unlock a three-question recall check. Your result is stored only in local diagnostic history.</p><div className="lab-specs"><span><b>{selectedTier.baselineWpm.toLocaleString()}</b> baseline WPM</span><span><b>{passageWords.length}</b> words</span><span><b>3</b> recall questions</span></div><button className="primary-cta" onClick={begin}><Sparkles size={16} /> Begin paced test</button></div>}{stage === "reading" && <div className="diagnostic-reader"><span className="eyebrow">{selectedTier.code} / LIVE PACED PASSAGE</span><div className="diagnostic-progress"><i style={{ width: `${wordIndex / passageWords.length * 100}%` }} /></div><div className="diagnostic-word" aria-live="polite">{activeWord.slice(0, focusAt)}<b>{activeWord[focusAt]}</b>{activeWord.slice(focusAt + 1)}</div><p>Focus on the word. Recall questions begin immediately after this passage.</p><span>{Math.min(wordIndex + 1, passageWords.length)} / {passageWords.length} words · {selectedTier.baselineWpm.toLocaleString()} WPM</span></div>}{stage === "questions" && <div className="question-stage"><span className="eyebrow">RECALL CHECK / {answers.filter((answer) => answer !== undefined).length} OF 3</span><blockquote>“Goals name a direction, but systems decide what happens on ordinary days.”</blockquote>{questions.map((question, questionIndex) => <div key={question.prompt} className={`lab-question ${answers[questionIndex] === undefined ? "" : "answered"}`}><h3>{questionIndex + 1}. {question.prompt}</h3><div>{question.answers.map((answer, answerIndex) => <button key={answer} className={answers[questionIndex] === answerIndex ? "selected" : ""} onClick={() => chooseAnswer(questionIndex, answerIndex)}><i>{String.fromCharCode(65 + answerIndex)}</i>{answer}</button>)}</div></div>)}<button className="primary-cta" disabled={answers.filter((answer) => answer !== undefined).length !== questions.length} onClick={submit}>Score local result <ArrowRight size={16} /></button></div>}{stage === "result" && latest && <div className="lab-result"><div className="result-ring"><b>{latest.comprehensionPercent}%</b><span>RECALL</span></div><span className="eyebrow">LOCAL RESULT / {latest.tier}</span><h2>{latest.comprehensionPercent >= 67 ? "Baseline held." : "Repeat this pace."}</h2><p>{latest.actualWpm.toLocaleString()} observed WPM with {latest.correctAnswers} of {latest.totalQuestions} recall prompts correct. {latest.comprehensionPercent >= 67 ? "Try the next tier when this pace remains comfortable." : "A repeat at the same pace gives a more useful baseline than rushing higher."}</p><div className="result-actions"><button className="secondary-cta" onClick={restart}><RotateCcw size={15} /> Retest</button><button className="primary-cta" onClick={() => window.location.assign(`/pacing-engine?wpm=${selectedTier.baselineWpm}`)}>Take this pace to reader <ArrowRight size={16} /></button></div></div>}</section></section><section className="diagnostic-history"><div><History size={18} /><span><b>Diagnostic history</b><small>{history.length ? `${history.length} local result${history.length === 1 ? "" : "s"} on this device.` : "No local diagnostic results yet."}</small></span></div>{history.length > 0 && <div className="history-list">{history.slice(0, 4).map((result) => <span key={result.id}><b>{result.tier}</b><i>{result.actualWpm.toLocaleString()} WPM</i><i>{result.comprehensionPercent}% recall</i><small>{new Date(result.completedAt).toLocaleDateString()}</small></span>)}</div>}</section><section className="testing-note"><CircleDashed size={18} /><p>Results are functional reading feedback, not a medical or educational diagnosis. Nothing is submitted to a remote service.</p></section></AppFrame>;
}
