/**
 * REFIT API client.
 *
 * The browser only calls the versioned API base URL. `/health` deliberately
 * lives outside this client because it is the one endpoint without `/api/v1`.
 */
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

export const API_BASE_URL = (configuredBaseUrl || 'https://api.refit.live/api/v1').replace(/\/$/, '')

const USER_ID_KEY = 'refit.user-id'
const ACTIVE_SESSION_KEY = 'refit.active-session-id'
// 마지막 사용자 사진이 어느 파이프라인으로 올라갔는가 (웹캠 촬영=quick · 갤러리=full).
// ⚠️ localStorage 인 이유: 분석 대기 중 새로고침하면 state 는 'full' 로 초기화되는데,
//    퀵 세션(세그 잡 없음)에 full 분석을 걸면 세그 대기 409 를 «기다리라»로 읽는
//    kickOff 가 영원히 돈다. 세션 복원과 같은 수명으로 남긴다.
const ANALYSIS_MODE_KEY = 'refit.analysis-mode'

export type ApiErrorPayload = {
  code?: string
  message?: string
  detail?: unknown
}

export class RefitApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly detail?: unknown

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || `요청을 처리하지 못했습니다. (${status})`)
    this.name = 'RefitApiError'
    this.status = status
    this.code = payload.code
    this.detail = payload.detail
  }
}

/**
 * 사용자에게 보여줄 에러 문구.
 *
 * 400도 서버 문구가 있으면 그대로 보여준다 — 백엔드는 사용자 행동이 필요한
 * 반려("결과지 이미지는 1~5장이어야 합니다" 등)에도 400을 쓰기 때문에, 일괄
 * fallback으로 덮으면 원인을 알 수 없는 화면이 된다 (2026-08-17 실측: 인바디
 * PATCH 반려 문구가 전부 숨겨져 디버깅이 막혔다). 서버 문구가 없을 때만 fallback.
 */
export function userFacingMessage(error: unknown, fallback: string): string {
  if (error instanceof RefitApiError) {
    if (error.status === 400 || error.code === 'INVALID_REQUEST') {
      console.error('[api] 400/INVALID_REQUEST:', error.code, error.message, error.detail)
      return error.message || fallback
    }
    return error.message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export type User = { user_id: string; is_pro_user: boolean; created_at: string }
export type Session = { session_id: string; status: string; reference_source: 'USER_UPLOAD' | 'PRESET'; contraindications?: unknown[]; created_at: string }
export type ActiveSession = Session & { steps: Record<string, unknown> }
export type PoseScaleBasis = 'TORSO' | 'HIP_KNEE'
export type CaptureSource = 'CAPTURE' | 'UPLOAD'
export type PoseLandmark = { x: number; y: number; z?: number; visibility?: number }
export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
/** stalled 는 서버 모니터링용이다 — 프론트는 읽지 않는다. AnalysisProgress.stalled 주석 참고. */
export type Job = { job_id: string; session_id: string; kind: string; status: JobStatus; attempts: number; stalled?: boolean; result?: Record<string, unknown> | null; error?: string | null }
export type JobSummary = { job_id: string; kind: string; status: JobStatus; attempts: number; created_at: string }

function asApiErrorPayload(value: unknown): ApiErrorPayload {
  if (!value || typeof value !== 'object') return {}
  const data = value as { error?: ApiErrorPayload; detail?: unknown }
  if (data.error) return data.error
  if (typeof data.detail === 'string') return { message: data.detail, detail: data.detail }
  return { detail: data.detail }
}

async function request<T>(path: string, init: RequestInit = {}, requiresUser = true): Promise<T> {
  const headers = new Headers(init.headers)
  const userId = getStoredUserId()
  if (requiresUser && userId) headers.set('X-User-Id', userId)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    let value: unknown
    try { value = await response.json() } catch { value = undefined }
    throw new RefitApiError(response.status, asApiErrorPayload(value))
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getStoredUserId() { return localStorage.getItem(USER_ID_KEY) }
export function getStoredSessionId() { return localStorage.getItem(ACTIVE_SESSION_KEY) }

export type AnalysisMode = 'full' | 'quick'
/** 저장값이 없거나 이상하면 full — 기존 세그 파이프라인이 언제나 기본이다. */
export function getStoredAnalysisMode(): AnalysisMode { return localStorage.getItem(ANALYSIS_MODE_KEY) === 'quick' ? 'quick' : 'full' }
export function setStoredAnalysisMode(mode: AnalysisMode) { localStorage.setItem(ANALYSIS_MODE_KEY, mode) }

export function clearStoredIdentity() {
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(ACTIVE_SESSION_KEY)
  localStorage.removeItem(ANALYSIS_MODE_KEY)
}

export async function createUser() {
  const user = await request<User>('/users', { method: 'POST' }, false)
  localStorage.setItem(USER_ID_KEY, user.user_id)
  return user
}

export async function getActiveSession() {
  return request<ActiveSession>('/sessions/active')
}

export async function createSession() {
  const session = await request<Session>('/sessions', { method: 'POST' })
  localStorage.setItem(ACTIVE_SESSION_KEY, session.session_id)
  return session
}

/** Restores one in-progress session, or creates the anonymous user/session pair. */
export async function ensureActiveSession(): Promise<Session | ActiveSession> {
  if (!getStoredUserId()) await createUser()

  try {
    const active = await getActiveSession()
    localStorage.setItem(ACTIVE_SESSION_KEY, active.session_id)
    return active
  } catch (error) {
    if (!(error instanceof RefitApiError)) throw error
    // No active session and an invalid locally retained user id can both be
    // reported by the active-session endpoint. Creating a session separates
    // them without discarding a valid anonymous identity.
    if (error.status !== 404 && error.status !== 422) throw error
    try {
      return await createSession()
    } catch (createError) {
      if (!(createError instanceof RefitApiError)) throw createError
      // 409 ACTIVE_SESSION_EXISTS: a session already exists server-side (race,
      // or the earlier active lookup failed for an unrelated reason). The server
      // tells us to continue with it — re-fetch instead of surfacing an error.
      if (createError.status === 409) {
        const active = await getActiveSession()
        localStorage.setItem(ACTIVE_SESSION_KEY, active.session_id)
        return active
      }
      if (createError.status !== 404) throw createError
      // A reset backend can invalidate the locally persisted anonymous id.
      clearStoredIdentity()
      await createUser()
      return createSession()
    }
  }
}

export function getPoseCriteria() {
  return request<Record<string, unknown>>('/pose-criteria', {}, false)
}

export function getBodyParts() {
  return request<Record<string, unknown>>('/body-parts', {}, false)
}

export function uploadReferencePhoto(sessionId: string, input: {
  file: File
  poseLandmarks: PoseLandmark[]
  poseScaleBasis: PoseScaleBasis
  posePersonAreaRatio?: number | null
  multiPerson?: boolean
  /** 'quick' = 웹캠 퀵 진단 경로 — 서버가 세그 잡을 걸지 않는다 (job_id null). */
  pipeline?: 'full' | 'quick'
}) {
  const form = new FormData()
  form.set('file', input.file)
  if (input.pipeline) form.set('pipeline', input.pipeline)
  form.set('pose_landmarks', JSON.stringify(input.poseLandmarks))
  form.set('pose_scale_basis', input.poseScaleBasis)
  if (input.posePersonAreaRatio != null) form.set('pose_person_area_ratio', String(input.posePersonAreaRatio))
  form.set('multi_person', String(input.multiPerson ?? false))
  return request<Record<string, unknown>>(`/sessions/${sessionId}/photos/reference`, { method: 'POST', body: form })
}

export function uploadUserPhoto(sessionId: string, input: {
  file: File
  captureSource: CaptureSource
  poseLandmarks: PoseLandmark[]
  poseSimilarity: number
  framingScore: number
  poseScaleBasis: PoseScaleBasis
  facingDelta?: number
  poseOks?: number | null
  posePersonAreaRatio?: number | null
  multiPerson?: boolean
  /** 'quick' = 웹캠 퀵 진단 경로 — 서버가 세그 잡을 걸지 않는다 (job_id null). */
  pipeline?: 'full' | 'quick'
}) {
  const form = new FormData()
  form.set('file', input.file)
  if (input.pipeline) form.set('pipeline', input.pipeline)
  form.set('capture_source', input.captureSource)
  form.set('pose_landmarks', JSON.stringify(input.poseLandmarks))
  form.set('pose_similarity', String(input.poseSimilarity))
  form.set('framing_score', String(input.framingScore))
  form.set('pose_scale_basis', input.poseScaleBasis)
  form.set('facing_delta', String(input.facingDelta ?? 0))
  if (input.poseOks != null) form.set('pose_oks', String(input.poseOks))
  if (input.posePersonAreaRatio != null) form.set('pose_person_area_ratio', String(input.posePersonAreaRatio))
  form.set('multi_person', String(input.multiPerson ?? false))
  return request<Record<string, unknown>>(`/sessions/${sessionId}/photos/user`, { method: 'POST', body: form })
}

/** 인바디 결과지 업로드 — 여러 페이지를 한 건(1~5장 배열)으로 올린다. 202 + OCR 잡. */
export function uploadInbody(sessionId: string, files: File[]) {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  return request<{ inbody_id: string; job_id: string; status: string }>(`/sessions/${sessionId}/inbody`, { method: 'POST', body: form })
}

// ── 진단(F08·F09)·세그멘테이션(F06) 응답 타입 — 백엔드 app/schemas 와 1:1 ──

export type GapLevel = 'NONE' | 'SLIGHT' | 'MODERATE' | 'SIGNIFICANT'
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH'

export interface AnalysisPart {
  class_name: string
  name_ko: string | null
  part_group: string | null
  color_hex: string | null
  differences: string[]
  assessment: string | null
  gap_level: GapLevel | null
  priority: number | null
  confidence: Confidence | null
  /** 판단 불가/보완 사유 — 있으면 배지 필수 (assessment 유무와 무관) */
  blocked_reason: string | null
  status: string
}

export interface AnalysisOverall {
  similarity_score: number | null
  score_source: string
  score_rationale: string | null
  summary: string | null
  priority_parts: string[]
  strengths: string[]
  cautions: string[]
  /** 두 사진을 직접 본 전체 형태 판단 — summary 보다 구체적인 실루엣 서술 */
  silhouette: string | null
  /** 이번 비교에서 못 본 부위 + 사유. 규칙이 DB 에서 만든다 — LLM 문장이 아니다
   *  (백엔드 handlers/vlm.py `_comparison_limitations`). "왼쪽 팔뚝: 대부분
   *  옷에 가려져 있어 비교에서 뺐습니다" 처럼 부위명이 이미 문장 안에 있다. */
  comparison_limitations: string[]
  status: string
}

export interface AnalysisExcludedPart { class_name: string; name_ko: string | null; reason: string; side: string }

export interface AnalysisResult {
  overall: AnalysisOverall | null
  parts: AnalysisPart[]
  excluded: AnalysisExcludedPart[]
  inbody_id: string | null
  disclaimer: string
}

export interface AnalysisProgress {
  part: { done: number; failed: number; total: number; status: string }
  overall: { status: string }
  completed: boolean
  /**
   * 워커 풀이 이 잡을 집어가지 않고 있다(서버 판정). completed 와 독립 필드다.
   *
   * ⚠️ **프론트는 이 값을 쓰지 않는다 — 화면에 옮기지 말 것.** 서버 사정은 사용자가
   *    손쓸 수 없어서 로딩 화면에 «지연되고 있어요 + 다시 시도»를 띄웠더니 불안만 줬다.
   *    (게다가 판정 자체도 한동안 오탐이었다 — 워커가 다른 kind 를 처리 중이면 정상
   *    대기를 정지로 봤다. 2026-08-19 서버에서 풀 단위 판정으로 수정됨.)
   *    지금 이 신호의 용도는 **서버 경고 로그**다. 정지는 거기서 감지한다.
   *    타입만 남겨 두는 이유는 응답에 계속 내려오기 때문이다.
   */
  stalled?: boolean
}

export interface SegPaletteEntry {
  label_value: number
  class_name: string
  name_ko: string
  color_hex: string | null
  is_comparable: boolean
  is_valid: boolean
  invalid_reason: string | null
  pixel_count: number
  area_ratio: number
  bbox: { x: number; y: number; w: number; h: number }
  is_truncated: boolean
}

export interface SegmentationInfo {
  segmentation_id: string
  photo_id: string
  kind: string
  map_url: string
  /** 오버레이용 병합 맵 — 옷 픽셀이 인접 부위로 흡수돼 있어 옷 입은 사진도 매끈하게
   *  칠해진다. 하이라이트는 이걸 우선 쓰고, 옛 세션(null)은 map_url 로 폴백. */
  merged_map_url?: string | null
  map_width: number
  map_height: number
  photo_url: string
  photo_width: number | null
  photo_height: number | null
  person_area_ratio: number
  palette: SegPaletteEntry[]
  signed_url_expires_at: string
}

export interface SessionSegmentation {
  reference: SegmentationInfo | null
  user: SegmentationInfo | null
  comparable: {
    /** 사용자 기준 부위명 — 카드 목록·라벨·진단문 모두 이 기준 */
    class_names: string[]
    count: number
    sufficient: boolean
    min_required: number
    reference_only: string[]
    user_only: string[]
    excluded: Array<{ class_name: string; name_ko: string; side: string; reason: string | null; message: string }>
    /** 2026-08-18 교차 짝짓기 폐지로 항상 false — 하위 호환용으로만 내려옴. 사용하지 말 것 */
    cross_paired: boolean
  }
}

// ── 루틴(F10~F12)·인바디(F07)·코치(F13) 응답 타입 — 백엔드 app/schemas 와 1:1 ──

export interface RoutineExercise {
  order_index: number
  name: string
  exercise_ref: string | null
  image_url: string | null
  /** 시연 영상(mp4). ⚠️ null 가능 — 없으면 image_url 로 폴백한다.
   *  저장값이 아니라 조회 시 카탈로그에서 붙으므로 옛 루틴에도 나온다. */
  video_url: string | null
  exercise_kind: string
  muscle_group: string | null
  sets: number | null
  reps: number | null
  duration_min: number | null
  rest_sec: number | null
  /** N회 남기고 멈추는 무게 — 중량(kg)은 서버가 제공하지 않는다 */
  rir: number | null
  boosted_by: string | null
  note: string | null
}

export interface RoutineDay { day_order: number; title: string | null; estimated_duration_min: number | null; exercises: RoutineExercise[] }

export interface RoutineProgress {
  completed_count: number
  total_count: number
  cycle_no: number
  next_day_order: number
  is_completed: boolean
  percent: number
  day_source: string
}

export interface RoutineDetail {
  month_routine_id: string
  version: number
  exercise_days_per_week: number
  total_cycles: number
  goal: string | null
  focus_areas: string[]
  status: string
  is_active: boolean
  days: RoutineDay[]
  progress: RoutineProgress
  //: 옛 필드 — 소제목과 본문이 빈 줄로 이어 붙은 한 덩어리. 새 화면은 notices 를 쓴다.
  notice: string | null
  //: 안내를 **조건별로 나눈** 목록. 감량 안내(체지방률 기준)와 주 7일 안내처럼
  //  대상이 서로 다른 이야기가 한 문단으로 섞여 읽히지 않아서 나뉘었다.
  //  ⚠️ 이 필드 이전에 만들어진 루틴은 빈 배열이다 — notice 로 폴백할 것.
  notices: RoutineNotice[]
  //: 루틴 구성 근거. LLM 이 쓴 글이 아니라 실제 생성된 루틴에서 조립한 것.
  //  이 필드 이전 루틴은 null 이므로 goal/focus_areas 폴백을 쓴다.
  strategy: RoutineStrategy | null
  disclaimer: string
}

/** 루틴 안내 한 건 — 소제목과 본문. */
export interface RoutineNotice {
  title: string
  body: string
}

export interface RoutineStrategy {
  headline: string | null
  body: string | null
}

export interface TodayRoutine { month_routine_id: string; cycle_no: number; day: RoutineDay; progress: RoutineProgress; disclaimer: string }

export type InbodySegmentKey = 'LEFT_ARM' | 'RIGHT_ARM' | 'TRUNK' | 'LEFT_LEG' | 'RIGHT_LEG'
export interface InbodySegmentDto { segment: InbodySegmentKey; lean_mass: number | null; fat_mass: number | null }

export interface InbodyDetail {
  inbody_id: string
  status: string
  measured_at: string | null
  /** inbody 테이블 컬럼 (weight, bmi, height, age, gender, skeletal_muscle_mass, body_fat_percentage, …) */
  fields: Record<string, unknown>
  /** 서버 계산값 (골격근량 ÷ 신장²) — 읽기 전용 */
  smi: number | null
  segments: InbodySegmentDto[]
  /** WARN 필드만 {"필드": {level, message}} */
  validation: Record<string, { level: string; message: string }>
  verified_at: string | null
}

export interface CoachChatMessage { role: string; content: string }
export interface CoachFinalized { summary: string; changes: Array<{ what: string; why: string }> }
export interface CoachChatResponse {
  reply: string
  messages: CoachChatMessage[]
  tool_events: Array<{ name: string; args: Record<string, unknown> }>
  finalized: CoachFinalized | null
  turn: number
  max_turns: number
}

export function getJob(jobId: string) { return request<Job>(`/jobs/${jobId}`) }
export function getSessionJobs(sessionId: string) { return request<{ items: JobSummary[] }>(`/sessions/${sessionId}/jobs`) }
export function getReferencePhoto(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/photos/reference`) }
export function getSessionSegmentation(sessionId: string) { return request<SessionSegmentation>(`/sessions/${sessionId}/segmentation`) }
export function getPhotoSegmentation(photoId: string) { return request<Record<string, unknown>>(`/photos/${photoId}/segmentation`) }
export function getSignedUrls(items: Array<{ bucket: string; path: string }>, expiresIn?: number) {
  return request<Record<string, unknown>>('/storage/signed-urls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, expires_in: expiresIn }) })
}
export function listInbody(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/inbody`) }
export function getInbody(inbodyId: string) { return request<InbodyDetail>(`/inbody/${inbodyId}`) }
export function patchInbody(inbodyId: string, body: { fields?: Record<string, unknown>; segments?: unknown[]; verified?: boolean }) {
  return request<Record<string, unknown>>(`/inbody/${inbodyId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
export function deleteInbody(inbodyId: string) { return request<void>(`/inbody/${inbodyId}`, { method: 'DELETE' }) }
/** force=true — 이미 끝난 분석을 무시하고 다시 돌린다. 실패 후 «다시 시도» 전용. */
export function startAnalysis(sessionId: string, force = false) { return request<Record<string, unknown>>(`/sessions/${sessionId}/analysis${force ? '?force=true' : ''}`, { method: 'POST' }) }
/** 퀵 진단(웹캠) — 세그 없이 원본 2장 전체 비교. 부위 카드·점수 없음. 진행은 getAnalysisProgress 의 completed 로 본다. */
export function startQuickAnalysis(sessionId: string, force = false) { return request<Record<string, unknown>>(`/sessions/${sessionId}/analysis?mode=quick${force ? '&force=true' : ''}`, { method: 'POST' }) }
export function getAnalysisProgress(sessionId: string) { return request<AnalysisProgress>(`/sessions/${sessionId}/analysis/progress`) }
export function getAnalysis(sessionId: string) { return request<AnalysisResult>(`/sessions/${sessionId}/analysis`) }
export function createRoutine(sessionId: string, exerciseDaysPerWeek: number) {
  return request<Record<string, unknown>>(`/sessions/${sessionId}/routines`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exercise_days_per_week: exerciseDaysPerWeek }) })
}
export function listRoutineVersions(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/routines`) }
export function getActiveRoutine(sessionId: string) { return request<RoutineDetail>(`/sessions/${sessionId}/routines/active`) }
export function getTodayRoutine(sessionId: string) { return request<TodayRoutine>(`/sessions/${sessionId}/routines/today`) }
export function getRoutineDay(monthRoutineId: string, dayOrder: number) { return request<Record<string, unknown>>(`/routines/${monthRoutineId}/days/${dayOrder}`) }
export function createWorkoutLog(sessionId: string, body: { day_order: number; cycle_no: number; feedback_text?: string | null }) {
  return request<Record<string, unknown>>(`/sessions/${sessionId}/workout-logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
export function listWorkoutLogs(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/workout-logs`) }
export function listRevisions(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/revisions`) }
export function sendCoachMessage(sessionId: string, messages: CoachChatMessage[]) {
  return request<CoachChatResponse>(`/sessions/${sessionId}/coach-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
}
export function applyCoachChanges(sessionId: string, messages: CoachChatMessage[]) {
  return request<{ no_change?: boolean; month_routine_id?: string; version?: number }>(`/sessions/${sessionId}/coach-chat/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
}
export function archiveSession(sessionId: string) { return request<Session>(`/sessions/${sessionId}/archive`, { method: 'POST' }) }
