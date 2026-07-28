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
  txnId: string;
  /** Base64-encoded JPEG of the captured face. Only returned if liveness passed. */
  capturedFaceBase64?: string;
  provider: string;
  usedFallback: boolean;
  score?: number;
  breakdown?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
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
  txn_id: string;
  captured_face?: string;
  provider: string;
  used_fallback: boolean;
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
