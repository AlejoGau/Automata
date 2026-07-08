"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, Trash2, Megaphone, Save, Download,
  ChevronLeft, ChevronRight, Palette, RefreshCw, FileText,
  Share2, HelpCircle, ArrowRight, Check, X, Image, Layers,
  Video, Copy, CheckCircle, AlertCircle, Info, ChevronDown, ChevronUp
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface BrandProfile {
  business_name: string;
  industry: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  whatsapp: string;
  website: string;
  default_tone: string;
}

interface Slide {
  slideNumber: number;
  role: 'hook' | 'problem' | 'benefit' | 'offer' | 'cta' | 'generic';
  title: string;
  subtitle: string;
  textOnScreen?: string;
  voiceOver?: string;
  visualSuggestion?: string;
  layoutStyle?: 'center' | 'left' | 'accent' | 'highlight';
  eyebrow?: string;
  badge?: string;
  colorAccent?: string;
}

interface MarketingContent {
  id?: string;
  content_type: 'carrusel' | 'reel' | 'post_simple';
  status: 'draft' | 'ready';
  title: string;
  goal: string;
  tone: string;
  target_social_network: string;
  format: string;
  form_data_json: any;
  slides_json: Slide[] | any;
  caption: string;
  hashtags_json: string[];
  created_at?: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmModal {
  message: string;
  onConfirm: () => void;
}

interface MarketingStudioProps {
  session: any;
  BACKEND_URL: string;
  getHeaders: () => any;
}

// ─── Module-level helpers (no re-creation on render) ────────────────────────

/** Parse a "WxH" format string into pixel dimensions */
const getFormatDimensions = (format?: string): { width: number; height: number } => {
  if (format?.includes('x')) {
    const [w, h] = format.split('x');
    return { width: parseInt(w) || 1080, height: parseInt(h) || 1350 };
  }
  return { width: 1080, height: 1350 };
};

/** Map an industry string to a curated Unsplash background URL */
const getNicheUrl = (industryText: string): string => {
  const t = industryText.toLowerCase();
  if (t.includes('gim') || t.includes('gym') || t.includes('fitness') || t.includes('entren'))
    return "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1080&auto=format&fit=crop";
  if (t.includes('pelu') || t.includes('barber') || t.includes('estet') || t.includes('salon'))
    return "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1080&auto=format&fit=crop";
  if (t.includes('inmo') || t.includes('propied') || t.includes('casa') || t.includes('real'))
    return "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1080&auto=format&fit=crop";
  if (t.includes('taller') || t.includes('auto') || t.includes('mecan'))
    return "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=1080&auto=format&fit=crop";
  if (t.includes('gastro') || t.includes('restaur') || t.includes('comida') || t.includes('hambur'))
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1080&auto=format&fit=crop";
  if (t.includes('odon') || t.includes('dent') || t.includes('clínic') || t.includes('salud'))
    return "https://images.unsplash.com/photo-1588776814546-1ffedfd5f600?q=80&w=1080&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&auto=format&fit=crop";
};

/**
 * Resolve the correct slide field name based on content type.
 * Carrusel → title/subtitle | Reel/Post → textOnScreen/voiceOver
 */
const resolveFieldName = (field: 'title' | 'subtitle' | 'layoutStyle', contentType: string): string => {
  if (contentType !== 'carrusel') {
    if (field === 'title') return 'textOnScreen';
    if (field === 'subtitle') return 'voiceOver';
  }
  return field;
};

// ─── Quick Templates ─────────────────────────────────────────────────────────
const QUICK_TEMPLATES = [
  {
    icon: "💪", label: "Gimnasio", industry: "Gimnasio",
    goal: "Conseguir leads",
    offer: "Matrícula 20% OFF esta semana.",
    benefits: "Entrenamientos personalizados, clases de Crossfit, seguimiento continuo.",
    contentType: "carrusel" as const,
  },
  {
    icon: "✂️", label: "Peluquería", industry: "Peluquería / Barbería",
    goal: "Promocionar oferta",
    offer: "Combo Corte + Afeitado 15% OFF de Lunes a Miércoles.",
    benefits: "Atención premium, café de cortesía, estilistas certificados.",
    contentType: "carrusel" as const,
  },
  {
    icon: "🏠", label: "Inmobiliaria", industry: "Inmobiliaria",
    goal: "Conseguir leads",
    offer: "Financiación en pesos hasta 24 cuotas sin interés.",
    benefits: "Ubicación céntrica, terminaciones premium, cochera incluida.",
    contentType: "carrusel" as const,
  },
  {
    icon: "🔧", label: "Taller Mecánico", industry: "Taller Mecánico",
    goal: "Promocionar oferta",
    offer: "Alineación y balanceo bonificados con cambio de aceite.",
    benefits: "Garantía de reparación, diagnóstico computarizado.",
    contentType: "carrusel" as const,
  },
  {
    icon: "🍔", label: "Gastronomía", industry: "Gastronomía / Restaurante",
    goal: "Promocionar oferta",
    offer: "2×1 en hamburguesas todos los jueves.",
    benefits: "Ingredientes frescos, ambiente familiar, delivery disponible.",
    contentType: "post_simple" as const,
  },
  {
    icon: "🦷", label: "Odontología", industry: "Odontología",
    goal: "Conseguir leads",
    offer: "Primera consulta + diagnóstico sin cargo.",
    benefits: "Turnos rápidos, blanqueamiento profesional, obras sociales.",
    contentType: "carrusel" as const,
  },
];

// ─── PhoneMockup — defined OUTSIDE the parent to avoid re-creation ────────────
interface PhoneMockupProps {
  brandProfile: BrandProfile;
  activeContent: MarketingContent | null;
  activeSlideIndex: number;
  nicheBackgroundUrl: string;
  onSlideChange: (index: number) => void;
}

function PhoneMockup({ brandProfile, activeContent, activeSlideIndex, nicheBackgroundUrl, onSlideChange }: PhoneMockupProps) {
  const currentSlide = activeContent?.slides_json[activeSlideIndex];
  const isCarrusel = activeContent?.content_type === 'carrusel';
  const slideCount = activeContent?.slides_json.length ?? 0;

  const titleText = isCarrusel ? currentSlide?.title : currentSlide?.textOnScreen;
  const subtitleText = isCarrusel ? currentSlide?.subtitle : currentSlide?.voiceOver;
  const isHighlight = currentSlide?.layoutStyle === 'highlight' || currentSlide?.role === 'offer';

  const getTitleColor = () => {
    if (currentSlide?.colorAccent === 'primary') return brandProfile.primary_color || '#f97316';
    if (currentSlide?.colorAccent === 'secondary' || isHighlight) return brandProfile.secondary_color || '#fbbf24';
    return '#ffffff';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[340px] h-[600px] rounded-[44px] border-4 border-neutral-800 bg-[#0a0a0b] shadow-2xl shadow-black/60 relative flex flex-col overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-neutral-900 rounded-b-2xl z-40" />
        {/* Status bar */}
        <div className="px-5 pt-7 pb-1 flex justify-between items-center text-[10px] text-neutral-500 z-30 shrink-0">
          <span className="font-semibold">9:41</span>
          <div className="flex gap-1.5 items-center">
            <span className="w-3 h-2.5 bg-neutral-500 rounded-sm opacity-80" />
            <span className="w-2 h-2.5 bg-neutral-500 rounded-sm opacity-60" />
          </div>
        </div>
        {/* Profile row */}
        <div className="px-4 py-2 border-b border-neutral-900 bg-neutral-950/80 flex items-center gap-2.5 z-30 shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-[11px] font-black text-white uppercase shadow">
            {brandProfile.business_name?.charAt(0) || 'M'}
          </div>
          <div>
            <span className="text-[11px] font-bold text-white block leading-tight">{brandProfile.business_name || 'Mi Negocio'}</span>
            <span className="text-[9px] text-neutral-500">Patrocinado</span>
          </div>
        </div>

        {/* Slide content area */}
        {activeContent ? (
          <div
            className="flex-1 relative flex flex-col p-6 justify-between select-none bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.7),rgba(0,0,0,0.7)), url(${nicheBackgroundUrl})`,
              fontFamily: brandProfile.font_family || 'sans-serif',
            }}
          >
            {/* Brand stripe (premium border) */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: brandProfile.primary_color || '#f97316' }} />

            {/* Top brand header */}
            <div className="flex items-center justify-between w-full shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: brandProfile.primary_color || '#f97316' }} />
                <span className="text-[9px] font-black uppercase text-white tracking-widest">
                  {brandProfile.business_name || 'MI NEGOCIO'}
                </span>
              </div>
              {slideCount > 1 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                  {activeSlideIndex + 1} / {slideCount}
                </span>
              )}
            </div>

            {/* Text block */}
            <div className={`my-auto ${currentSlide?.layoutStyle === 'center' ? 'text-center' : 'text-left'}`}>
              {/* Badge if present */}
              {currentSlide?.badge && (
                <div className={`mb-2.5 flex ${currentSlide.layoutStyle === 'center' ? 'justify-center' : 'justify-start'}`}>
                  <span className="px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-500 shadow-md">
                    {currentSlide.badge}
                  </span>
                </div>
              )}

              {/* Eyebrow label */}
              {currentSlide?.eyebrow && (
                <span 
                  className="text-[9px] font-black tracking-widest uppercase block mb-1.5 opacity-90"
                  style={{ color: brandProfile.primary_color || '#f97316' }}
                >
                  {currentSlide.eyebrow}
                </span>
              )}

              {/* Slide Title */}
              <h2
                className="text-xl font-black leading-snug drop-shadow-md"
                style={{ color: getTitleColor() }}
              >
                {titleText}
              </h2>

              {/* Small accent divider */}
              <div 
                className={`h-0.5 w-10 my-2.5 rounded-full ${currentSlide?.layoutStyle === 'center' ? 'mx-auto' : ''}`}
                style={{ backgroundColor: brandProfile.primary_color || '#f97316' }} 
              />

              {/* Subtitle / Description */}
              <p className="text-[11px] leading-relaxed text-neutral-300 font-medium">
                {subtitleText}
              </p>
            </div>

            {/* Footer with glassmorphism */}
            <div className="bg-black/50 backdrop-blur-md rounded-xl p-3 border border-white/5 flex justify-between items-center mt-auto w-full shrink-0">
              <div className="text-[8px] text-neutral-300 space-y-0.5">
                {brandProfile.whatsapp && <p className="flex items-center gap-1 font-semibold">💬 +{brandProfile.whatsapp}</p>}
                {brandProfile.website && <p className="flex items-center gap-1 opacity-90">🌐 {brandProfile.website}</p>}
              </div>
              {slideCount > 1 && (
                <div className="flex gap-1 items-center">
                  {activeContent.slides_json.map((_: any, i: number) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full transition-all"
                      style={{ 
                        backgroundColor: activeSlideIndex === i ? (brandProfile.primary_color || '#f97316') : '#ffffff30',
                        transform: activeSlideIndex === i ? 'scale(1.2)' : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Navigation arrows */}
            {slideCount > 1 && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1 pointer-events-none z-30">
                <button
                  type="button"
                  disabled={activeSlideIndex === 0}
                  onClick={() => onSlideChange(Math.max(0, activeSlideIndex - 1))}
                  className="w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white pointer-events-auto disabled:opacity-20 shadow"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  disabled={activeSlideIndex === slideCount - 1}
                  onClick={() => onSlideChange(Math.min(slideCount - 1, activeSlideIndex + 1))}
                  className="w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white pointer-events-auto disabled:opacity-20 shadow"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-xs">
            Sin contenido
          </div>
        )}
      </div>

      {/* Slide counter */}
      {slideCount > 1 && (
        <p className="text-[10px] text-neutral-500 font-semibold">
          Slide {activeSlideIndex + 1} / {slideCount}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MarketingStudio({ session, BACKEND_URL, getHeaders }: MarketingStudioProps) {

  // — Navigation —
  const [subSection, setSubSection] = useState<'crear' | 'mis_publicaciones' | 'marca'>('crear');
  const [creationStep, setCreationStep] = useState<1 | 2 | 3>(1);

  // — Brand Profile —
  const [brandProfile, setBrandProfile] = useState<BrandProfile>({
    business_name: "", industry: "", logo_url: "",
    primary_color: "#f97316", secondary_color: "#fbbf24",
    background_color: "#121214", font_family: "Inter",
    whatsapp: "", website: "", default_tone: "Motivador",
  });

  // — Saved Contents —
  const [savedContents, setSavedContents] = useState<MarketingContent[]>([]);
  const [dbNotMigrated, setDbNotMigrated] = useState(false);

  // — Loading States —
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [loadingContents, setLoadingContents] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingVision, setLoadingVision] = useState(false);

  // — Form Data —
  const [formData, setFormData] = useState({
    contentType: 'carrusel' as 'carrusel' | 'reel' | 'post_simple',
    title: '', industry: '', goal: 'Conseguir leads', tone: 'Motivador',
    offer: '', benefits: '', cta: 'Escribinos por WhatsApp',
    targetSocialNetwork: 'Instagram Feed',
    format: '1080x1350', slidesCount: 5, duration: 15,
  });
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null); // Fix 6: separate from formData.industry
  const [showAdvanced, setShowAdvanced] = useState(false);

  // — Active Content & Editor —
  const [activeContent, setActiveContent] = useState<MarketingContent | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [visionAnalysis, setVisionAnalysis] = useState("");

  // — Toast Notifications —
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // — Confirm Modal —
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);

  // — Brand initialization guard (Fix 4) —
  const brandInitialized = useRef(false);

  // ─── Derived / Memoized ──────────────────────────────────────────────────
  // Fix 2: single consistent URL derived from both sources — no repeated string matching
  const nicheBackgroundUrl = useMemo(
    () => getNicheUrl(formData.industry || brandProfile.industry || ""),
    [formData.industry, brandProfile.industry]
  );

  // ─── Effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBrandProfile();
    fetchSavedContents();
  }, []);

  // Fix 4: only populate form on the FIRST brand load, not on every brand edit
  useEffect(() => {
    if (brandProfile.business_name && !brandInitialized.current) {
      brandInitialized.current = true;
      setFormData(prev => ({
        ...prev,
        title: prev.title || `Publicación — ${brandProfile.business_name}`,
        industry: prev.industry || brandProfile.industry || '',
        tone: prev.tone || brandProfile.default_tone || 'Motivador',
        cta: prev.cta || (brandProfile.whatsapp ? `Escribinos al WhatsApp +${brandProfile.whatsapp}` : 'Escribinos por WhatsApp'),
      }));
    }
  }, [brandProfile.business_name]); // watch only business_name, not the whole object

  // Clear vision analysis on slide change
  useEffect(() => {
    setVisionAnalysis("");
  }, [activeSlideIndex]);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [toast]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const showToast = (message: string, type: Toast['type'] = 'success') =>
    setToast({ message, type });

  const showConfirm = (message: string, onConfirm: () => void) =>
    setConfirmModal({ message, onConfirm });

  // ─── API Calls ───────────────────────────────────────────────────────────
  const fetchBrandProfile = async () => {
    setLoadingBrand(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/brand`, { headers: getHeaders() });
      const json = await res.json();
      if (json.db_not_migrated) {
        setDbNotMigrated(true);
        const local = localStorage.getItem('automata_brand_profile');
        if (local) setBrandProfile(JSON.parse(local));
      } else if (json.data) {
        setBrandProfile(json.data);
      }
    } catch {
      const local = localStorage.getItem('automata_brand_profile');
      if (local) setBrandProfile(JSON.parse(local));
    } finally {
      setLoadingBrand(false);
    }
  };

  const saveBrandProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      if (dbNotMigrated) {
        localStorage.setItem('automata_brand_profile', JSON.stringify(brandProfile));
        showToast('Marca guardada localmente.', 'info');
      } else {
        const res = await fetch(`${BACKEND_URL}/api/marketing/brand`, {
          method: 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(brandProfile),
        });
        const json = await res.json();
        if (json.data) {
          setBrandProfile(json.data);
          showToast('Identidad de marca guardada ✓', 'success');
        } else {
          localStorage.setItem('automata_brand_profile', JSON.stringify(brandProfile));
          showToast('Guardado localmente.', 'info');
        }
      }
    } catch {
      localStorage.setItem('automata_brand_profile', JSON.stringify(brandProfile));
      showToast('Error de red. Guardado localmente.', 'error');
    } finally {
      setSavingBrand(false);
    }
  };

  const fetchSavedContents = async () => {
    setLoadingContents(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/contents`, { headers: getHeaders() });
      const json = await res.json();
      if (json.db_not_migrated) {
        setDbNotMigrated(true);
        const local = localStorage.getItem('automata_marketing_contents');
        if (local) setSavedContents(JSON.parse(local));
      } else if (json.data) {
        setSavedContents(json.data);
      }
    } catch {
      const local = localStorage.getItem('automata_marketing_contents');
      if (local) setSavedContents(JSON.parse(local));
    } finally {
      setLoadingContents(false);
    }
  };

  const saveContentDraft = async (content: MarketingContent) => {
    setSavingContent(true);
    try {
      if (dbNotMigrated) {
        const updated = [...savedContents];
        const idx = updated.findIndex(c => c.id === content.id);
        const target = { ...content };
        if (idx > -1) {
          updated[idx] = target;
        } else {
          target.id = `local-${Date.now()}`;
          target.created_at = new Date().toISOString();
          updated.unshift(target);
        }
        localStorage.setItem('automata_marketing_contents', JSON.stringify(updated));
        setSavedContents(updated);
        setActiveContent(target);
        showToast('Borrador guardado localmente ✓', 'success');
      } else {
        const isUpdate = !!content.id && !content.id.startsWith('local-');
        const url = isUpdate
          ? `${BACKEND_URL}/api/marketing/contents/${content.id}`
          : `${BACKEND_URL}/api/marketing/contents`;
        const res = await fetch(url, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(content),
        });
        const json = await res.json();
        if (json.data) {
          const updated = [...savedContents];
          const idx = updated.findIndex(c => c.id === json.data.id);
          if (idx > -1) updated[idx] = json.data;
          else updated.unshift(json.data);
          setSavedContents(updated);
          setActiveContent(json.data);
          showToast('Borrador guardado en la nube ✓', 'success');
        }
      }
    } catch {
      showToast('No se pudo guardar el borrador.', 'error');
    } finally {
      setSavingContent(false);
    }
  };

  const deleteContentDraft = (id: string) => {
    showConfirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.', async () => {
      try {
        if (dbNotMigrated || id.startsWith('local-')) {
          const updated = savedContents.filter(c => c.id !== id);
          localStorage.setItem('automata_marketing_contents', JSON.stringify(updated));
          setSavedContents(updated);
          if (activeContent?.id === id) setActiveContent(null);
        } else {
          const res = await fetch(`${BACKEND_URL}/api/marketing/contents/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (res.ok) {
            setSavedContents(prev => prev.filter(c => c.id !== id));
            if (activeContent?.id === id) setActiveContent(null);
            showToast('Publicación eliminada.', 'info');
          }
        }
      } catch {
        showToast('Error al eliminar.', 'error');
      }
    });
  };

  // ─── Generation ──────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setActiveSlideIndex(0);
    setVisionAnalysis("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/marketing/generate`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: formData.contentType,
          businessName: brandProfile.business_name || "Mi Negocio",
          industry: formData.industry || brandProfile.industry,
          goal: formData.goal,
          tone: formData.tone,
          offer: formData.offer,
          benefits: formData.benefits,
          cta: formData.cta,
          targetSocialNetwork: formData.targetSocialNetwork,
          format: formData.format,
          slidesCount: formData.slidesCount,
          duration: formData.duration,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        let slides = json.data.slides || json.data.scenes || [{
          slideNumber: 1, role: 'generic',
          title: json.data.title || "Post Simple",
          subtitle: json.data.visualSuggestion || "Diseño corporativo",
          layoutStyle: 'center',
        }];

        // Auto-assign layouts for carousel slides
        if (formData.contentType === 'carrusel') {
          slides = slides.map((s: Slide, idx: number) => ({
            ...s,
            layoutStyle: idx === 0 ? 'center' : idx === slides.length - 1 ? 'highlight' : 'left',
          }));
        }

        const payload: MarketingContent = {
          content_type: formData.contentType,
          status: 'draft',
          title: formData.title || `Publicación — ${brandProfile.business_name || 'Mi Negocio'}`,
          goal: formData.goal,
          tone: formData.tone,
          target_social_network: formData.targetSocialNetwork,
          format: formData.format,
          form_data_json: formData,
          slides_json: slides,
          caption: json.data.caption || "",
          hashtags_json: json.data.hashtags || [],
        };

        setActiveContent(payload);
        setCreationStep(2);
        showToast('¡Propuesta generada! Revisá y editá a tu gusto.', 'success');
      } else {
        showToast('No se pudo generar el contenido. Intentá de nuevo.', 'error');
      }
    } catch {
      showToast('Error de conexión al generar contenido.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Editor ──────────────────────────────────────────────────────────────
  const handleUpdateSlideField = (field: 'title' | 'subtitle' | 'layoutStyle', value: string) => {
    if (!activeContent) return;
    const resolvedField = resolveFieldName(field, activeContent.content_type); // Fix 5
    const updatedSlides = [...activeContent.slides_json];
    updatedSlides[activeSlideIndex] = { ...updatedSlides[activeSlideIndex], [resolvedField]: value };
    setActiveContent({ ...activeContent, slides_json: updatedSlides });
  };

  // Helper function to draw rounded rectangles on Canvas
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // ─── Canvas Render ───────────────────────────────────────────────────────
  const renderSlideToCanvas = (
    slide: Slide, index: number, total: number, width: number, height: number
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(canvas); return; }

      const primary = brandProfile.primary_color || '#f97316';
      const secondary = brandProfile.secondary_color || '#fbbf24';
      const leftMargin = width * 0.092;
      const textMaxWidth = width * 0.82;

      ctx.fillStyle = brandProfile.background_color || '#121214';
      ctx.fillRect(0, 0, width, height);

      const drawContent = () => {
        // 1. Premium vertical brand stripe (on the left edge)
        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, width * 0.015, height);

        // 2. Decorative overlay circles (elegant background geometry)
        ctx.fillStyle = `${primary}20`;
        ctx.beginPath();
        ctx.arc(width, 0, width * 0.35, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = `${secondary}10`;
        ctx.beginPath();
        ctx.arc(0, height, height * 0.38, 0, 2 * Math.PI);
        ctx.fill();

        // 3. Header: Brand Logo & Title + Progress Pill
        const logoFontSize = Math.max(16, Math.round(width * 0.033));
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${logoFontSize}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText((brandProfile.business_name || 'MI NEGOCIO').toUpperCase(), leftMargin, height * 0.08);

        // Small indicator stripe under brand name
        ctx.fillStyle = primary;
        ctx.fillRect(leftMargin, height * 0.095, width * 0.06, Math.max(2, Math.round(height * 0.005)));

        // Carousel Page indicator pill in header
        if (total > 1) {
          const pillText = `${index + 1} / ${total}`;
          const pillFontSize = Math.max(11, Math.round(width * 0.024));
          ctx.font = `bold ${pillFontSize}px sans-serif`;
          const textWidth = ctx.measureText(pillText).width;
          const pillW = textWidth + 24;
          const pillH = pillFontSize + 12;
          const pillX = width * 0.91 - pillW;
          const pillY = height * 0.065;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2 + pillFontSize * 0.35);
        }

        // 4. Content Block Layout
        const layout = slide.layoutStyle || 'left';
        const isCenter = layout === 'center';
        const isHighlight = layout === 'highlight' || slide.role === 'offer';
        const baseTitleSize = Math.max(22, Math.round(width * 0.052));
        const baseSubSize = Math.max(13, Math.round(width * 0.028));
        
        let contentY = height * 0.32;
        ctx.textAlign = isCenter ? 'center' : 'left';
        const drawX = isCenter ? width / 2 : leftMargin;

        // Badge rendering (e.g. "⚡ SOLO HOY")
        if (slide.badge) {
          const badgeText = slide.badge.toUpperCase();
          const badgeFontSize = Math.max(10, Math.round(width * 0.022));
          ctx.font = `black ${badgeFontSize}px sans-serif`;
          const bTextWidth = ctx.measureText(badgeText).width;
          const badgeW = bTextWidth + 18;
          const badgeH = badgeFontSize + 10;
          const badgeX = isCenter ? (width / 2 - badgeW / 2) : leftMargin;
          
          // Badge background (gradient look)
          const grad = ctx.createLinearGradient(badgeX, contentY, badgeX + badgeW, contentY);
          grad.addColorStop(0, '#fbbf24');
          grad.addColorStop(1, '#f59e0b');
          ctx.fillStyle = grad;
          drawRoundRect(ctx, badgeX, contentY, badgeW, badgeH, 6);
          ctx.fill();

          // Badge text
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.fillText(badgeText, badgeX + badgeW / 2, contentY + badgeH / 2 + badgeFontSize * 0.35);

          // Reset align
          ctx.textAlign = isCenter ? 'center' : 'left';
          contentY += badgeH + 20;
        }

        // Eyebrow label rendering
        if (slide.eyebrow) {
          const eyebrowText = slide.eyebrow.toUpperCase();
          const eyebrowFontSize = Math.max(11, Math.round(width * 0.025));
          ctx.font = `black ${eyebrowFontSize}px sans-serif`;
          ctx.fillStyle = primary;
          // Add letter spacing manually for premium look
          const spacedText = eyebrowText.split('').join(' ');
          ctx.fillText(spacedText, drawX, contentY);
          contentY += eyebrowFontSize + 14;
        }

        // Title text color mapping
        let titleColor = '#ffffff';
        if (slide.colorAccent === 'primary') {
          titleColor = primary;
        } else if (slide.colorAccent === 'secondary' || isHighlight) {
          titleColor = secondary;
        }

        // Draw Title
        const titleFontSize = isHighlight ? Math.round(baseTitleSize * 1.1) : baseTitleSize;
        ctx.font = `bold ${titleFontSize}px sans-serif`;
        ctx.fillStyle = titleColor;
        const afterTitleY = wrapText(ctx, slide.title || '', drawX, contentY, textMaxWidth, titleFontSize * 1.35);

        // Decorative horizontal rule line
        const ruleW = width * 0.09;
        const ruleH = Math.max(2, Math.round(height * 0.005));
        const ruleX = isCenter ? (width / 2 - ruleW / 2) : leftMargin;
        ctx.fillStyle = primary;
        ctx.fillRect(ruleX, afterTitleY + 14, ruleW, ruleH);

        // Draw Subtitle / Description
        const descFontSize = baseSubSize;
        ctx.font = `normal ${descFontSize}px sans-serif`;
        ctx.fillStyle = '#d4d4d4';
        wrapText(ctx, slide.subtitle || '', drawX, afterTitleY + 14 + ruleH + 22, textMaxWidth, descFontSize * 1.45);

        // 5. Glassmorphic Contact Card Footer Box
        const footerY = height * 0.86;
        const footerW = width * 0.88;
        const footerH = height * 0.09;
        const footerX = (width - footerW) / 2;

        // Draw glass card background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        drawRoundRect(ctx, footerX, footerY, footerW, footerH, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Footer text info
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        const contactFontSize = Math.max(10, Math.round(width * 0.024));
        ctx.font = `semibold ${contactFontSize}px sans-serif`;

        let contactX = footerX + 20;
        const contactTextY = footerY + footerH / 2 + contactFontSize * 0.35;

        if (brandProfile.whatsapp) {
          ctx.fillText(`💬 +${brandProfile.whatsapp}`, contactX, contactTextY);
          contactX += ctx.measureText(`💬 +${brandProfile.whatsapp}`).width + 30;
        }

        if (brandProfile.website) {
          ctx.fillStyle = '#a3a3a3';
          ctx.fillText(`🌐 ${brandProfile.website}`, contactX, contactTextY);
        }

        // Swipe guide text on right side of footer
        if (index < total - 1) {
          ctx.textAlign = 'right';
          ctx.fillStyle = primary;
          const guideFontSize = Math.max(10, Math.round(width * 0.022));
          ctx.font = `bold ${guideFontSize}px sans-serif`;
          ctx.fillText('Deslizar ➔', footerX + footerW - 20, contactTextY);
        }

        resolve(canvas);
      };

      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        let drawWidth = width, drawHeight = height, offsetX = 0, offsetY = 0;
        if (imgRatio > canvasRatio) { drawWidth = height * imgRatio; offsetX = (width - drawWidth) / 2; }
        else { drawHeight = width / imgRatio; offsetY = (height - drawHeight) / 2; }
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, 0, width, height);
        drawContent();
      };
      img.onerror = drawContent;
      img.src = nicheBackgroundUrl;
    });
  };

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '', currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY;
  }

  // ─── Export — Fix 3: uses getFormatDimensions helper ─────────────────────
  const exportAllSlides = async () => {
    if (!activeContent) return;
    const { width, height } = getFormatDimensions(activeContent.format);
    const slides = activeContent.slides_json;
    showToast(`Renderizando ${slides.length} imagen${slides.length > 1 ? 'es' : ''}...`, 'info');
    for (let i = 0; i < slides.length; i++) {
      const canvas = await renderSlideToCanvas(slides[i], i, slides.length, width, height);
      const link = document.createElement('a');
      link.download = `${activeContent.title.replace(/\s+/g, '_')}_slide_${i + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      await new Promise(r => setTimeout(r, 300));
    }
    showToast('¡Imágenes descargadas correctamente! ✓', 'success');
  };

  // ─── Vision Analysis — Fix 3: uses getFormatDimensions helper ─────────────
  const analyzeCurrentSlide = async () => {
    if (!activeContent) return;
    setLoadingVision(true);
    setVisionAnalysis("");
    try {
      const { width, height } = getFormatDimensions(activeContent.format);
      const slide = activeContent.slides_json[activeSlideIndex];
      if (!slide) return;
      const canvas = await renderSlideToCanvas(slide, activeSlideIndex, activeContent.slides_json.length, width, height);
      const res = await fetch(`${BACKEND_URL}/api/marketing/analyze-image`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: canvas.toDataURL('image/png'), contentType: activeContent.content_type, slideIndex: activeSlideIndex }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setVisionAnalysis(json.critique);
      } else {
        showToast(json.error || "No se pudo completar la auditoría.", 'error');
      }
    } catch {
      showToast("Error de red al analizar el post.", 'error');
    } finally {
      setLoadingVision(false);
    }
  };

  const formatMarkdownText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let content = line.trim();
      if (content.startsWith('#'))
        return <h6 key={idx} className="font-bold text-neutral-100 text-xs mt-3 mb-1">{content.replace(/^#+\s+/, '')}</h6>;
      const isBullet = content.startsWith('*') || content.startsWith('-') || content.startsWith('•');
      if (isBullet) content = content.replace(/^[\*\-•]\s+/, '');
      const parts = content.split('**');
      const formatted = parts.map((part, pIdx) =>
        pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-orange-400">{part}</strong> : part
      );
      if (isBullet) return (
        <div key={idx} className="flex gap-1.5 ml-2 mt-1">
          <span className="text-orange-500">•</span><span>{formatted}</span>
        </div>
      );
      return line.trim() === '' ? <div key={idx} className="h-1.5" /> : <p key={idx} className="mt-1">{formatted}</p>;
    });
  };

  // ─── Shared phone mockup props ────────────────────────────────────────────
  const phoneMockupProps: PhoneMockupProps = {
    brandProfile,
    activeContent,
    activeSlideIndex,
    nicheBackgroundUrl,
    onSlideChange: setActiveSlideIndex,
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950/20 text-neutral-100 font-sans">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold max-w-xs backdrop-blur-lg animate-in slide-in-from-bottom-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-300' :
          toast.type === 'error'   ? 'bg-rose-950/90 border-rose-700/50 text-rose-300' :
                                     'bg-neutral-900/90 border-neutral-700/50 text-neutral-300'
        }`}>
          {toast.type === 'success' && <CheckCircle size={15} />}
          {toast.type === 'error'   && <AlertCircle size={15} />}
          {toast.type === 'info'    && <Info size={15} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-sm text-neutral-200 mb-5 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-all">
                Cancelar
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="h-14 px-6 border-b border-neutral-800/60 bg-neutral-900/20 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <Megaphone size={14} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block leading-tight">Marketing Studio</span>
            <span className="text-[10px] text-neutral-500">Creación visual con IA</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-neutral-900/60 rounded-xl p-1 border border-neutral-800/50">
          {([
            { key: 'crear', label: 'Crear Post' },
            { key: 'mis_publicaciones', label: 'Mis Posts' },
            { key: 'marca', label: 'Mi Marca' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setSubSection(tab.key); if (tab.key === 'crear') setCreationStep(1); }}
              className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
                subSection === tab.key ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── DB Warning ── */}
      {dbNotMigrated && (
        <div className="bg-amber-950/20 border-b border-amber-900/30 py-2 px-6 flex items-center justify-between text-xs text-amber-400">
          <div className="flex items-center gap-2">
            <HelpCircle size={13} className="shrink-0" />
            <span><strong>Modo local:</strong> Los borradores se guardan en tu navegador.</span>
          </div>
          <button onClick={() => setDbNotMigrated(false)} className="text-[10px] font-bold hover:underline">Ocultar</button>
        </div>
      )}

      {/* ════════════════ SECCIÓN: CREAR ════════════════ */}
      {subSection === 'crear' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Stepper */}
          <div className="px-8 py-3 border-b border-neutral-800/40 bg-neutral-900/10 flex items-center shrink-0">
            {[
              { n: 1, label: 'Configurar IA' },
              { n: 2, label: 'Revisar y Editar' },
              { n: 3, label: 'Exportar' },
            ].map((step, i) => (
              <React.Fragment key={step.n}>
                <button
                  onClick={() => { if (activeContent || step.n === 1) setCreationStep(step.n as 1 | 2 | 3); }}
                  disabled={!activeContent && step.n > 1}
                  className="flex items-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                    creationStep === step.n  ? 'bg-orange-500 border-orange-500 text-white scale-110 shadow-md shadow-orange-500/30' :
                    creationStep > step.n   ? 'bg-emerald-600 border-emerald-600 text-white' :
                                              'bg-transparent border-neutral-700 text-neutral-500'
                  }`}>
                    {creationStep > step.n ? <Check size={12} /> : step.n}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block ${creationStep === step.n ? 'text-white' : 'text-neutral-500'}`}>
                    {step.label}
                  </span>
                </button>
                {i < 2 && (
                  <div className={`flex-1 h-px mx-3 transition-all ${creationStep > step.n ? 'bg-emerald-600/50' : 'bg-neutral-800'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── PASO 1: Formulario ── */}
          {creationStep === 1 && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
              <div className="max-w-2xl mx-auto space-y-8">

                {/* Tipo de contenido */}
                <div>
                  <h3 className="text-sm font-bold text-neutral-200 mb-4">¿Qué querés crear?</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: 'carrusel', label: 'Carrusel', desc: 'Múltiples slides', Icon: Layers },
                      { key: 'post_simple', label: 'Post Simple', desc: 'Una sola imagen', Icon: Image },
                      { key: 'reel', label: 'Reel / Story', desc: 'Guion de video', Icon: Video },
                    ] as const).map(({ key, label, desc, Icon }) => (
                      <button key={key} type="button"
                        onClick={() => setFormData(prev => ({ ...prev, contentType: key }))}
                        className={`p-4 rounded-2xl border text-left transition-all group ${
                          formData.contentType === key
                            ? 'bg-orange-950/30 border-orange-500/60 shadow-inner shadow-orange-500/10'
                            : 'bg-neutral-900/30 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <Icon size={20} className={formData.contentType === key ? 'text-orange-400 mb-2' : 'text-neutral-500 mb-2 group-hover:text-neutral-400'} />
                        <p className={`text-sm font-bold ${formData.contentType === key ? 'text-orange-300' : 'text-neutral-300'}`}>{label}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fix 6: Inicio rápido usa selectedNiche para highlighting, no formData.industry */}
                <div>
                  <h3 className="text-sm font-bold text-neutral-200 mb-1">Inicio rápido — Elegí tu rubro</h3>
                  <p className="text-xs text-neutral-500 mb-4">Pre-cargamos los campos para vos. Podés editarlos luego.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUICK_TEMPLATES.map(t => (
                      <button key={t.label} type="button"
                        onClick={() => {
                          setSelectedNiche(t.label); // Fix 6: track selection independently
                          setFormData(prev => ({
                            ...prev,
                            industry: t.industry,
                            goal: t.goal,
                            offer: t.offer,
                            benefits: t.benefits,
                            contentType: t.contentType,
                            title: prev.title || `Campaña ${t.label}`,
                          }));
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          selectedNiche === t.label // Fix 6: compare against selectedNiche
                            ? 'bg-orange-950/30 border-orange-500/50 text-orange-300'
                            : 'bg-neutral-900/30 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <span className="text-base">{t.icon}</span>
                        {t.label}
                        {selectedNiche === t.label && <Check size={11} className="ml-auto text-orange-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formulario principal */}
                <form onSubmit={handleGenerate} className="space-y-5">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Rubro (editable)</label>
                    <input type="text"
                      placeholder="Ej: Gimnasio, Inmobiliaria, Restaurante..."
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Oferta o Mensaje Principal</label>
                    <textarea required
                      placeholder="Ej: 20% de descuento en la matrícula durante Julio."
                      value={formData.offer}
                      onChange={(e) => setFormData(prev => ({ ...prev, offer: e.target.value }))}
                      rows={3}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Objetivo</label>
                      <select value={formData.goal}
                        onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                        className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-orange-600">
                        <option>Conseguir leads</option>
                        <option>Promocionar oferta</option>
                        <option>Mostrar testimonios</option>
                        <option>Tips educativos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Tono</label>
                      <select value={formData.tone}
                        onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
                        className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-orange-600">
                        <option>Motivador</option>
                        <option>Profesional</option>
                        <option>Divertido</option>
                        <option>Urgente</option>
                        <option>Premium</option>
                      </select>
                    </div>
                  </div>

                  {/* Opciones avanzadas colapsables */}
                  <div className="border border-neutral-800 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/30 transition-all">
                      <span>Opciones avanzadas (CTA, beneficios, formato...)</span>
                      {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showAdvanced && (
                      <div className="p-4 border-t border-neutral-800 space-y-4 bg-neutral-950/30">
                        <div>
                          <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Nombre de Campaña (CRM)</label>
                          <input type="text" placeholder="Ej: Promo Julio 2025"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Beneficios (opcional)</label>
                          <textarea placeholder="Ej: Seguimiento continuo, entrenadores certificados."
                            value={formData.benefits}
                            onChange={(e) => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
                            rows={2}
                            className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 placeholder-neutral-600 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Llamado a la Acción (CTA)</label>
                          <input type="text"
                            value={formData.cta}
                            onChange={(e) => setFormData(prev => ({ ...prev, cta: e.target.value }))}
                            className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Formato</label>
                            <select value={formData.format}
                              onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                              className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600">
                              <option value="1080x1350">Vertical 4:5 (Feed)</option>
                              <option value="1080x1080">Cuadrado 1:1</option>
                              <option value="1080x1920">Story / Reel 9:16</option>
                              <option value="1200x630">Horizontal 1.91:1</option>
                            </select>
                          </div>
                          {formData.contentType === 'carrusel' && (
                            <div>
                              <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Nº de Slides</label>
                              <input type="number" min={3} max={10}
                                value={formData.slidesCount}
                                onChange={(e) => setFormData(prev => ({ ...prev, slidesCount: parseInt(e.target.value) || 5 }))}
                                className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                              />
                            </div>
                          )}
                          {formData.contentType === 'reel' && (
                            <div>
                              <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Duración (seg.)</label>
                              <input type="number" min={5} max={60}
                                value={formData.duration}
                                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 15 }))}
                                className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={generating || !formData.offer.trim()}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                    {generating ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /><span>Generando propuesta de IA...</span></>
                    ) : (
                      <><Sparkles size={16} /><span>Generar con IA</span><ArrowRight size={16} className="ml-1" /></>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── PASO 2: Editor ── */}
          {creationStep === 2 && activeContent && (
            <div className="flex-1 flex overflow-hidden">

              {/* Panel izquierdo */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                {/* Title + actions */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-bold text-white leading-tight">{activeContent.title}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Editá los textos y el estilo de cada slide.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => saveContentDraft(activeContent)} disabled={savingContent}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all">
                      <Save size={12} />{savingContent ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button onClick={() => setCreationStep(3)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow shadow-orange-500/20">
                      Exportar <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* Slide selector */}
                {activeContent.slides_json.length > 1 && (
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Slides</label>
                    <div className="flex flex-wrap gap-2">
                      {activeContent.slides_json.map((slide: any, idx: number) => (
                        <button key={idx} onClick={() => setActiveSlideIndex(idx)}
                          className={`w-9 h-9 rounded-xl font-bold text-xs border transition-all ${
                            activeSlideIndex === idx
                              ? 'bg-orange-600 border-orange-500 text-white shadow shadow-orange-500/30 scale-110'
                              : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slide editor */}
                <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="font-semibold text-sm text-neutral-200">
                      {activeContent.slides_json.length > 1 ? `Slide ${activeSlideIndex + 1}` : 'Contenido'}
                    </h5>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
                      {activeContent.slides_json[activeSlideIndex]?.role || activeContent.content_type}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Título principal</label>
                    <textarea
                      value={activeContent.content_type === 'carrusel'
                        ? activeContent.slides_json[activeSlideIndex]?.title || ''
                        : activeContent.slides_json[activeSlideIndex]?.textOnScreen || ''}
                      onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">
                      {activeContent.content_type === 'carrusel' ? 'Subtítulo' : 'Locución (Voz en off)'}
                    </label>
                    <textarea
                      value={activeContent.content_type === 'carrusel'
                        ? activeContent.slides_json[activeSlideIndex]?.subtitle || ''
                        : activeContent.slides_json[activeSlideIndex]?.voiceOver || ''}
                      onChange={(e) => handleUpdateSlideField('subtitle', e.target.value)}
                      rows={2}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                    />
                  </div>

                  {activeContent.content_type === 'carrusel' && (
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Layout del slide</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['left', 'center', 'highlight'] as const).map(style => (
                          <button key={style} type="button"
                            onClick={() => handleUpdateSlideField('layoutStyle', style)}
                            className={`py-2 px-2 text-[11px] font-bold rounded-xl border capitalize transition-all ${
                              activeContent.slides_json[activeSlideIndex]?.layoutStyle === style
                                ? 'bg-orange-950/30 border-orange-500/70 text-orange-400'
                                : 'bg-neutral-950/30 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                            }`}>
                            {style === 'left' ? '⬅ Izquierda' : style === 'center' ? '↔ Centrado' : '★ Destacado'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeContent.slides_json[activeSlideIndex]?.visualSuggestion && (
                    <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/60">
                      <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">💡 Sugerencia visual de la IA</span>
                      <span className="text-[11px] text-neutral-400 italic leading-relaxed">
                        {activeContent.slides_json[activeSlideIndex]?.visualSuggestion}
                      </span>
                    </div>
                  )}
                </div>

                {/* Caption y Hashtags */}
                <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 space-y-3">
                  <h5 className="font-semibold text-xs text-neutral-300 flex items-center gap-1.5">
                    <Share2 size={12} className="text-orange-500" /> Caption del Post
                  </h5>
                  <textarea
                    value={activeContent.caption}
                    onChange={(e) => setActiveContent({ ...activeContent, caption: e.target.value })}
                    rows={4}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 resize-none transition-colors"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {activeContent.hashtags_json?.map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel derecho: Mockup fijo */}
              <div className="w-[420px] shrink-0 border-l border-neutral-800/40 overflow-y-auto custom-scrollbar flex flex-col items-center p-6 gap-5 bg-neutral-900/10">
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider self-start">Vista Previa Móvil</p>
                <div className="sticky top-0">
                  <PhoneMockup {...phoneMockupProps} />
                </div>

                {/* GPT Vision */}
                {(activeContent.content_type === 'carrusel' || activeContent.content_type === 'post_simple') && (
                  <div className="w-full space-y-3">
                    <button type="button" onClick={analyzeCurrentSlide} disabled={loadingVision}
                      className="w-full py-2.5 rounded-xl bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {loadingVision
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Analizando con IA...</span></>
                        : <><Sparkles size={13} /><span>Auditar con GPT Vision</span></>}
                    </button>
                    {visionAnalysis && (
                      <div className="bg-neutral-950/60 border border-neutral-900 rounded-xl p-4 text-[11px] leading-relaxed max-h-[280px] overflow-y-auto custom-scrollbar space-y-1 select-text">
                        <h5 className="font-bold text-neutral-200 border-b border-neutral-800 pb-1.5 flex items-center gap-1.5 text-xs">
                          <Sparkles size={11} className="text-orange-500" /> Análisis — Slide {activeSlideIndex + 1}
                        </h5>
                        <div className="text-neutral-300">{formatMarkdownText(visionAnalysis)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PASO 3: Exportar ── */}
          {creationStep === 3 && activeContent && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">¡Listo para publicar!</h3>
                      <p className="text-xs text-neutral-400">Descargá las imágenes y copiá el caption para Instagram.</p>
                    </div>

                    <div className="space-y-3">
                      {(activeContent.content_type === 'carrusel' || activeContent.content_type === 'post_simple') && (
                        <button onClick={exportAllSlides}
                          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-2xl text-sm font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all">
                          <Download size={16} />
                          {activeContent.content_type === 'carrusel'
                            ? `Descargar ${activeContent.slides_json.length} Slides (PNG)`
                            : 'Descargar Post (PNG)'}
                        </button>
                      )}

                      <button onClick={() => saveContentDraft(activeContent)} disabled={savingContent}
                        className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                        <Save size={15} />{savingContent ? 'Guardando...' : 'Guardar en Mis Posts'}
                      </button>

                      <button
                        onClick={() => {
                          const text = `${activeContent.caption}\n\n${activeContent.hashtags_json?.join(' ')}`;
                          navigator.clipboard.writeText(text);
                          showToast('Caption copiado al portapapeles ✓', 'success');
                        }}
                        className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all">
                        <Copy size={15} /> Copiar Caption + Hashtags
                      </button>

                      {/* Fix 7: reset activeSlideIndex when going back to edit */}
                      <button
                        onClick={() => {
                          const maxIdx = activeContent.slides_json.length - 1;
                          setActiveSlideIndex(prev => Math.min(prev, maxIdx));
                          setCreationStep(2);
                        }}
                        className="w-full py-2.5 rounded-xl text-neutral-500 hover:text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1 transition-all">
                        <ChevronLeft size={13} /> Volver a editar
                      </button>
                    </div>

                    {/* Caption preview */}
                    <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Caption generado</p>
                      <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line line-clamp-6">{activeContent.caption}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {activeContent.hashtags_json?.slice(0, 8).map((tag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono">{tag}</span>
                        ))}
                        {(activeContent.hashtags_json?.length || 0) > 8 && (
                          <span className="text-[10px] text-neutral-600">+{activeContent.hashtags_json.length - 8} más</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mockup */}
                  <div className="flex flex-col items-center gap-4">
                    <PhoneMockup {...phoneMockupProps} />
                    {activeContent.slides_json.length > 1 && (
                      <div className="flex gap-2">
                        <button onClick={() => setActiveSlideIndex(p => Math.max(0, p - 1))}
                          disabled={activeSlideIndex === 0}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-400 disabled:opacity-30 flex items-center gap-1">
                          <ChevronLeft size={13} /> Anterior
                        </button>
                        <button onClick={() => setActiveSlideIndex(p => Math.min(activeContent.slides_json.length - 1, p + 1))}
                          disabled={activeSlideIndex === activeContent.slides_json.length - 1}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-400 disabled:opacity-30 flex items-center gap-1">
                          Siguiente <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {(creationStep === 2 || creationStep === 3) && !activeContent && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/20 mb-5">
                <Sparkles size={26} className="text-white" />
              </div>
              <h2 className="text-base font-semibold text-white mb-2">Aún no generaste contenido</h2>
              <p className="text-xs text-neutral-400 mb-5 max-w-xs">Completá el formulario en el Paso 1 para que la IA genere tu propuesta.</p>
              <button onClick={() => setCreationStep(1)}
                className="px-5 py-2.5 rounded-xl bg-orange-600/20 border border-orange-500/40 text-orange-400 text-xs font-semibold">
                Ir al Paso 1
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ SECCIÓN: MIS PUBLICACIONES ════════════════ */}
      {subSection === 'mis_publicaciones' && (
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <h3 className="font-bold text-sm text-neutral-300 uppercase tracking-wider mb-6 flex items-center gap-1.5 border-b border-neutral-800 pb-3">
            <FileText size={15} className="text-orange-500" /> Mis Publicaciones ({savedContents.length})
          </h3>

          {loadingContents ? (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-400 gap-2">
              <RefreshCw className="animate-spin text-orange-500" size={18} />
              <span className="text-xs">Cargando publicaciones...</span>
            </div>
          ) : savedContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 h-64 border border-dashed border-neutral-800 rounded-2xl">
              <FileText className="text-neutral-700 mb-3" size={32} />
              <p className="text-sm font-semibold text-neutral-400 mb-1">Aún no guardaste ningún post</p>
              <p className="text-xs mb-4">Creá uno y guardá el borrador desde el Paso 2.</p>
              <button onClick={() => { setSubSection('crear'); setCreationStep(1); }}
                className="px-4 py-2 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-xl text-xs font-semibold">
                Crear mi primer post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedContents.map(post => (
                <div key={post.id} className="bg-neutral-900/40 border border-neutral-800/80 hover:border-orange-500/30 p-4 rounded-2xl flex flex-col justify-between transition-all duration-300">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-950/60 border border-neutral-800 text-orange-400 font-semibold uppercase">{post.content_type}</span>
                      <span className="text-[10px] text-neutral-500">{post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Borrador'}</span>
                    </div>
                    <h4 className="font-bold text-sm text-neutral-200 mb-1 line-clamp-1">{post.title}</h4>
                    <p className="text-[11px] text-neutral-500 line-clamp-2 italic mb-4">{post.caption}</p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-neutral-800/40">
                    <button
                      onClick={() => {
                        setActiveContent(post);
                        setActiveSlideIndex(0); // Fix 7: always start from slide 0 when opening a saved post
                        setCreationStep(2);
                        setSubSection('crear');
                      }}
                      className="flex-1 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold border border-neutral-800 text-center transition-all">
                      Editar Post
                    </button>
                    <button onClick={() => deleteContentDraft(post.id!)}
                      className="p-1.5 rounded-xl bg-neutral-950 hover:bg-rose-950/20 text-neutral-500 hover:text-rose-400 border border-neutral-800 transition-all" title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ════════════════ SECCIÓN: MI MARCA ════════════════ */}
      {subSection === 'marca' && (
        <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar flex justify-center">
          <div className="w-full max-w-xl space-y-6">
            <div className="border-b border-neutral-800 pb-4">
              <h3 className="font-bold text-sm text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={15} className="text-orange-500" /> Identidad Visual de Marca
              </h3>
              <p className="text-xs text-neutral-500 mt-1">Estos datos se usan automáticamente en cada generación de IA.</p>
            </div>

            {loadingBrand ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
                <RefreshCw className="animate-spin text-orange-500" size={18} />
                <span className="text-xs">Cargando perfil de marca...</span>
              </div>
            ) : (
              <form onSubmit={saveBrandProfile} className="space-y-4 bg-neutral-900/30 border border-neutral-800/80 rounded-2xl p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Nombre Comercial</label>
                    <input type="text" required placeholder="Ej: PowerFit Gym"
                      value={brandProfile.business_name}
                      onChange={(e) => setBrandProfile(prev => ({ ...prev, business_name: e.target.value }))}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Rubro por Defecto</label>
                    <input type="text" placeholder="Ej: Gimnasio"
                      value={brandProfile.industry}
                      onChange={(e) => setBrandProfile(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: 'Color Principal', key: 'primary_color' as const },
                    { label: 'Color Secundario', key: 'secondary_color' as const },
                    { label: 'Fondo de Post', key: 'background_color' as const },
                  ]).map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded border border-neutral-700" style={{ backgroundColor: brandProfile[key] }} />
                        {label}
                      </label>
                      <input type="color" value={brandProfile[key]}
                        onChange={(e) => setBrandProfile(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full h-10 bg-neutral-950/60 border border-neutral-800 rounded-xl cursor-pointer p-1"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">WhatsApp (con código)</label>
                    <input type="text" placeholder="Ej: 5491162838106"
                      value={brandProfile.whatsapp}
                      onChange={(e) => setBrandProfile(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Sitio Web</label>
                    <input type="text" placeholder="www.minegocio.com"
                      value={brandProfile.website}
                      onChange={(e) => setBrandProfile(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Tono de Comunicación</label>
                  <select value={brandProfile.default_tone}
                    onChange={(e) => setBrandProfile(prev => ({ ...prev, default_tone: e.target.value }))}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600">
                    <option>Motivador</option>
                    <option>Profesional</option>
                    <option>Divertido</option>
                    <option>Urgente</option>
                    <option>Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">URL del Logo (opcional)</label>
                  <input type="text" placeholder="https://ejemplo.com/logo.png"
                    value={brandProfile.logo_url}
                    onChange={(e) => setBrandProfile(prev => ({ ...prev, logo_url: e.target.value }))}
                    className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-200 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-orange-600 transition-colors"
                  />
                </div>

                <button type="submit" disabled={savingBrand || !brandProfile.business_name}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Save size={13} />{savingBrand ? 'Guardando...' : 'Guardar Marca'}
                </button>
              </form>
            )}
          </div>
        </main>
      )}

    </div>
  );
}
