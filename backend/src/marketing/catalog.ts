/**
 * Catálogo cerrado + límites globales de Marketing Studio.
 * Fuente única de verdad — refleja las secciones 7 y 8 del CLAUDE.md del agente.
 * El agente solo puede elegir recursos que estén acá (base) o en el nicho (extensiones).
 */

// ── Límites globales (sección 7) ──────────────────────────────────
export const LIMITS = {
  defaultDurationSeconds: 35,
  minimumDurationSeconds: 15,
  maximumDurationSeconds: 60,
  defaultAspectRatio: '9:16',
  defaultResolution: '1080x1920',
  defaultFps: 30,
  maximumScenes: 9,
  minimumSceneDurationSeconds: 1.5,
  maximumSceneDurationSeconds: 6,
  maximumCharactersPerScene: 3,
  maximumObjectsPerScene: 6,
  maximumSubtitleLines: 2,
  maximumSubtitleCharactersPerLine: 38,
} as const;

// ── Estilos visuales (sección 8.1) ────────────────────────────────
export const VISUAL_STYLES = [
  'illustrated-realistic',
  '3d-render',
  'live-action-stock',
  'ai-generated-video',
  'ai-avatar-presenter',
  'motion-graphics',
] as const;
export type VisualStyle = (typeof VISUAL_STYLES)[number];

// ── Catálogo base (sección 8) ─────────────────────────────────────
export const BASE_CHARACTERS = [
  'business_owner', 'customer', 'employee', 'salesperson', 'receptionist', 'ai_assistant',
];

export const BASE_ACTIONS = [
  'idle', 'walk', 'run', 'talk', 'think', 'wait', 'type',
  'check_phone', 'answer_phone', 'point', 'celebrate', 'pay',
  'receive_message', 'send_message', 'look_confused', 'look_worried',
];

export const BASE_EXPRESSIONS = [
  'neutral', 'happy', 'sad', 'angry', 'confused', 'worried', 'surprised', 'excited', 'tired',
];

export const BASE_BACKGROUNDS = [
  'white_minimal', 'dark_minimal', 'office', 'shop', 'reception',
  'phone_interface', 'crm_dashboard', 'abstract_technology',
];

export const TRANSITIONS = [
  'cut', 'fade', 'slide_left', 'slide_right', 'zoom_in', 'zoom_out',
];

export const CAMERAS = ['wide', 'medium', 'close', 'closeup'];
export const POSITIONS = ['left', 'center', 'right'];

// ── Capa de PRODUCCIÓN VISUAL (genérica, igual en todos los nichos) ──
// El propósito de la escena define QUÉ componente visual la muestra; lo que
// cambia por nicho es solo el contenido (textos de las burbujas, la query, etc.).
export const PURPOSES = ['hook', 'problem', 'solution', 'benefit', 'cta'] as const;
export type Purpose = (typeof PURPOSES)[number];

export const VISUAL_TYPES = [
  'stock',            // footage/foto real de Pexels (con tratamiento)
  'chat_mockup',      // simulación de chat de WhatsApp (burbujas)
  'dashboard',        // métricas / panel
  'end_card',         // placa final con el CTA
  'screen_recording', // demo / captura de pantalla (cae a stock si no hay)
] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];

export const KEN_BURNS = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'none'] as const;

// Mapeo recomendado propósito → tipos visuales válidos (guía para el agente).
export const PURPOSE_VISUAL_MAP: Record<Purpose, VisualType[]> = {
  hook: ['stock'],
  problem: ['chat_mockup', 'stock'],
  solution: ['chat_mockup', 'screen_recording'],
  benefit: ['dashboard', 'stock'],
  cta: ['end_card'],
};

/** Extensiones que aporta un nicho (assets.json). */
export interface NicheAssets {
  niche: string;
  characters?: string[];
  backgrounds?: string[];
  actions?: string[];
  objects?: string[];
  expressions?: string[];
}

/** Catálogo efectivo = base + extensiones del nicho. */
export function effectiveCatalog(nicheAssets?: NicheAssets) {
  return {
    characters: [...BASE_CHARACTERS, ...(nicheAssets?.characters ?? [])],
    actions: [...BASE_ACTIONS, ...(nicheAssets?.actions ?? [])],
    expressions: [...BASE_EXPRESSIONS, ...(nicheAssets?.expressions ?? [])],
    backgrounds: [...BASE_BACKGROUNDS, ...(nicheAssets?.backgrounds ?? [])],
    objects: [...(nicheAssets?.objects ?? [])],
    transitions: [...TRANSITIONS],
    cameras: [...CAMERAS],
    positions: [...POSITIONS],
    styles: [...VISUAL_STYLES],
  };
}
