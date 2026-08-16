/** Type declarations for the backend-provided pose-score.js (verbatim copy — do not edit the .js). */

export interface PoseLandmarkPoint {
  x: number
  y: number
  z?: number
  visibility?: number
}

export type PoseLandmarks = PoseLandmarkPoint[]

/** Response of GET /pose-criteria. Numbers may change server-side — never hardcode. */
export interface PoseCriteria {
  threshold: number
  hard_tol_deg: number
  tol_deg: number
  f_min: number
  f_hard: number
  n_hold: number
  min_visibility: number
  min_visible_angles: number
  min_seg_ratio: number
  [key: string]: unknown
}

export type GuideReason =
  | 'MULTI_PERSON'
  | 'NOT_ENOUGH_JOINTS'
  | 'FRAMING'
  | 'TOO_CLOSE'
  | 'TOO_FAR'
  | 'POSE'

export interface EvaluateResult {
  pose_similarity: number
  framing_score: number
  facing_delta: number
  /** Auto-shutter condition: server would not reject this frame. */
  pass: boolean
  /** Uploading now would be rejected by the server (gallery upload path). */
  blocked: boolean
  reason: GuideReason | null
  blockReason: Exclude<GuideReason, 'TOO_CLOSE' | 'TOO_FAR'> | null
  /** User-facing message, safe to display as-is. */
  message: string
  oks: number
  detail: {
    usedAngles: number
    diffs: Record<string, number>
    poseReason: string | null
    torsoRatio: number
    oksUsed: number
    oksPer: Record<string, number>
  }
}

export interface HoldGate {
  (ok: boolean): boolean
  /** 0~1 progress for the "about to capture" bar. */
  progress: number
  n_hold: number
}

export declare const MESSAGES: Record<string, string>

export declare function evaluate(
  ref: PoseLandmarks,
  user: PoseLandmarks,
  criteria: PoseCriteria,
  opts?: { multiPerson?: boolean; refAspect?: number; userAspect?: number },
): EvaluateResult

export declare function createHoldGate(criteria: PoseCriteria): HoldGate

export declare function fetchCriteria(baseUrl?: string): Promise<PoseCriteria>
