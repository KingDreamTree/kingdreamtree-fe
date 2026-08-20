# RE:FIT Frontend

레퍼런스 이미지 기반 체형 비교 분석 + 개인화 운동 루틴 서비스의 웹 프론트엔드.

**배포**: https://www.refit.live (Vercel, `main` push 시 자동 배포)
**백엔드**: https://api.refit.live — [KingDreamTree-Backend](https://github.com/KingDreamTree/KingDreamTree-Backend)

## 스택

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- MediaPipe Tasks Vision — 웹캠 실시간 자세 판정 (랜드마크 추출은 전부 브라우저에서)
- 라우터 없음 — 단일 페이지 상태머신(`App.tsx` 의 view 상태)으로 화면 전환

## 주요 플로우

1. **온보딩 → 레퍼런스 업로드** — 목표 체형 사진 등록
2. **촬영/업로드** — 웹캠 실시간 자세 점수(MediaPipe)로 가이드 후 촬영, 또는 갤러리 업로드
3. **인바디 업로드(선택)** — 결과지 사진 → 백엔드 OCR → 수치 확인·수정
4. **비교 분석** — 부위별 진단 카드 + 세그멘테이션 오버레이 + 목표 근접도 점수
5. **루틴 생성 → 오늘의 운동 → 피드백 코치챗**

## 실행

```bash
npm install
cp .env.example .env.local   # VITE_API_BASE_URL 설정 (기본: 배포 API)
npm run dev                  # http://localhost:5173
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | `tsc -b` + 프로덕션 빌드 |
| `npm run lint` | oxlint |

## 환경 변수

| 변수 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 API 베이스. 미설정 시 `https://api.refit.live/api/v1` |

로컬 백엔드로 붙일 때는 `.env.local` 에 `VITE_API_BASE_URL=http://localhost:8000/api/v1`.

## 설계 메모

- 익명 사용자: 첫 진입 시 `user_id` 발급 → `localStorage` 보관. 세션은 사용자당 ACTIVE 1개.
- 분석 대기 중 새로고침해도 이어지도록 진행 상태를 `localStorage`/`sessionStorage` 로 복원.
- 부위 오버레이는 세그멘테이션 맵 PNG 를 캔버스에서 원본 사진과 합성 — 선택 부위만 색칠.
- 화면은 Figma 1440px 기준 절대좌표 + 창 크기에 맞춘 균일 축소(scale).
