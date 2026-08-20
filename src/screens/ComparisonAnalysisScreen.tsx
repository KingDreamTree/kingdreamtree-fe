import { useEffect, useRef, useState } from 'react'
import comparisonCommentCircle from '../assets/comparison-analysis-comment-circle.svg'
import comparisonScoreTrack from '../assets/comparison-analysis-score-track.svg'
import type { AnalysisPart, AnalysisResult, SegmentationInfo, SessionSegmentation } from '../lib/api'
import { PreviousButton } from '../components/PreviousButton'
import { RefitHomeLogo } from '../components/RefitHomeLogo'
import { BodyPartIcon } from '../components/BodyPartIcon'

const GAP_LABELS: Record<string, string> = {
  NONE: '차이 거의 없음',
  SLIGHT: '약간의 차이',
  MODERATE: '보통 수준의 차이',
  SIGNIFICANT: '큰 차이',
}

const SCORE_RING_RADIUS = (300 - 24.83) / 2
const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * SCORE_RING_RADIUS

/** 좌우 짝 class_name을 서로 바꾼다. 짝이 없는 부위(Torso 등)는 null. */
function mirrorClassName(className: string): string | null {
  if (className.startsWith('Left_')) return `Right_${className.slice(5)}`
  if (className.startsWith('Right_')) return `Left_${className.slice(6)}`
  return null
}

/**
 * 사진 + 선택 부위 세그멘테이션 색칠을 **캔버스 한 장에 원본 해상도로 합성**한다.
 * 맵은 원본 사진 전체의 단순 스트레치(크롭·패딩 없음)라 배율만 맞추면 정확히
 * 겹치고, 한 캔버스이므로 CSS에서 cover/contain 무엇을 걸어도 같이 변형된다.
 * 선택 부위 bbox(맵 좌표계) 바깥은 칠하지 않는다 — 모델 오검출 노이즈 필터.
 */
function PhotoWithOverlay({ seg, selected, label }: { seg: SegmentationInfo | null; selected: AnalysisPart | null; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!seg) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    let cancelled = false
    const photo = new Image() // 표시 전용이라 crossOrigin 불필요 (픽셀은 맵에서만 읽는다)
    photo.onload = () => {
      if (cancelled) return
      canvas.width = photo.naturalWidth
      canvas.height = photo.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(photo, 0, 0)

      // 촬영본이 거울 방향으로 저장되므로(업로드와 같은 기준) 부위명 그대로 칠한다
      const entry = selected ? seg.palette.find(item => item.class_name === selected.class_name) : null
      if (!entry || !selected) return
      const mapImage = new Image()
      mapImage.crossOrigin = 'anonymous' // 픽셀을 읽어야 해서 필요 — 실패하면 색칠만 생략
      mapImage.onload = () => {
        if (cancelled) return
        try {
          const off = document.createElement('canvas')
          off.width = seg.map_width
          off.height = seg.map_height
          const offCtx = off.getContext('2d')
          if (!offCtx) return
          offCtx.drawImage(mapImage, 0, 0, seg.map_width, seg.map_height)
          const labels = offCtx.getImageData(0, 0, seg.map_width, seg.map_height)
          const colored = offCtx.createImageData(seg.map_width, seg.map_height)
          const hex = entry.color_hex ?? selected.color_hex ?? '#E52F28'
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          const { x: bx, y: by, w: bw, h: bh } = entry.bbox
          for (let y = by; y < by + bh; y += 1) {
            for (let x = bx; x < bx + bw; x += 1) {
              const i = (y * seg.map_width + x) * 4
              if (labels.data[i] === entry.label_value) {
                colored.data[i] = r
                colored.data[i + 1] = g
                colored.data[i + 2] = b
                colored.data[i + 3] = 150
              }
            }
          }
          offCtx.putImageData(colored, 0, 0)
          // 같은 캔버스에 원본 크기로 스트레치해 합성 — 맵과 사진의 배율(photoW/mapW·photoH/mapH)이 맞는다
          ctx.drawImage(off, 0, 0, canvas.width, canvas.height)
        } catch {
          // 스토리지 CORS 미허용 등으로 픽셀을 못 읽으면 색칠만 생략 (사진은 그대로 보임)
        }
      }
      // 병합 맵 우선 — 원본 맵은 옷에 가려진 부위가 듬성듬성 칠해진다 (옷 입은
      // 사용자 사진에서 "색칠이 안 보인다"로 나타났던 문제). 옛 세션은 null → 폴백.
      mapImage.src = seg.merged_map_url ?? seg.map_url
    }
    photo.src = seg.photo_url
    return () => { cancelled = true }
  }, [seg, selected])

  return <div className="comparison-analysis-photo">
    <canvas ref={canvasRef} className="comparison-analysis-photo__canvas" role="img" aria-label={label} />
    <span className="comparison-analysis-photo__label">{label}</span>
  </div>
}

type ComparisonAnalysisScreenProps = {
  analysis: AnalysisResult | null
  segmentation: SessionSegmentation | null
  onCreateRoutine: () => void
  onPrevious: () => void
}

/** Figma 41:189 — 비교 분석. 모든 수치·문구는 GET /analysis · /segmentation 응답에서 온다. */
export function ComparisonAnalysisScreen({ analysis, segmentation, onCreateRoutine, onPrevious }: ComparisonAnalysisScreenProps) {
  const parts = analysis?.parts ?? []
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const selected = parts.find(part => part.class_name === selectedClass) ?? parts[0] ?? null

  const overall = analysis?.overall ?? null
  const score = overall?.similarity_score ?? null
  const filled = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100

  const topClass = overall?.priority_parts?.[0] ?? null
  const topPart = topClass ? parts.find(part => part.class_name === topClass) : null
  // priority_parts[0] 하나만 쓰면 "팔·복부가 둘 다 확연히 다른" 사진에서도
  // "위팔 중심 개선 필요"처럼 단 하나만 콕 집은 것처럼 보인다. 규칙(rank_priority)이
  // 이미 격차 등급 순으로 정렬해 주므로, 1순위와 **같은 gap_level**(동률로 가장
  // 큰 격차)인 항목은 전부 같이 짚는다.
  const worstGapLevel = topPart?.gap_level ?? null
  const tiedClasses = worstGapLevel
    ? (overall?.priority_parts ?? []).filter(
        name => parts.find(part => part.class_name === name)?.gap_level === worstGapLevel,
      )
    : []
  // 좌우 쌍은 격차·신뢰도가 항상 같게 나온다(백엔드 규칙) — 짝도 동률에 들었으면
  // 한쪽만 짚는 게 아니라 "양쪽"으로 합쳐서 부른다. 안 그러면 오른쪽도 똑같이
  // 문제인데 왼쪽만 지목하는 짝짝이 문구가 된다.
  const seenClasses = new Set<string>()
  const priorityNames: string[] = []
  for (const className of tiedClasses) {
    if (seenClasses.has(className)) continue
    const part = parts.find(p => p.class_name === className)
    if (!part) continue
    const mirrorClass = mirrorClassName(className)
    const isPaired = mirrorClass != null && tiedClasses.includes(mirrorClass)
    seenClasses.add(className)
    if (isPaired && mirrorClass) seenClasses.add(mirrorClass)
    priorityNames.push(
      isPaired
        ? part.name_ko?.replace(/^(왼팔|오른팔|왼쪽|오른쪽)\s*/, '양쪽 ') ?? className
        : part.name_ko ?? className,
    )
  }
  const headline = priorityNames.length ? `${priorityNames.join('·')} 중심 개선 필요` : '개선 포인트 요약'

  // 퀵 진단(웹캠) 세션 — 세그가 없어 부위 카드·점수가 **설계상 없다** (백엔드
  // docs/quick-pipeline.md). 모드 플래그를 따로 받지 않는다: 진단은 완료(overall 有)
  // 인데 부위가 0건이면 퀵이다. 풀 모드 로딩 중간 상태는 이 화면에 오지 않는다
  // (isAnalysisRenderable 이 DONE 만 통과시킨다).
  const isQuick = overall != null && parts.length === 0

  const disclaimer = analysis?.disclaimer
  const disclaimerBoundary = '상담하세요.'
  const disclaimerBoundaryIndex = disclaimer?.indexOf(disclaimerBoundary) ?? -1
  const medicalDisclaimer = disclaimerBoundaryIndex >= 0
    ? disclaimer?.slice(0, disclaimerBoundaryIndex + disclaimerBoundary.length)
    : disclaimer

  return <main className="comparison-analysis-viewport" aria-label="비교 분석">
    <section className={isQuick ? 'comparison-analysis-page comparison-analysis-page--quick' : 'comparison-analysis-page'}>
      <div className="comparison-analysis-top-rule" aria-hidden="true" />
      {/* 이 화면은 FixedStepFrame 을 쓰지 않아 로고가 빠져 있었다 — 여기서만
          온보딩으로 돌아갈 길이 없었다. */}
      <RefitHomeLogo />
      <header className="comparison-analysis-header">
        <PreviousButton onClick={onPrevious} />
        <p>분석이 완료되었어요</p>
        <h1>레퍼런스 비교 분석 결과</h1>
        <span>현재 체형 vs 목표 레퍼런스</span>
      </header>

      {/* 산출 근거(score_rationale)는 본문에 그리면 링과 겹쳐서 툴팁으로만 제공 */}
      {!isQuick && <section className="comparison-analysis-score" aria-label={`목표 근접도 ${score ?? '미산출'}점`} title={overall?.score_rationale ?? undefined}>
        <img className="comparison-analysis-score__track" src={comparisonScoreTrack} alt="" />
        <svg className="comparison-analysis-score__fill" viewBox="0 0 300 300" aria-hidden="true">
          <circle cx="150" cy="150" r={SCORE_RING_RADIUS} fill="none" stroke="#FFE250" strokeWidth="24.83" strokeLinecap="round"
            strokeDasharray={SCORE_RING_CIRCUMFERENCE} strokeDashoffset={SCORE_RING_CIRCUMFERENCE * (1 - filled)}
            transform="rotate(-90 150 150)" />
        </svg>
        <span>목표 근접도</span>
        <strong>{score ?? '—'}점</strong>
      </section>}

      <section className="comparison-analysis-summary" aria-labelledby="comparison-summary-title">
        <h2 id="comparison-summary-title">AI 핵심 요약</h2>
        <div>
          <strong>{headline}</strong>
          <p>{overall?.summary ?? '요약을 준비하고 있어요.'}</p>
          {overall?.silhouette && <p>{overall.silhouette}</p>}
        </div>
        {/* ⚠️ 강점·주의·제외 부위 목록은 **의도적으로 그리지 않는다.** 세 값이 다 있을 때만
            나타나는 구조라 세션마다 떴다 안 떴다 해서, 요약 상자 아래 높이가 들쭉날쭉했다.
            (되살릴 일이 생기면 analysis.overall.strengths / cautions / analysis.excluded 다.) */}
      </section>

      {!isQuick && <p className="comparison-analysis-count">총 <em>{parts.length}건</em>의 부위별 진단 결과</p>}

      {/* 촬영본은 거울 방향으로 저장되므로(2026-08-18 개정) 두 사진 모두 부위명
          그대로 칠하면 시각적으로 같은 편이 붙는다 — 교차·표시 반전 없음. */}
      {/* 퀵은 세그멘테이션이 없어 캔버스가 빈 검은 상자 두 개로 남는다 — 통째로 뺀다 */}
      {!isQuick && <section className="comparison-analysis-images" aria-label="현재 체형과 목표 레퍼런스 비교">
        <PhotoWithOverlay seg={segmentation?.user ?? null} selected={selected} label="현재 체형" />
        <PhotoWithOverlay seg={segmentation?.reference ?? null} selected={selected} label="목표 레퍼런스" />
      </section>}

      {/* 별표 대신 강조색 점을 앞에 두는 칩 — 각주가 아니라 안내로 읽히게 한다.
          점은 CSS ::before 로 그린다 (문자로 넣으면 스크린리더가 읽어버린다). */}
      {!isQuick && <p className="comparison-analysis-help">부위를 선택하면 맞춤 솔루션을 볼 수 있어요</p>}
      {!isQuick && <nav className="comparison-analysis-parts" aria-label="분석 부위 선택">
        {parts.map(part => <button
          className={part.class_name === selected?.class_name ? 'is-selected' : ''}
          type="button" key={part.class_name}
          aria-pressed={part.class_name === selected?.class_name}
          onClick={() => setSelectedClass(part.class_name)}>{part.name_ko ?? part.class_name}</button>)}
      </nav>}

      {/* ⚠️ 진단 블록 · 버튼 · 안내문구는 **한 흐름으로 묶어야 한다.** 종전에는 셋 다
          절대 좌표(2092 / 2410 / 2530px)로 고정돼 있었는데, 진단 카드는 differences
          줄이 붙으면 세로로 자란다. 그만큼 버튼과의 간격만 줄어들었다(52px → 19px).
          흐름으로 두면 블록이 얼마나 자라든 아래가 같이 밀려 내려간다. */}
      <div className="comparison-analysis-footer">
      {!isQuick && <section className="comparison-analysis-diagnosis" aria-labelledby="comparison-diagnosis-title">
        <h2 id="comparison-diagnosis-title">
          <em>{selected?.name_ko ?? selected?.class_name ?? '부위'}</em>의 진단 결과
          {/* 차이 정도를 색으로도 읽히게 한다 — 노랑(차이 없음) → 빨강(큰 차이).
              ⚠️ 색은 거들 뿐이고 문구가 정보를 다 담는다. 색만으로 뜻이 갈리면
                 색을 구분하기 어려운 사람에게는 배지가 통째로 사라지는 셈이다. */}
          {selected?.gap_level && <span className={`comparison-analysis-gap comparison-analysis-gap--${selected.gap_level.toLowerCase()}`}>{GAP_LABELS[selected.gap_level] ?? selected.gap_level}</span>}
          {selected?.blocked_reason && <span className="comparison-analysis-badge">{selected.blocked_reason}{analysis?.inbody_id ? ' · 인바디 기준' : ''}</span>}
          {selected?.confidence === 'LOW' && <span className="comparison-analysis-badge comparison-analysis-badge--dim">신뢰도 낮음</span>}
        </h2>
        <div className={selected?.confidence === 'LOW' ? 'is-low-confidence' : ''}>
          <span><img src={comparisonCommentCircle} alt="" /><BodyPartIcon className="comparison-analysis-comment-icon" partClassName={selected?.class_name} label={`${selected?.name_ko ?? '선택 부위'} 아이콘`} /></span>
          <section>
            <h3>AI 코멘트</h3>
            {selected?.gap_level === null && selected?.blocked_reason
              ? <p>이 부위는 사진으로 확인이 어려웠어요 — {selected.blocked_reason}</p>
              : <p>{selected?.assessment ?? '이 부위의 진단을 준비하고 있어요.'}</p>}
            {selected?.differences?.length ? <p className="comparison-analysis-differences">{selected.differences.join(' · ')}</p> : null}
          </section>
        </div>
      </section>}

      <button className="comparison-analysis-routine" type="button" onClick={onCreateRoutine}>맞춤 루틴 생성 →</button>

      {/* 비교에서 빠진 부위 안내. ⚠️ 예전에 strengths/cautions/excluded 를 요약
          상자 «안에» 그렸다가 세 값이 다 있을 때만 나타나는 구조라 세션마다
          박스 높이가 들쭉날쭉해서 뺐다(위 주석 참고). 이번엔 흐름(footer)
          안에 독립된 섹션으로 둬서 — 있든 없든 아래 고지문이 그만큼만
          밀려 내려갈 뿐, 다른 절대좌표 요소와 안 겹친다. */}
      {!isQuick && !!overall?.comparison_limitations?.length && (
        <section className="comparison-analysis-limitations" aria-label="비교에서 제외된 부위">
          <h3>비교에서 제외된 부위</h3>
          <ul>
            {overall.comparison_limitations.map(text => <li key={text}>{text}</li>)}
          </ul>
        </section>
      )}

      {/* ⚠️ 서버 disclaimer 는 «의학 고지 + 데이터 처리 고지» 두 문장이다. 이 화면에서는
          앞쪽(의학)만 보여준다 — 뒤쪽(외부 AI 전송·삭제 안내)은 요청으로 뺐다.
          자르는 기준은 '상담하세요.' 이므로, 서버 문구가 바뀌면 여기도 같이 봐야 한다. */}
      {medicalDisclaimer && <p className="comparison-analysis-disclaimer"><span>{medicalDisclaimer}</span></p>}
      </div>
    </section>
  </main>
}
