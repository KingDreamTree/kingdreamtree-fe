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
 * 서버 검증(app/services/pose.py)과 같은 범위. MediaPipe는 화면 밖으로 잘린
 * 부위를 밖의 위치로 추정하는데, 크게 벗어나면 서버가 400으로 거부한다 —
 * 업로드 전에 여기서 걸러서 사용자 언어로 안내한다.
 */
export function findOutOfRangeLandmark(landmarks: PosePoint[]): number | null {
  for (let i = 0; i < landmarks.length; i += 1) {
    const { x, y } = landmarks[i]
    if (!(x >= -0.5 && x <= 1.5 && y >= -0.5 && y <= 1.5)) return i
  }
  return null
}

export const OUT_OF_FRAME_MESSAGE = '몸 일부가 사진 밖으로 잘려 있어요. 머리부터 발까지 전신이 나온 사진으로 시도해주세요.'

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
  if (findOutOfRangeLandmark(landmarks) !== null) throw new Error(OUT_OF_FRAME_MESSAGE)

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
