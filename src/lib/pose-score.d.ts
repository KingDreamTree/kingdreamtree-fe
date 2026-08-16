/** Type declarations for the backend-provided pose-score.js (verbatim copy — do not edit the .js). */

export type PosePoint = { x: number; y: number; z?: number; visibility?: number }
export type PoseLandmarkPoint = PosePoint
export type PoseLandmarks = PosePoint[]

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

export type PoseEvaluation = EvaluateResult

export interface HoldGate {
  (ok: boolean): boolean
  /** 0~1 progress for the "about to capture" bar. */
  progress: number
  n_hold: number
}

export declare const MESSAGES: Record<string, string>

/** 이 계산이 쓰는 MediaPipe 랜드마크 인덱스 (shoulderL, hipR, ankleL, …). */
export declare const IDX: Record<string, number>
/** 재는 방향 8개 — [이름, 시작 인덱스, 끝 인덱스]. 스켈레톤 그리기에도 쓴다. */
export declare const SEGMENTS: Array<[string, number, number]>

export declare function evaluate(
  ref: PoseLandmarks,
  user: PoseLandmarks,
  criteria: PoseCriteria,
  opts?: { multiPerson?: boolean; refAspect?: number; userAspect?: number },
): EvaluateResult

/** MediaPipe 33개 중 좌/우 쌍 인덱스. */
export declare const LR_PAIRS: Array<[number, number]>

/** 랜드마크 좌우반전 — x 반전 + 좌/우 이름표 스왑. */
export declare function mirrorLandmarks(lm: PoseLandmarks): PoseLandmarks

export interface EvaluateEitherWayResult extends EvaluateResult {
  /** 거울 방향으로 매칭됐는가 (표시용 — 업로드 값·좌표는 원본 그대로). */
  mirroredReference: boolean
}

/** 정방향/거울 방향 중 더 잘 맞는 쪽으로 판정. 실시간 촬영은 evaluate 대신 이것. */
export declare function evaluateEitherWay(
  ref: PoseLandmarks,
  user: PoseLandmarks,
  criteria: PoseCriteria,
  opts?: { multiPerson?: boolean; refAspect?: number; userAspect?: number },
): EvaluateEitherWayResult

export declare function createHoldGate(criteria: PoseCriteria): HoldGate

export declare function fetchCriteria(baseUrl?: string): Promise<PoseCriteria>
