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
 * 사용자에게 보여줄 에러 문구. 422 계열(message가 사용자용으로 쓰인 것)은 그대로,
 * 400 INVALID_REQUEST 같은 개발자용 검증 문구는 fallback 으로 바꾼다.
 */
export function userFacingMessage(error: unknown, fallback: string): string {
  if (error instanceof RefitApiError) {
    if (error.status === 400 || error.code === 'INVALID_REQUEST') {
      console.error('[api] developer-facing error shown as fallback:', error.code, error.message, error.detail)
      return fallback
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
export type Job = { job_id: string; session_id: string; kind: string; status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'; attempts: number; result?: Record<string, unknown> | null; error?: string | null }

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

export function clearStoredIdentity() {
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(ACTIVE_SESSION_KEY)
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
      if (!(createError instanceof RefitApiError) || createError.status !== 404) throw createError
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
  isMirrored?: boolean
}) {
  const form = new FormData()
  form.set('file', input.file)
  form.set('pose_landmarks', JSON.stringify(input.poseLandmarks))
  form.set('pose_scale_basis', input.poseScaleBasis)
  if (input.posePersonAreaRatio != null) form.set('pose_person_area_ratio', String(input.posePersonAreaRatio))
  form.set('multi_person', String(input.multiPerson ?? false))
  form.set('is_mirrored', String(input.isMirrored ?? false))
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
  isMirrored?: boolean
}) {
  const form = new FormData()
  form.set('file', input.file)
  form.set('capture_source', input.captureSource)
  form.set('pose_landmarks', JSON.stringify(input.poseLandmarks))
  form.set('pose_similarity', String(input.poseSimilarity))
  form.set('framing_score', String(input.framingScore))
  form.set('pose_scale_basis', input.poseScaleBasis)
  form.set('facing_delta', String(input.facingDelta ?? 0))
  if (input.poseOks != null) form.set('pose_oks', String(input.poseOks))
  if (input.posePersonAreaRatio != null) form.set('pose_person_area_ratio', String(input.posePersonAreaRatio))
  form.set('multi_person', String(input.multiPerson ?? false))
  form.set('is_mirrored', String(input.isMirrored ?? false))
  return request<Record<string, unknown>>(`/sessions/${sessionId}/photos/user`, { method: 'POST', body: form })
}

export function uploadInbody(sessionId: string, file: File) {
  const form = new FormData()
  form.set('file', file)
  return request<{ inbody_id: string; job_id: string; status: string }>(`/sessions/${sessionId}/inbody`, { method: 'POST', body: form })
}

export function getJob(jobId: string) { return request<Job>(`/jobs/${jobId}`) }
export function getSessionJobs(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/jobs`) }
export function getReferencePhoto(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/photos/reference`) }
export function getSessionSegmentation(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/segmentation`) }
export function getPhotoSegmentation(photoId: string) { return request<Record<string, unknown>>(`/photos/${photoId}/segmentation`) }
export function getSignedUrls(items: Array<{ bucket: string; path: string }>, expiresIn?: number) {
  return request<Record<string, unknown>>('/storage/signed-urls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, expires_in: expiresIn }) })
}
export function listInbody(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/inbody`) }
export function getInbody(inbodyId: string) { return request<Record<string, unknown>>(`/inbody/${inbodyId}`) }
export function patchInbody(inbodyId: string, body: { fields?: Record<string, unknown>; segments?: unknown[]; verified?: boolean }) {
  return request<Record<string, unknown>>(`/inbody/${inbodyId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
export function deleteInbody(inbodyId: string) { return request<void>(`/inbody/${inbodyId}`, { method: 'DELETE' }) }
export function startAnalysis(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/analysis`, { method: 'POST' }) }
export function getAnalysisProgress(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/analysis/progress`) }
export function getAnalysis(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/analysis`) }
export function createRoutine(sessionId: string, exerciseDaysPerWeek: number) {
  return request<Record<string, unknown>>(`/sessions/${sessionId}/routines`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exercise_days_per_week: exerciseDaysPerWeek }) })
}
export function listRoutineVersions(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/routines`) }
export function getActiveRoutine(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/routines/active`) }
export function getTodayRoutine(sessionId: string) { return request<Record<string, unknown>>(`/sessions/${sessionId}/routines/today`) }
export function getRoutineDay(monthRoutineId: string, dayOrder: number) { return request<Record<string, unknown>>(`/routines/${monthRoutineId}/days/${dayOrder}`) }
export function createWorkoutLog(sessionId: string, body: { day_order: number; cycle_no: number; feedback_text?: string | null }) {
  return request<Record<string, unknown>>(`/sessions/${sessionId}/workout-logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
export function listWorkoutLogs(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/workout-logs`) }
export function listRevisions(sessionId: string) { return request<Record<string, unknown>[]>(`/sessions/${sessionId}/revisions`) }
export function sendCoachMessage(sessionId: string, messages: Record<string, unknown>[]) {
  return request<Record<string, unknown>>(`/sessions/${sessionId}/coach-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
}
export function applyCoachChanges(sessionId: string, messages: Record<string, unknown>[]) {
  return request<Record<string, unknown>>(`/sessions/${sessionId}/coach-chat/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
}
export function archiveSession(sessionId: string) { return request<Session>(`/sessions/${sessionId}/archive`, { method: 'POST' }) }
