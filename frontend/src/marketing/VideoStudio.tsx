"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { Sparkles, Loader2, AlertCircle, Film, Plus, X, Play, Download } from "lucide-react";
import { VideoComposition } from "./VideoComposition";
import type { SceneData, Bubble } from "./SceneRenderer";

interface Storyboard {
  projectId: string;
  niche: string;
  title: string;
  objective: string;
  audience: string;
  durationSeconds: number;
  aspectRatio: string;
  fps: number;
  style: string;
  voice: { source: string; audioUrl?: string | null; language: string };
  scenes: SceneData[];
  cta: { text: string; start: number; end: number };
  production?: unknown;
}

interface VideoStudioProps {
  BACKEND_URL: string;
  getHeaders: () => Record<string, string>;
}

const DURATIONS = [15, 30, 45, 60];
const PURPOSE_LABEL: Record<string, string> = {
  hook: "Gancho", problem: "Problema", solution: "Solución", benefit: "Beneficio", cta: "CTA",
};

export default function VideoStudio({ BACKEND_URL, getHeaders }: VideoStudioProps) {
  const [topic, setTopic] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [niche, setNiche] = useState("");
  const [duration, setDuration] = useState(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sb, setSb] = useState<Storyboard | null>(null);

  // Estado del render (mp4)
  const [rendering, setRendering] = useState(false);
  const [renderStage, setRenderStage] = useState("");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Cargar nichos disponibles
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/marketing/video/niches`, { headers: getHeaders() })
      .then((r) => (r.ok ? r.json() : { niches: [] }))
      .then((d) => {
        setNiches(d.niches || []);
        if (d.niches?.length && !niche) setNiche(d.niches[0]);
      })
      .catch(() => setNiches([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fps = sb?.fps || 30;
  const durationInFrames = useMemo(
    () => Math.max(1, Math.round((sb?.durationSeconds || duration) * fps)),
    [sb, duration, fps]
  );

  const generate = async () => {
    if (!topic.trim() || !niche) return;
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/video/storyboard`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ topic, niche, durationSeconds: duration }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo generar el video.");
        return;
      }
      setSb(data.storyboard);
      setWarnings(data.warnings || []);
      // nuevo guion → descartar el render anterior
      setRenderUrl(null);
      setRenderError(null);
      setRenderProgress(0);
      setRenderStage("");
    } catch {
      setError("Error de conexión al generar.");
    } finally {
      setLoading(false);
    }
  };

  // Renderiza el mp4 final en el server (voz + subtítulos + footage) y hace polling.
  const renderVideo = async () => {
    if (!sb || rendering) return;
    setRendering(true);
    setRenderError(null);
    setRenderUrl(null);
    setRenderProgress(0);
    setRenderStage("En cola");
    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/video/render`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ storyboard: sb }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) {
        setRenderError(data.error || "No se pudo iniciar el render.");
        setRendering(false);
        return;
      }
      const jobId = data.jobId;
      // Polling cada 2.5s
      const poll = async (): Promise<void> => {
        const r = await fetch(`${BACKEND_URL}/api/marketing/video/render/${jobId}`, { headers: getHeaders() });
        const j = await r.json();
        setRenderProgress(j.progress || 0);
        setRenderStage(j.stage || "");
        if (j.status === "done" && j.videoUrl) {
          setRenderUrl(j.videoUrl);
          setRendering(false);
          return;
        }
        if (j.status === "error") {
          setRenderError(j.error || "El render falló.");
          setRendering(false);
          return;
        }
        setTimeout(poll, 2500);
      };
      setTimeout(poll, 2500);
    } catch {
      setRenderError("Error de conexión con el servicio de render.");
      setRendering(false);
    }
  };

  // Descarga el guion + storyboard como JSON (listo para el toolkit de render)
  const downloadJson = () => {
    if (!sb) return;
    const slug = (sb.title || sb.projectId || "storyboard")
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "storyboard";
    // Escapamos no-ASCII (é → é) para que el archivo se lea igual en cualquier
    // editor/parser sin depender de que interpreten UTF-8 (evita el mojibake en Windows).
    const json = JSON.stringify(sb, null, 2).replace(
      /[\u0080-\uffff]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")
    );
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.storyboard.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Actualización inmutable de una escena
  const patchScene = (id: string, patch: Partial<SceneData>) => {
    setSb((prev) => prev && { ...prev, scenes: prev.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };
  const patchVisual = (id: string, patch: Record<string, unknown>) => {
    setSb((prev) => prev && {
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === id ? { ...s, visual: { ...s.visual, ...patch } as SceneData["visual"] } : s)),
    });
  };
  const patchBubble = (id: string, i: number, patch: Partial<Bubble>) => {
    setSb((prev) => prev && {
      ...prev,
      scenes: prev.scenes.map((s) => {
        if (s.id !== id || s.visual.type !== "chat_mockup") return s;
        const bubbles = s.visual.bubbles.map((b, bi) => (bi === i ? { ...b, ...patch } : b));
        return { ...s, visual: { ...s.visual, bubbles } };
      }),
    });
  };

  const inputStyle = "w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-orange-600 transition-colors";

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative z-10">
      {/* Header */}
      <header className="h-16 px-6 border-b border-neutral-800/60 bg-neutral-900/20 backdrop-blur-md flex items-center gap-3 shrink-0">
        <Film size={18} className="text-orange-400" />
        <span className="font-bold text-lg text-white">Video Studio</span>
        <span className="text-[10px] px-2 py-1 rounded bg-orange-950/40 border border-orange-900/40 text-orange-400 select-none">
          Storyboard + Preview
        </span>
        {sb && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={downloadJson}
              title="Descargar el guion + storyboard (JSON) para el render"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-neutral-800/60 border border-neutral-700 text-neutral-200 hover:bg-neutral-700/60 hover:text-white transition-all"
            >
              <Download size={14} /> Descargar guion
            </button>
            <button
              onClick={renderVideo}
              disabled={rendering}
              title="Generar el video mp4 final (voz + subtítulos + footage) en el server"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-md shadow-orange-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rendering ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
              {rendering ? "Renderizando…" : "Renderizar video"}
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {/* Formulario */}
        <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-5 mb-6 backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end">
            <div>
              <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Idea del video</label>
              <input
                type="text"
                placeholder="Ej: Perdés alumnos por responder tarde los mensajes"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Nicho</label>
              <select value={niche} onChange={(e) => setNiche(e.target.value)} className={`${inputStyle} min-w-[160px]`}>
                {niches.length === 0 && <option value="">(sin nichos)</option>}
                {niches.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Duración</label>
              <div className="flex gap-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      duration === d ? "bg-orange-600 text-white" : "bg-neutral-950/60 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >{d}s</button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading || !topic.trim() || !niche}
            className="mt-4 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/15 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Generando guion…" : "Generar video"}
          </button>
          {error && (
            <div className="mt-3 p-3 bg-rose-950/40 border border-rose-900/40 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Resultado: preview + editor */}
        {sb && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* Preview */}
            <div className="lg:sticky lg:top-0 self-start">
              <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-black shadow-xl">
                <Player
                  component={VideoComposition as any}
                  inputProps={{ scenes: sb.scenes, fps }}
                  durationInFrames={durationInFrames}
                  fps={fps}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  style={{ width: 300, height: 533 }}
                  controls
                  loop
                />
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-semibold text-white flex items-center justify-center gap-1.5">
                  <Play size={13} className="text-orange-400" /> {sb.title}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  {sb.durationSeconds}s · {sb.scenes.length} escenas · 9:16
                </div>
              </div>
              {warnings.length > 0 && (
                <div className="mt-3 p-3 bg-amber-950/30 border border-amber-900/40 rounded-xl text-amber-300/90 text-[11px]">
                  <div className="font-semibold mb-1">Revisar:</div>
                  {warnings.map((w, i) => <div key={i}>• {w}</div>)}
                </div>
              )}

              {/* Progreso del render mp4 */}
              {rendering && (
                <div className="mt-3 p-3 bg-orange-950/20 border border-orange-900/40 rounded-xl">
                  <div className="flex items-center justify-between text-[11px] text-orange-300 font-semibold mb-2">
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" /> {renderStage || "Renderizando"}…
                    </span>
                    <span>{Math.round(renderProgress * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all" style={{ width: `${Math.max(4, renderProgress * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-500">Generar el video tarda 1-3 min. Podés seguir editando otras cosas.</p>
                </div>
              )}
              {renderError && (
                <div className="mt-3 p-3 bg-rose-950/40 border border-rose-900/40 rounded-xl text-rose-400 text-[11px] flex items-center gap-2">
                  <AlertCircle size={14} /> {renderError}
                </div>
              )}
              {renderUrl && !rendering && (
                <a
                  href={renderUrl}
                  download
                  className="mt-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                >
                  <Download size={16} /> Descargar video (mp4)
                </a>
              )}

              <p className="mt-3 text-[10.5px] text-neutral-600 leading-normal">
                El preview usa los componentes y las fotos reales de Pexels. <b className="text-neutral-500">Renderizar video</b> genera
                el mp4 final con voz y subtítulos sincronizados en el server y te lo deja para descargar.
              </p>
            </div>

            {/* Editor de escenas */}
            <div className="space-y-4">
              {sb.scenes.map((s) => (
                <div key={s.id} className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-orange-950/40 border border-orange-900/40 text-orange-400 font-semibold">
                      {PURPOSE_LABEL[s.purpose] || s.purpose}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">{s.start}s–{s.end}s</span>
                    <span className="text-[10px] text-neutral-600">· {s.visual.type}</span>
                  </div>

                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Narración (voz)</label>
                  <textarea rows={2} value={s.narration} onChange={(e) => patchScene(s.id, { narration: e.target.value })} className={`${inputStyle} resize-none mb-3`} />

                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Subtítulo</label>
                  <textarea rows={2} value={s.subtitle} onChange={(e) => patchScene(s.id, { subtitle: e.target.value })} className={`${inputStyle} resize-none mb-3`} />

                  {/* Editor por tipo visual */}
                  {s.visual.type === "stock" && (
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Búsqueda de stock (inglés)</label>
                      <input value={s.visual.stockQuery} onChange={(e) => patchVisual(s.id, { stockQuery: e.target.value })} className={inputStyle} />
                    </div>
                  )}

                  {s.visual.type === "chat_mockup" && (
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Burbujas del chat</label>
                      <div className="space-y-2">
                        {s.visual.bubbles.map((b, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <select value={b.from} onChange={(e) => patchBubble(s.id, i, { from: e.target.value })} className="bg-neutral-950/60 border border-neutral-800 text-neutral-300 text-xs px-2 py-1.5 rounded-lg">
                              <option value="cliente">cliente</option>
                              <option value="negocio">negocio</option>
                            </select>
                            <input value={b.text} onChange={(e) => patchBubble(s.id, i, { text: e.target.value })} className={`${inputStyle} flex-1`} />
                            <input value={b.time || ""} onChange={(e) => patchBubble(s.id, i, { time: e.target.value })} className="w-16 bg-neutral-950/60 border border-neutral-800 text-neutral-300 text-xs px-2 py-1.5 rounded-lg text-center" placeholder="hh:mm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.visual.type === "dashboard" && (
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Métricas</label>
                      <div className="grid grid-cols-2 gap-2">
                        {s.visual.metrics.map((m, i) => (
                          <div key={i} className="flex gap-1">
                            <input value={m.value} onChange={(e) => {
                              const metrics = (s.visual as any).metrics.map((mm: any, mi: number) => mi === i ? { ...mm, value: e.target.value } : mm);
                              patchVisual(s.id, { metrics });
                            }} className="w-16 bg-neutral-950/60 border border-neutral-800 text-orange-400 font-bold text-xs px-2 py-1.5 rounded-lg text-center" />
                            <input value={m.label} onChange={(e) => {
                              const metrics = (s.visual as any).metrics.map((mm: any, mi: number) => mi === i ? { ...mm, label: e.target.value } : mm);
                              patchVisual(s.id, { metrics });
                            }} className={`${inputStyle} flex-1`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.visual.type === "end_card" && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Título</label>
                        <input value={s.visual.headline} onChange={(e) => patchVisual(s.id, { headline: e.target.value })} className={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">CTA</label>
                        <input value={s.visual.cta} onChange={(e) => patchVisual(s.id, { cta: e.target.value })} className={inputStyle} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!sb && !loading && (
          <div className="text-center text-neutral-600 py-16">
            <Film size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Escribí una idea, elegí el nicho y generá tu video.</p>
            <p className="text-xs mt-1">El guion + storyboard sale por nicho, y lo previsualizás acá al instante.</p>
          </div>
        )}
      </div>
    </div>
  );
}
