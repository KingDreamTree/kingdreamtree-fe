/**
 * Refit API client — 측정은 프론트, 정책은 서버.
 * 필드 형식의 최종 근거는 Swagger(https://api.refit.live/docs)와 docs/FRONTEND-HANDOFF.md.
 */
import { fetchCriteria, type PoseCriteria, type PoseLandmarks } from './pose-score.js'

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'https://api.refit.live/api/v1'

const USER_ID_KEY = 'refit_user_id'

/** 서버 공통 에러 형식 { error: { code, message, detail } }. message는 그대로 노출 가능. */
export class ApiError extends Error {
  status: number
  code: string
  detail: Record<string, unknown>

  constructor(status: number, code: string, message: string, detail: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.detail = detail
  }
}

async function request<T>(method: string, path: string, init: { userId?: string; body?: BodyInit } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (init.userId) headers['X-User-Id'] = init.userId
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: init.body })
  if (!res.ok) {
    let code = `HTTP_${res.status}`
    let message = `요청에 실패했습니다 (HTTP ${res.status})`
    let detail: Record<string, unknown> = {}
    try {
      const data = await res.json()
      if (data?.error) {
        code = data.error.code ?? code
        message = data.error.message ?? message
        detail = data.error.detail ?? {}
      }
    } catch {
      // 본문이 JSON이 아니면 기본 문구 유지
    }
    throw new ApiError(res.status, code, message, detail)
  }
  return res.json() as Promise<T>
}

/** POST /users — 최초 1회 발급 후 로컬 보관. 이후 모든 요청의 X-User-Id. */
export async function ensureUser(): Promise<string> {
  const stored = localStorage.getItem(USER_ID_KEY)
  if (stored) return stored
  const data = await request<{ user_id: string }>('POST', '/users')
  localStorage.setItem(USER_ID_KEY, data.user_id)
  return data.user_id
}

/** 진행 중 세션이 있으면 그걸, 없으면 새로 만든다 (사용자당 1개). */
export async function ensureSession(userId: string): Promise<string> {
  try {
    const active = await request<{ session_id: string }>('GET', '/sessions/active', { userId })
    if (active?.session_id) return active.session_id
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
  const created = await request<{ session_id: string }>('POST', '/sessions', { userId })
  return created.session_id
}

/** GET /pose-criteria — 앱 시작 시 한 번. 실패 시 기본값 대체 없이 던진다. */
export function loadCriteria(): Promise<PoseCriteria> {
  return fetchCriteria(API_BASE)
}

/** 서버가 기대하는 33개 랜드마크 JSON 배열 (e2e-test.html과 동일 형식). */
export function landmarksJson(lm: PoseLandmarks): string {
  return JSON.stringify(lm.map((p, i) => ({ index: i, x: p.x, y: p.y, z: p.z ?? 0, visibility: p.visibility ?? 1 })))
}

/** POST /sessions/{id}/photos/reference — 판정 없음, 이후 촬영의 기준. */
export function uploadReferencePhoto(
  userId: string,
  sessionId: string,
  file: File,
  lm: PoseLandmarks,
  multiPerson: boolean,
): Promise<{ job_id?: string; signed_url?: string }> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('pose_landmarks', landmarksJson(lm))
  fd.append('pose_scale_basis', 'TORSO')
  fd.append('multi_person', String(multiPerson))
  fd.append('is_mirrored', 'false')
  return request('POST', `/sessions/${sessionId}/photos/reference`, { userId, body: fd })
}

export interface UserPhotoScores {
  pose_similarity: number
  framing_score: number
  facing_delta: number
  multi_person: boolean
}

/** POST /sessions/{id}/photos/user — 값을 보내면 서버가 임계값과 비교해 다시 판정. */
export function uploadUserPhoto(
  userId: string,
  sessionId: string,
  blob: Blob,
  lm: PoseLandmarks,
  scores: UserPhotoScores,
  captureSource: 'CAPTURE' | 'UPLOAD',
): Promise<{ job_id?: string; signed_url?: string }> {
  const fd = new FormData()
  fd.append('file', blob, 'capture.jpg')
  fd.append('capture_source', captureSource)
  fd.append('pose_landmarks', landmarksJson(lm))
  fd.append('pose_scale_basis', 'TORSO')
  fd.append('pose_similarity', String(scores.pose_similarity))
  fd.append('framing_score', String(scores.framing_score))
  fd.append('facing_delta', String(scores.facing_delta))
  fd.append('multi_person', String(scores.multi_person))
  fd.append('is_mirrored', 'false')
  return request('POST', `/sessions/${sessionId}/photos/user`, { userId, body: fd })
}
