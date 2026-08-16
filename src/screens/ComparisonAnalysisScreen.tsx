import { useEffect, useRef, useState } from 'react'
import comparisonCommentCircle from '../assets/comparison-analysis-comment-circle.svg'
import comparisonCommentIcon from '../assets/comparison-analysis-comment-icon.svg'
import comparisonScoreTrack from '../assets/comparison-analysis-score-track.svg'
import type { AnalysisPart, AnalysisResult, SegmentationInfo, SessionSegmentation } from '../lib/api'

const GAP_LABELS: Record<string, string> = {
  NONE: '차이 거의 없음',
  SLIGHT: '약간의 차이',
  MODERATE: '보통 수준의 차이',
  SIGNIFICANT: '큰 차이',
}

const SCORE_RING_RADIUS = (300 - 24.83) / 2
const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * SCORE_RING_RADIUS

/**
 * 사진 + 선택 부위 세그멘테이션 오버레이.
 * 맵은 8-bit 그레이스케일 PNG(픽셀 값 = label_value)라서 원본 해상도에서 픽셀을
 * 읽어 색칠한 뒤, 사진이 cover로 그려지는 것과 같은 변환으로 얹는다 — bbox·좌표는
 * 맵 좌표계이므로 원본 배율(sx·sy)을 따로 곱해야 한다는 규칙을 여기서 지킨다.
 */
function PhotoWithOverlay({ seg, selected, label }: { seg: SegmentationInfo | null; selected: AnalysisPart | null; label: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    if (!box || !canvas) return
    const cw = box.clientWidth
    const ch = box.clientHeight
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cw, ch)
    if (!seg || !selected) return
    const entry = seg.palette.find(item => item.class_name === selected.class_name)
    if (!entry) return

    let cancelled = false
    const mapImage = new Image()
    mapImage.crossOrigin = 'anonymous' // 픽셀을 읽어야 해서 필요 — 실패하면 오버레이만 생략
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
        for (let i = 0; i < labels.data.length; i += 4) {
          if (labels.data[i] === entry.label_value) {
            colored.data[i] = r
            colored.data[i + 1] = g
            colored.data[i + 2] = b
            colored.data[i + 3] = 150
          }
        }
        offCtx.putImageData(colored, 0, 0)
        // 사진(object-fit: cover)과 같은 변환 — 맵과 사진은 같은 장면이므로 배율만 맞추면 된다
        const pw = seg.photo_width ?? seg.map_width
        const ph = seg.photo_height ?? seg.map_height
        const scale = Math.max(cw / pw, ch / ph)
        ctx.drawImage(off, (cw - pw * scale) / 2, (ch - ph * scale) / 2, pw * scale, ph * scale)
      } catch {
        // 스토리지 CORS 미허용 등으로 픽셀을 못 읽으면 색칠만 생략 (사진은 그대로 보임)
      }
    }
    mapImage.src = seg.map_url
    return () => { cancelled = true }
  }, [seg, selected])

  return <div ref={boxRef} className="comparison-analysis-photo">
    {seg && <img className="comparison-analysis-photo__img" src={seg.photo_url} alt={label} />}
    <canvas ref={canvasRef} className="comparison-analysis-photo__overlay" aria-hidden="true" />
    <span className="comparison-analysis-photo__label">{label}</span>
  </div>
}

type ComparisonAnalysisScreenProps = {
  analysis: AnalysisResult | null
  segmentation: SessionSegmentation | null
  onCreateRoutine: () => void
}

/** Figma 41:189 — 비교 분석. 모든 수치·문구는 GET /analysis · /segmentation 응답에서 온다. */
export function ComparisonAnalysisScreen({ analysis, segmentation, onCreateRoutine }: ComparisonAnalysisScreenProps) {
  const parts = analysis?.parts ?? []
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const selected = parts.find(part => part.class_name === selectedClass) ?? parts[0] ?? null

  const overall = analysis?.overall ?? null
  const score = overall?.similarity_score ?? null
  const filled = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100

  const priorityName = overall?.priority_parts?.length
    ? parts.find(part => part.class_name === overall.priority_parts[0])?.name_ko ?? null
    : null
  const headline = priorityName ? `${priorityName} 중심 개선 필요` : '개선 포인트 요약'

  const excluded = analysis?.excluded ?? []

  return <main className="comparison-analysis-viewport" aria-label="비교 분석">
    <section className="comparison-analysis-page">
      <header className="comparison-analysis-header">
        <p>분석이 완료되었어요</p>
        <h1>레퍼런스 비교 분석 결과</h1>
        <span>현재 체형 vs 목표 레퍼런스</span>
      </header>

      <section className="comparison-analysis-score" aria-label={`유사도 점수 ${score ?? '미산출'}점`}>
        <img className="comparison-analysis-score__track" src={comparisonScoreTrack} alt="" />
        <svg className="comparison-analysis-score__fill" viewBox="0 0 300 300" aria-hidden="true">
          <circle cx="150" cy="150" r={SCORE_RING_RADIUS} fill="none" stroke="#FFE250" strokeWidth="24.83" strokeLinecap="round"
            strokeDasharray={SCORE_RING_CIRCUMFERENCE} strokeDashoffset={SCORE_RING_CIRCUMFERENCE * (1 - filled)}
            transform="rotate(-90 150 150)" />
        </svg>
        <span>유사도 점수</span>
        <strong>{score ?? '—'}점</strong>
        {overall?.score_rationale && <p className="comparison-analysis-score__rationale">{overall.score_rationale}</p>}
      </section>

      <section className="comparison-analysis-summary" aria-labelledby="comparison-summary-title">
        <h2 id="comparison-summary-title">AI 핵심 요약</h2>
        <div>
          <strong>{headline}</strong>
          <p>{overall?.summary ?? '요약을 준비하고 있어요.'}</p>
        </div>
        {(overall?.strengths?.length || overall?.cautions?.length) ? <ul className="comparison-analysis-notes">
          {overall?.strengths?.map(item => <li key={item}>💪 {item}</li>)}
          {overall?.cautions?.map(item => <li key={item}>⚠️ {item}</li>)}
        </ul> : null}
      </section>

      <p className="comparison-analysis-count">총 <em>{parts.length}건</em>의 부위별 진단 결과</p>

      <section className="comparison-analysis-images" aria-label="현재 체형과 목표 레퍼런스 비교">
        <PhotoWithOverlay seg={segmentation?.user ?? null} selected={selected} label="현재 체형" />
        <PhotoWithOverlay seg={segmentation?.reference ?? null} selected={selected} label="목표 레퍼런스" />
      </section>

      <p className="comparison-analysis-help">* 부위를 선택하면 맞춤 솔루션을 볼 수 있어요.</p>
      <nav className="comparison-analysis-parts" aria-label="분석 부위 선택">
        {parts.map(part => <button
          className={part.class_name === selected?.class_name ? 'is-selected' : ''}
          type="button" key={part.class_name}
          aria-pressed={part.class_name === selected?.class_name}
          onClick={() => setSelectedClass(part.class_name)}>{part.name_ko ?? part.class_name}</button>)}
      </nav>

      <section className="comparison-analysis-diagnosis" aria-labelledby="comparison-diagnosis-title">
        <h2 id="comparison-diagnosis-title">
          <em>{selected?.name_ko ?? selected?.class_name ?? '부위'}</em>의 진단 결과
          {selected?.gap_level && <span className="comparison-analysis-gap">{GAP_LABELS[selected.gap_level] ?? selected.gap_level}</span>}
          {selected?.blocked_reason && <span className="comparison-analysis-badge">{selected.blocked_reason}{analysis?.inbody_id ? ' · 인바디 기준' : ''}</span>}
          {selected?.confidence === 'LOW' && <span className="comparison-analysis-badge comparison-analysis-badge--dim">신뢰도 낮음</span>}
        </h2>
        <div className={selected?.confidence === 'LOW' ? 'is-low-confidence' : ''}>
          <span><img src={comparisonCommentCircle} alt="" /><img src={comparisonCommentIcon} alt="" /></span>
          <section>
            <h3>AI 코멘트</h3>
            {selected?.gap_level === null && selected?.blocked_reason
              ? <p>이 부위는 사진으로 확인이 어려웠어요 — {selected.blocked_reason}</p>
              : <p>{selected?.assessment ?? '이 부위의 진단을 준비하고 있어요.'}</p>}
            {selected?.differences?.length ? <p className="comparison-analysis-differences">{selected.differences.join(' · ')}</p> : null}
          </section>
        </div>
      </section>

      {excluded.length > 0 && <section className="comparison-analysis-excluded" aria-label="비교에서 제외된 부위">
        {excluded.map(part => <p key={part.class_name}>제외됨 — {part.name_ko ?? part.class_name}: {part.reason}</p>)}
      </section>}

      <button className="comparison-analysis-routine" type="button" onClick={onCreateRoutine}>맞춤 루틴 생성 →</button>

      {analysis?.disclaimer && <p className="comparison-analysis-disclaimer">{analysis.disclaimer}</p>}
    </section>
  </main>
}
