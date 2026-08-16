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
