import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PosePoint } from './pose-score.js'

const visionWasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const poseModelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

let imageLandmarker: Promise<PoseLandmarker> | undefined

export type DetectedPose = {
  landmarks: PosePoint[]
  multiPerson: boolean
  personAreaRatio: number | null
  scaleBasis: 'TORSO' | 'HIP_KNEE'
}

async function getImageLandmarker() {
  imageLandmarker ??= FilesetResolver.forVisionTasks(visionWasmUrl).then(vision => PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: poseModelUrl, delegate: 'GPU' },
    runningMode: 'IMAGE',
    numPoses: 2,
  }))
  return imageLandmarker
}

export function areaRatio(landmarks: PosePoint[], width: number, height: number) {
  if (!landmarks.length || !width || !height) return null
  const xs = landmarks.map(point => point.x)
  const ys = landmarks.map(point => point.y)
  const boxWidth = Math.max(...xs) - Math.min(...xs)
  const boxHeight = Math.max(...ys) - Math.min(...ys)
  return Math.max(0, Math.min(1, boxWidth * boxHeight))
}

/**
 * 서버 검증(app/services/pose.py parse_landmarks)과 같은 범위 — ±10.
 * 잘린 사진(상체/하체만)은 이제 정상 허용이다: MediaPipe가 화면 밖 관절을
 * 추측한 좌표는 커봐야 한 자릿수라 통과하고, 픽셀 좌표를 실수로 보내는
 * 개발 버그(수백~수천 단위)만 여기서 걸린다.
 */
export function findOutOfRangeLandmark(landmarks: PosePoint[]): number | null {
  for (let i = 0; i < landmarks.length; i += 1) {
    const { x, y } = landmarks[i]
    if (!(x >= -10 && x <= 10 && y >= -10 && y <= 10)) return i
  }
  return null
}

export const INVALID_LANDMARKS_MESSAGE = '사진을 분석하지 못했어요. 다른 사진으로 시도해주세요.'

export function chooseScaleBasis(landmarks: PosePoint[]): 'TORSO' | 'HIP_KNEE' {
  const hasVisible = (indexes: number[]) => indexes.every(index => landmarks[index] && (landmarks[index].visibility ?? 1) >= .5)
  return hasVisible([11, 12, 23, 24]) ? 'TORSO' : 'HIP_KNEE'
}

/** Runs MediaPipe only in the browser and returns normalized 33-point landmarks. */
export async function detectPoseFromImage(image: HTMLImageElement): Promise<DetectedPose> {
  const landmarker = await getImageLandmarker()
  const result = landmarker.detect(image)
  const landmarks = result.landmarks[0] as PosePoint[] | undefined
  if (!landmarks?.length) throw new Error('사진에서 사람을 찾지 못했습니다. 전신이 잘 보이는 사진을 선택해주세요.')
  if (findOutOfRangeLandmark(landmarks) !== null) throw new Error(INVALID_LANDMARKS_MESSAGE)

  return {
    landmarks,
    multiPerson: result.landmarks.length > 1,
    personAreaRatio: areaRatio(landmarks, image.naturalWidth, image.naturalHeight),
    scaleBasis: chooseScaleBasis(landmarks),
  }
}

export async function loadImageFile(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return await detectPoseFromImage(image)
  } finally {
    URL.revokeObjectURL(url)
  }
}
