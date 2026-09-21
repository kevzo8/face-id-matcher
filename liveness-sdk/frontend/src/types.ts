export type LivenessMode = 'active' | 'passive';

export interface SviLivenessConfig {
  /** SVI Liveness Backend URL (e.g. 'https://api.svi.com' or 'http://localhost:8000') */
  backendUrl: string;
  /** Client API key (leave empty in dev mode) */
  apiKey?: string;
  /** Liveness mode */
  mode: LivenessMode;
  /** DOM element ID or selector to mount the camera UI */
  containerId: string;
  /** Called when liveness completes successfully */
  onComplete: (result: LivenessResult) => void;
  /** Called when an error occurs */
  onError: (error: SdkError) => void;
  /** Optional theme overrides */
  theme?: SviLivenessTheme;
}

export interface SviLivenessTheme {
  primaryColor?: string;
  buttonText?: string;
  accentColor?: string;
}

export interface LivenessResult {
  passed: boolean;
  confidence: number;
  /** Unique transaction ID (UUIDv4) — one per liveness check. */
  transactionId: string;
  /** Session this transaction belongs to — use with transactionId for tracing. */
  sessionId?: string;
  /** Base64-encoded JPEG of the captured face. Only returned if liveness passed. */
  capturedFaceBase64?: string;
  provider: string;
  usedFallback: boolean;
  score?: number;
  /** Cut-off applied server-side: passed is (score >= threshold). Present on backend verdicts. */
  threshold?: number;
  /** Scale ceiling for score/threshold (passive: 16, active: 100). Present on backend verdicts. */
  maxScore?: number;
  breakdown?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
  /** Why the photo was rejected (no face / spoof labels / low score). Set on backend verdicts. */
  rejectionReason?: string;
  /** Scene labels behind the verdict with confidences. Set on backend verdicts. */
  detectedLabels?: { label: string; confidence: number }[];
}

export interface SdkError {
  code: string;
  message: string;
}

export interface SessionResponse {
  session_id: string;
  expires_at: string;
}

export interface LivenessApiResponse {
  passed: boolean;
  confidence: number;
  transaction_id: string;
  session_id: string;
  score: number;
  threshold: number;
  max_score: number;
  captured_face?: string;
  provider: string;
  used_fallback: boolean;
  rejection_reason?: string;
  detected_labels?: { label: string; confidence: number }[];
  breakdown?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
  error?: string;
}

export interface PassiveApiResponse {
  is_real: boolean;
  confidence: number;
  score: number;
  details?: string;
  breakdown?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
  error?: string;
}
