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
  /** 레퍼런스에서 보이는 세그먼트 중 사용자 쪽에서도 보여야 하는 비율 (2026-08-16 추가). */
  min_ref_coverage: number
  [key: string]: unknown
}

export type GuideReason =
  | 'MULTI_PERSON'
  | 'NOT_ENOUGH_JOINTS'
  | 'REF_PARTS_MISSING'
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

/**
 * 랜드마크 좌우반전 — x 반전 + 좌/우 이름표 스왑.
 * 실시간 촬영의 거울 판정·거울 저장(사진과 세트 반전), 갤러리 거울 사진 판정에 쓴다.
 */
export declare function mirrorLandmarks(lm: PoseLandmarks): PoseLandmarks

/**
 * 갤러리 업로드가 정방향 판정에서 자세(POSE) 사유로 떨어졌을 때, 거울 기준이면
 * 통과하는지 검사 — true면 MESSAGES.MIRROR_SUSPECTED를 띄우고 거울 체크박스를
 * 유도한다. ⚠️ 판정을 몰래 거울로 바꿔 통과시키지 말 것 (방향 전환은 사용자
 * 신고 → is_mirrored=true 재업로드로만).
 */
export declare function mirrorSuspected(
  ref: PoseLandmarks,
  user: PoseLandmarks,
  criteria: PoseCriteria,
  opts?: { multiPerson?: boolean; refAspect?: number; userAspect?: number },
): boolean

export declare function createHoldGate(criteria: PoseCriteria): HoldGate

export declare function fetchCriteria(baseUrl?: string): Promise<PoseCriteria>
