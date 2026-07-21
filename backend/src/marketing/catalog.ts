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
