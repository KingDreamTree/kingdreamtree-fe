# 백엔드 변경분 — 2026-08-16 오후 (HANDOFF/INPUTS 문서에 아직 없는 것)

> [FRONTEND-HANDOFF.md](FRONTEND-HANDOFF.md)(응답 읽는 법) · [FRONTEND-INPUTS.md](FRONTEND-INPUTS.md)(보내는 값)를
> 먼저 읽고, 이 문서로 오늘 바뀐 것을 덮어쓰세요. 충돌하면 **이 문서가 이깁니다.**
> 백엔드 커밋 기준: `3118076` (푸시 완료, 프로덕션 배포 반영 대기 중 — 아래 §5)

---

## 1. 부분 신체 사진 허용 — 좌표 검증 ±10 (배포 완료)

상체만/하체만 나온 사진도 레퍼런스·사용자 사진으로 올릴 수 있습니다.

- 서버 좌표 검증이 ±1.5 → **±10** 으로 완화됨 (MediaPipe가 화면 밖 관절을 추측한
  좌표는 한 자릿수, 픽셀 좌표 실수는 수백 단위라 이 사이 어디든 안전)
- 프론트 사전 검증을 미러링한다면 같은 ±10 (이미 반영됨: `findOutOfRangeLandmark`)
- `pose_scale_basis` 분기 필수: 어깨·골반 4점 visibility ≥ 0.5 → `TORSO`, 아니면 `HIP_KNEE`.
  **레퍼런스와 사용자가 같은 값이어야** 하며 다르면 422 `SCALE_BASIS_MISMATCH`

## 2. 실시간 촬영 좌우반전 — 판정 방향 = 프리뷰 방향 (확정)

규칙은 화면당 하나입니다:

| 화면 | 판정 호출 |
|---|---|
| 실시간 촬영 (거울 프리뷰) | `evaluate(mirrorLandmarks(refLm), liveLm, criteria, opts)` |
| 갤러리 업로드 (프리뷰 없음) | `evaluate(refLm, userLm, criteria, opts)` — 기존 그대로 |

- `mirrorLandmarks` 는 `pose-score.js` 신규 export. **판정 기준용 레퍼런스에만** 적용.
  레퍼런스 로드 때 1회 계산해서 재사용
- 레퍼런스 화면 표시는 **원본 그대로** (반전 표시안은 기각 — 사진 속 글자 뒤집힘)
- 업로드하는 사진·좌표는 **항상 카메라 원본** — 뒤집으면 왼팔 진단이 오른팔에 붙음.
  `is_mirrored` 는 "이미 반전 저장된 갤러리 사진" 전용, 실시간 촬영과 무관
- 안내 문구: "화면에 보이는 대로 따라 하세요"

## 3. 커버리지 컷 — 새 반려 사유 `REF_PARTS_MISSING` (신규)

전신 레퍼런스 대비 상반신만 잡힌 사진이 통과하던 구멍을 1차 관문에서 막았습니다.

- 규칙: 레퍼런스에서 보이는 팔다리 세그먼트(8개) 중 사용자 사진에서도 보이는
  비율이 `criteria.min_ref_coverage`(현재 0.7, 잠정) 미만이면 `poseScore()` 가
  score 0 + reason `REF_PARTS_MISSING` 반환. **호출부 변경은 없음** (산식 내부)
- `evaluate()` 의 `blockReason === 'REF_PARTS_MISSING'` 은 **NOT_ENOUGH_JOINTS 와
  같은 부류 — 이 상태로 업로드 금지** (서버는 숫자만 받아 "포즈를 맞춰주세요"라고
  답하므로 안내가 어긋남). 문구는 `MESSAGES.REF_PARTS_MISSING`
  ("레퍼런스에 나온 부위가 모두 보이도록 서주세요.")
- 방향 비대칭: 상체 레퍼런스 + 전신 사용자 = 통과 (부분 신체 정책 유지)

## 4. pose-score.js 재복사 필요 (breaking)

- 최신본이 이 레포 `public/pose-score.js` 에 동기화돼 있음 (백엔드 `web/pose-score.js`
  커밋 `3118076` 과 동일). **`src/lib/pose-score.js` 를 이걸로 교체**할 것
- 신규 export: `LR_PAIRS` · `mirrorLandmarks`. ~~`evaluateEitherWay`~~ 는 **폐기**
  (한때 안내했으나 기각 — 가져갔다면 제거)
- ⚠️ 새 파일은 criteria 에 `min_ref_coverage` 가 없으면 **일부러 에러**를 냅니다
  (min_seg_ratio 전례와 같은 규약). 그래서 배포 순서가 §5

## 5. 배포 순서 — 백엔드 먼저

1. 백엔드 `3118076` 푸시 완료 → 자동 배포 진행 중
2. **프로덕션 `GET /pose-criteria` 응답에 `min_ref_coverage` 가 나타난 뒤** 프론트
   PR(새 pose-score.js 포함) 머지. 순서가 바뀌면 앱 시작 시 criteria 에러
3. 로컬 백엔드(localhost:8000)는 이미 새 기준값을 내려줌 — 로컬 개발은 지금 가능

## 6. CORS — "전부 열려 있음"은 프로덕션에선 사실 아님 (INPUTS §0 정정)

실측 결과 프로덕션 허용 오리진은 딱 2개: **`http://localhost:5173`** · **`https://www.refit.live`**

- Vercel 프리뷰 URL(`*.vercel.app`)에서는 모든 API 호출이 "Failed to fetch"로 죽음
- 프리뷰에서 테스트하려면 그 도메인을 백엔드에 알려줄 것 (EC2 `.env` CORS_ORIGINS 등록)
- `https://refit.live`(www 없는 apex)는 www 로 리다이렉트되므로 문제없음

## 7. 문구 교체 (이미 반영된 것 재확인)

- `MESSAGES.NOT_ENOUGH_JOINTS` → "레퍼런스에 나온 부위가 보이도록 서주세요." 로
  앱 초기화 시 교체하는 방식 유지 (pose-score.js 원본은 안 건드림)
- 422 = 사진 문제(재촬영) / 503 `SCREENING_UNAVAILABLE` = 서버 문제(같은 사진 재시도)
  구분은 기존 문서 그대로
