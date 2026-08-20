import { useEffect, useRef, useState } from 'react'
import comparisonCommentCircle from '../assets/comparison-analysis-comment-circle.svg'
import comparisonCommentIcon from '../assets/comparison-analysis-comment-icon.svg'
import comparisonScoreTrack from '../assets/comparison-analysis-score-track.svg'
import type { AnalysisPart, AnalysisResult, SegmentationInfo, SessionSegmentation } from '../lib/api'
import { PreviousButton } from '../components/PreviousButton'

const GAP_LABELS: Record<string, string> = {
  NONE: '차이 거의 없음',
  SLIGHT: '약간의 차이',
  MODERATE: '보통 수준의 차이',
  SIGNIFICANT: '큰 차이',
}

const SCORE_RING_RADIUS = (300 - 24.83) / 2
const SCORE_RING_CIRCUMFERENCE = 2 * Math.PI * SCORE_RING_RADIUS

function displayPartName(name: string | null | undefined): string {
  return (name ?? '부위').replaceAll('팔뚝', '전완').replaceAll('위팔', '상완')
}

/**
 * 사진 + 선택 부위 세그멘테이션 색칠을 **캔버스 한 장에 원본 해상도로 합성**한다.
 * 맵은 원본 사진 전체의 단순 스트레치(크롭·패딩 없음)라 배율만 맞추면 정확히
 * 겹치고, 한 캔버스이므로 CSS에서 cover/contain 무엇을 걸어도 같이 변형된다.
 * 선택 부위 bbox(맵 좌표계) 바깥은 칠하지 않는다 — 모델 오검출 노이즈 필터.
 */
function PhotoWithOverlay({ seg, photoUrl, selected, label }: { seg: SegmentationInfo | null; photoUrl?: string | null; selected: AnalysisPart | null; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // ⚠️ 세그가 없어도 **사진은 그린다** (2026-08-20). 퀵/웹캠 경로는 Sapiens2 를
    //    안 돌려 세그가 없는데, 종전에는 여기서 그냥 지우고 끝내서 화면에 빈
    //    검은 상자 두 개만 남았다. 색칠(부위 오버레이)만 세그가 필요하다.
    if (!seg) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      if (!photoUrl) return
      let cancelledPlain = false
      const plain = new Image()
      plain.onload = () => {
        if (cancelledPlain) return
        canvas.width = plain.naturalWidth
        canvas.height = plain.naturalHeight
        canvas.getContext('2d')?.drawImage(plain, 0, 0)
      }
      plain.src = photoUrl
      return () => { cancelledPlain = true }
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
  }, [seg, photoUrl, selected])

  return <div className="comparison-analysis-photo">
    <canvas ref={canvasRef} className="comparison-analysis-photo__canvas" role="img" aria-label={label} />
    <span className="comparison-analysis-photo__label">{label}</span>
  </div>
}

type ComparisonAnalysisScreenProps = {
  analysis: AnalysisResult | null
  segmentation: SessionSegmentation | null
  /** 세그가 없을 때(퀵/웹캠) 사진만이라도 그리기 위한 원본 URL. */
  photoUrls?: { user: string | null; reference: string | null } | null
  onCreateRoutine: () => void
  onPrevious?: () => void
}

/** Figma 41:189 — 비교 분석. 모든 수치·문구는 GET /analysis · /segmentation 응답에서 온다. */
export function ComparisonAnalysisScreen({ analysis, segmentation, photoUrls, onCreateRoutine, onPrevious }: ComparisonAnalysisScreenProps) {
  const parts = analysis?.parts ?? []
  // 시각적으로 판별이 안 된 부위(gap_level null — 옷/각도로 못 봄)는 버튼도, 기본
  // 선택 대상도 되지 않는다. 눌러도 "확인 못 했다"만 나오는 버튼을 없애는 것이다 —
  // 그 사유는 위의 comparison_limitations 안내문이 이미 부위 이름과 함께 보여준다.
  const judgedParts = parts.filter(part => part.gap_level != null)
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const selected = judgedParts.find(part => part.class_name === selectedClass) ?? judgedParts[0] ?? null

  const overall = analysis?.overall ?? null
  const score = overall?.similarity_score ?? null
  const filled = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100

  const priorityName = overall?.priority_parts?.length
    ? parts.find(part => part.class_name === overall.priority_parts[0])?.name_ko ?? null
    : null
  const headline = priorityName ? `${priorityName} 중심 개선 필요` : '개선 포인트 요약'

  // 세그(색칠) 또는 원본 사진 중 **하나라도** 있으면 비교 이미지 섹션을 그린다.
  // ⚠️ 퀵(웹캠)은 Sapiens2 를 안 돌려 세그가 없다 — 세그만 조건으로 걸면
  //    빈 검은 상자 두 개가 뜬다 (2026-08-20 실측). 세그가 없으면 색칠 없이
  //    사진만 그린다 (PhotoWithOverlay 의 photoUrl 경로).
  const hasImages = Boolean(
    (segmentation?.user && segmentation?.reference) || (photoUrls?.user && photoUrls?.reference),
  )

  const disclaimer = analysis?.disclaimer
  const disclaimerBoundary = '상담하세요.'
  const disclaimerBoundaryIndex = disclaimer?.indexOf(disclaimerBoundary) ?? -1
  const medicalDisclaimer = disclaimerBoundaryIndex >= 0
    ? disclaimer?.slice(0, disclaimerBoundaryIndex + disclaimerBoundary.length)
    : disclaimer
  const dataDisclaimer = disclaimerBoundaryIndex >= 0
    ? disclaimer?.slice(disclaimerBoundaryIndex + disclaimerBoundary.length).trim()
    : null

  return <main className="comparison-analysis-viewport" aria-label="비교 분석">
    <section className="comparison-analysis-page">
      <header className="comparison-analysis-header">
        {onPrevious && <PreviousButton onClick={onPrevious} />}
        <p>분석이 완료되었어요</p>
        <h1>레퍼런스 비교 분석 결과</h1>
        <span>현재 체형 vs 목표 레퍼런스</span>
      </header>

      {/* 산출 근거(score_rationale)는 본문에 그리면 링과 겹쳐서 툴팁으로만 제공 */}
      <section className="comparison-analysis-score" aria-label={`유사도 점수 ${score ?? '미산출'}점`} title={overall?.score_rationale ?? undefined}>
        <img className="comparison-analysis-score__track" src={comparisonScoreTrack} alt="" />
        <svg className="comparison-analysis-score__fill" viewBox="0 0 300 300" aria-hidden="true">
          <circle cx="150" cy="150" r={SCORE_RING_RADIUS} fill="none" stroke="#FFE250" strokeWidth="24.83" strokeLinecap="round"
            strokeDasharray={SCORE_RING_CIRCUMFERENCE} strokeDashoffset={SCORE_RING_CIRCUMFERENCE * (1 - filled)}
            transform="rotate(-90 150 150)" />
        </svg>
        <span>유사도 점수</span>
        <strong>{score ?? '—'}점</strong>
      </section>

      <section className="comparison-analysis-summary" aria-labelledby="comparison-summary-title">
        <h2 id="comparison-summary-title">AI 핵심 요약</h2>
        <div>
          <strong>{headline}</strong>
          <p>{overall?.summary ?? '요약을 준비하고 있어요.'}</p>
        </div>
        {(overall?.strengths?.length || overall?.cautions?.length || overall?.comparison_limitations?.length) ? <ul className="comparison-analysis-notes">
          {overall?.strengths?.map(item => <li key={item}>💪 {item}</li>)}
          {overall?.cautions?.map(item => <li key={item}>⚠️ {item}</li>)}
          {/* comparison_limitations 은 "이름: 사유" 문장 목록(규칙이 만든다, handlers/vlm.py
              `_comparison_limitations`) — 진단은 됐지만 gap_level 이 null 인 부위(옷·각도로
              blocked)와 아예 검출 안 된 부위를 **둘 다** 담는다. `excluded`(analysis.excluded)만
              쓰면 blocked 부위는 이 줄에서 조용히 빠진다 — 실제로 몸통이 blocked 됐는데
              안내가 하나도 안 뜬 사고가 있었다. 이름만 뽑아 한 문장으로 합친다. */}
          {!!overall?.comparison_limitations?.length && (
            <li>⚠️ {overall.comparison_limitations.map(text => text.split(':')[0].trim()).join(', ')} 부위는 시각적 판별이 어려워서 비교 분석에서 제외되었습니다.</li>
          )}
        </ul> : null}
      </section>

      {/* 판별된 부위만 센다 — 못 본 부위는 아래 버튼에도 안 나오므로 숫자가 어긋난다. */}
      <p className="comparison-analysis-count">총 <em>{judgedParts.length}건</em>의 부위별 진단 결과</p>

      {/* 촬영본은 거울 방향으로 저장되므로(2026-08-18 개정) 두 사진 모두 부위명
          그대로 칠하면 시각적으로 같은 편이 붙는다 — 교차·표시 반전 없음. */}
      {/* ⚠️ 세그가 없어도(퀵/웹캠) **사진은 그린다** (2026-08-20). 종전에는 세그
          맵이 없으면 캔버스가 빈 채로 남아 화면에 검은 상자 두 개만 보였다 —
          사용자에게는 "사진이 안 뜬다"로 읽힌다. 색칠만 세그가 필요하고 사진
          자체는 photo 행만으로 그릴 수 있다. */}
      {hasImages && <section className="comparison-analysis-images" aria-label="현재 체형과 목표 레퍼런스 비교">
        <PhotoWithOverlay seg={segmentation?.user ?? null} photoUrl={photoUrls?.user} selected={selected} label="현재 체형" />
        <PhotoWithOverlay seg={segmentation?.reference ?? null} photoUrl={photoUrls?.reference} selected={selected} label="목표 레퍼런스" />
      </section>}

      <p className="comparison-analysis-help">* 부위를 선택하면 맞춤 솔루션을 볼 수 있어요. 왼팔/오른팔 구분은 사진에 보이는 방향 기준이에요.</p>
      {/* 시각적으로 판별이 안 된 부위(gap_level null)는 버튼을 만들지 않는다 —
          눌러도 "확인 못 했다"만 나오는 버튼이라, 아래 제외 안내가 사유를 대신한다. */}
      <nav className="comparison-analysis-parts" aria-label="분석 부위 선택">
        {judgedParts.map(part => <button
          className={part.class_name === selected?.class_name ? 'is-selected' : ''}
          type="button" key={part.class_name}
          aria-pressed={part.class_name === selected?.class_name}
          onClick={() => setSelectedClass(part.class_name)}>{displayPartName(part.name_ko ?? part.class_name)}</button>)}
      </nav>

      {/* ⚠️ App.css 892-906행이 진단·버튼·고지문을 "한 흐름"으로 묶는 전제로 짜여
          있다 — 위의 모든 섹션(점수·요약·사진·부위 버튼)은 Figma 절대좌표라 흐름에
          안 잡히고, 이 셋만 static 이라 이 wrapper 가 없으면 페이지에서 flow에
          참여하는 첫 요소가 돼서 맨 위로 올라간다(2026-08-20 실측 — 버튼이 헤더보다
          위에 뜸). margin-top(2177px, App.css:903)이 이 div 에 붙어야 제자리로 내려간다. */}
      <div className="comparison-analysis-footer">
        <section className="comparison-analysis-diagnosis" aria-labelledby="comparison-diagnosis-title">
          <h2 id="comparison-diagnosis-title">
            <em>{displayPartName(selected?.name_ko ?? selected?.class_name)}</em>의 진단 결과
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

        <button className="comparison-analysis-routine" type="button" onClick={onCreateRoutine}>맞춤 루틴 생성 →</button>

        {medicalDisclaimer && <p className="comparison-analysis-disclaimer"><span>{medicalDisclaimer}</span>{dataDisclaimer && <span>{dataDisclaimer}</span>}</p>}
      </div>
    </section>
  </main>
}
