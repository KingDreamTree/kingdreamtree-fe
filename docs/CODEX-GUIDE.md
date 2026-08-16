# 프론트 작업 가이드 — 코덱스(AI)에게 일 시키는 법

> 이 레포(`kingdreamtree-fe`)가 이제 프론트 단일 레포입니다. www.refit.live 가 여기
> main 브랜치에서 자동 배포돼요. 기존 `KingDreamTree-Frontend`의 작업물(API 클라이언트,
> pose-detector, 화면들)은 **전부 이 레포로 옮겨져 있고 커밋 크레딧도 원작자 명의**로
> 남아 있습니다. 이어서 작업하면 됩니다.

## 0. 시작 (1회)

```bash
git clone https://github.com/KingDreamTree/kingdreamtree-fe.git
cd kingdreamtree-fe
npm install
npm run dev    # http://localhost:5173 — 기본으로 프로덕션 API(api.refit.live)에 붙음
```

## 1. 작업 규칙 — 코덱스에게 시킬 때 항상 앞에 붙이는 문단

아래 블록을 코덱스 프롬프트 맨 앞에 복붙하세요:

```
[작업 규칙 — 반드시 지킬 것]
- docs/FRONTEND-HANDOFF.md(API 명세)와 docs/FRONTEND-INPUTS.md(보내는 값)를 먼저 읽어라.
  docs/BACKEND-DELTA-*.md가 있으면 그게 최신이고 충돌 시 우선이다. 형식의 최종 근거는
  Swagger(https://api.refit.live/docs)다.
- src/lib/pose-score.js는 백엔드 산식 원본의 복사본이다. 절대 수정하지 마라.
  타입이 필요하면 src/lib/pose-score.d.ts만 고쳐라.
- 판정 기준값(70점, 0.7 등)을 코드에 하드코딩하지 마라. 전부 GET /pose-criteria
  응답을 쓴다.
- API 호출은 src/lib/api.ts의 기존 함수를 쓰거나 같은 스타일로 추가하라.
  X-User-Id 헤더·에러 형식({error:{code,message,detail}})은 이미 처리돼 있다.
- 에러 안내: 422는 사용자가 고칠 문제(재시도 유도), 503은 서버 문제(같은 입력으로
  잠시 후 재시도). 400 INVALID_REQUEST의 message는 개발자용이라 그대로 노출 금지
  (userFacingMessage 헬퍼 사용).
- 화면은 기존 디자인 시스템을 따르라: src/screens/의 기존 화면 + App.css의
  1440×1024 고정 프레임(FixedStepFrame) 패턴을 그대로 쓴다.
- 완료 기준: npm run build와 npm run lint가 통과해야 한다.
```

## 2. 브랜치·배포 흐름

1. `git checkout -b feat/<작업이름>` (main에서 시작)
2. 작업 → 커밋 → `git push -u origin feat/<작업이름>`
3. GitHub에서 PR 만들고 머지 → **1~2분 뒤 www.refit.live 자동 반영**
4. ⚠️ **테스트는 www.refit.live 또는 localhost:5173에서만.** Vercel 프리뷰
   URL(`*.vercel.app`)은 서버 CORS에 막혀 모든 API 호출이 실패함
5. 캐시 주의: 배포 직후엔 Ctrl+Shift+R (강력 새로고침)

## 3. 지금 상태 — 뭐가 되고 뭐가 남았나

**완성 (건드릴 필요 없음):**
- 온보딩 → 레퍼런스 등록 → 실시간 자세 촬영/갤러리 업로드 (Step 1~2 전 구간 실연동)
- `src/lib/api.ts` — 백엔드 전체 API 함수 (인바디·진단·루틴·코치챗 포함, **아직 화면에 연결 안 된 것도 함수는 다 있음**)

**남은 작업 (화면은 있는데 목업 상태 — 실제 API 연결 필요):**
- 인바디 업로드·확인 (`Inbody*Screen.tsx` 7개)
- 진단 시작·로딩·결과 (`LoadingOneScreen`, `ComparisonAnalysisScreen`)
- 루틴 생성·조회 (`ExerciseDays`, `CustomRoutine*`, `TodayRoutine`)
- 운동 완료·피드백·코치 대화 (`Feedback*Screen` 8개)

## 4. 복붙용 코덱스 프롬프트

### 4-1. 인바디 업로드 실연동

```
(위 [작업 규칙] 블록 붙이고)

docs/FRONTEND-HANDOFF.md §4(인바디)를 읽고, 목업 상태인 인바디 화면들을 실제 API로
연결해줘. src/App.tsx의 inbody-* 뷰 라우팅과 src/screens/Inbody*Screen.tsx가 화면이고,
src/lib/api.ts에 uploadInbody / getInbody / patchInbody / getJob이 이미 있다.

흐름: InbodyUploadBeforeScreen에서 파일 선택 → POST(uploadInbody) → job_id를
getJob으로 폴링(1.5초 간격, PENDING|PROCESSING 동안) → DONE이면 추출값을
InbodyUploadAfterScreen 폼에 채워서 사용자 확인 → 수정 시 PATCH.
validation 경고(level: WARN)는 관련 필드를 묶어서 보여주되 다음 단계 진행은 막지 말 것.
smi는 읽기 전용(서버 계산값). 건너뛰기 버튼은 항상 동작해야 한다(인바디는 선택).
OCR 실패(FAILED)면 InbodyUnreadableScreen으로.
```

### 4-2. 진단 연결

```
(위 [작업 규칙] 블록 붙이고)

docs/FRONTEND-HANDOFF.md §5(진단)를 읽고 진단 구간을 실연동해줘.
인바디 완료/건너뛰기 후 startAnalysis(POST) → LoadingOneScreen 동안
getAnalysisProgress를 폴링해 진행률 표시 → 완료되면 getAnalysis 결과를
ComparisonAnalysisScreen에 바인딩.

주의: gap_level이 null인 부위는 숨기지 말고 "확인이 어려웠어요"로 정직하게 표시.
gap_level과 blocked_reason이 둘 다 있으면 "옷에 가림 · 인바디 기준" 배지를 붙여라
(assessment 유무와 무관하게). similarity_score 옆에 score_rationale을 같이 노출.
strengths가 빈 배열이면 억지로 채우지 마라.
```

### 4-3. 루틴 연결

```
(위 [작업 규칙] 블록 붙이고)

docs/FRONTEND-HANDOFF.md §6(루틴)을 읽고 루틴 구간을 실연동해줘.
ExerciseDaysScreen에서 요일 수 선택 → createRoutine(POST, exercise_days_per_week)
→ job 폴링(LoadingTwoScreen) → getActiveRoutine으로 CustomRoutineScreen 바인딩,
getTodayRoutine으로 TodayRoutineScreen 바인딩.

⚠️ 루틴 모델을 정확히: 저장은 Day 1..N뿐이고 4주기 반복이다(28일치가 아님).
day_order는 요일이 아니라 주기 내 순서. 화면 표기는 "2주차 · Day 2" =
progress.cycle_no와 next_day_order 사용. 중량(kg)은 표시하지 마라(rir만 제공).
exercise_kind가 CARDIO면 sets 대신 duration_min. disclaimer 반드시 노출.
```

### 4-4. 운동 완료·피드백·코치 대화

```
(위 [작업 규칙] 블록 붙이고)

docs/FRONTEND-HANDOFF.md §7(피드백·코치)을 읽고 피드백 구간을 실연동해줘.
TodayRoutineScreen 완료 → createWorkoutLog(day_order, cycle_no, feedback_text).
FeedbackScreen 계열은 코치 대화(sendCoachMessage)로: 응답의 messages 배열을
그대로 보관했다가 다음 요청에 새 발화만 append(서버는 stateless).
finalized가 오면 요약 카드 + [적용]/[그대로 둘게요] — 적용이면 applyCoachChanges.
tool_events에 flag_contraindication이 있으면 즉시 배지 표시(적용 버튼과 무관하게 반영됨).
```

## 5. 막히면

- 판정·기준값·에러 코드 관련은 **백엔드 결정이 우선** — 임의로 프론트에서 우회하지
  말고 백엔드에 물어보기
- 화면에서 F12 콘솔: `blocked by CORS` = 프리뷰 URL에서 테스트 중 / 4xx·5xx는
  응답 body의 error.code로 docs의 에러 표 참조
