/**
 * MediaPipe Pose Landmarker 로더.
 *
 * - 사진용(IMAGE)과 영상용(VIDEO) 인스턴스를 분리한다 — runningMode가 인스턴스마다
 *   고정이라 하나로 돌려쓰면 setOptions 왕복으로 프레임이 끊긴다.
 * - numPoses: 2 — 1로 두면 여러 명이 찍혀도 알아채지 못한다 (multi_person 감지).
 * - 모델(.task)과 wasm은 네트워크에서 받으므로 촬영 화면 진입 전에 미리 불러둔다.
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

export interface Landmarkers {
  image: PoseLandmarker
  video: PoseLandmarker
}

let loading: Promise<Landmarkers> | null = null

export function loadLandmarkers(): Promise<Landmarkers> {
  if (!loading) {
    loading = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      const make = (runningMode: 'IMAGE' | 'VIDEO') =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode,
          numPoses: 2,
        })
      const [image, video] = await Promise.all([make('IMAGE'), make('VIDEO')])
      return { image, video }
    })()
    loading.catch(() => {
      loading = null // 실패 시 다음 호출에서 재시도할 수 있게
    })
  }
  return loading
}
