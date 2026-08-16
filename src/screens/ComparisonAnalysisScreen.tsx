import { useState } from 'react'
import comparisonCommentCircle from '../assets/comparison-analysis-comment-circle.svg'
import comparisonCommentIcon from '../assets/comparison-analysis-comment-icon.svg'
import comparisonHighlight from '../assets/comparison-analysis-highlight.svg'
import comparisonScoreProgress from '../assets/comparison-analysis-score-progress.svg'
import comparisonScoreTrack from '../assets/comparison-analysis-score-track.svg'
import comparisonSource from '../assets/comparison-analysis-source.png'

const bodyParts = ['왼쪽팔', '오른쪽팔', '상체부', '왼쪽하체', '오른쪽하체']

/** Figma 41:189 — 비교 분석 */
export function ComparisonAnalysisScreen({ onCreateRoutine }: { onCreateRoutine: () => void }) {
  const [selectedPart, setSelectedPart] = useState(bodyParts[0])
  return <main className="comparison-analysis-viewport" aria-label="비교 분석">
    <section className="comparison-analysis-page">
      <header className="comparison-analysis-header">
        <p>분석이 완료되었어요</p>
        <h1>레퍼런스 비교 분석 결과</h1>
        <span>현재 체형 vs 목표 레퍼런스</span>
      </header>

      <section className="comparison-analysis-score" aria-label="유사도 점수 58점">
        <img className="comparison-analysis-score__track" src={comparisonScoreTrack} alt="" />
        <img className="comparison-analysis-score__progress" src={comparisonScoreProgress} alt="" />
        <span>유사도 점수</span>
        <strong>58점</strong>
      </section>

      <section className="comparison-analysis-summary" aria-labelledby="comparison-summary-title">
        <h2 id="comparison-summary-title">AI 핵심 요약</h2>
        <div>
          <strong>상체 중심 개선 필요</strong>
          <p>레퍼런스 사진의 체형과 비교했을 때 상체 부분을 발달시켜야해요!</p>
        </div>
      </section>

      <p className="comparison-analysis-count">총 <em>6건</em>의 부위별 진단 결과</p>

      <section className="comparison-analysis-images" aria-label="현재 체형과 목표 레퍼런스 비교">
        <div><img src={comparisonSource} alt="현재 체형" /></div>
        <div><img src={comparisonSource} alt="목표 레퍼런스" /><img className="comparison-analysis-images__highlight" src={comparisonHighlight} alt="왼쪽 팔 강조" /></div>
      </section>

      <p className="comparison-analysis-help">* 부위를 선택하면 맞춤 솔루션을 볼 수 있어요.</p>
      <nav className="comparison-analysis-parts" aria-label="분석 부위 선택">
        {bodyParts.map(part => <button className={part === selectedPart ? 'is-selected' : ''} type="button" key={part} aria-pressed={part === selectedPart} onClick={() => setSelectedPart(part)}>{part}</button>)}
      </nav>

      <section className="comparison-analysis-diagnosis" aria-labelledby="comparison-diagnosis-title">
        <h2 id="comparison-diagnosis-title"><em>{selectedPart}</em>의 진단 결과</h2>
        <div>
          <span><img src={comparisonCommentCircle} alt="" /><img src={comparisonCommentIcon} alt="" /></span>
          <section>
            <h3>AI 코멘트</h3>
            <p>목표 레퍼런스와 비교했을 때 현재 왼쪽 이두근의 입체감이 다소 부족한 상태입니다.<br />좌우 균형감을 맞추려면 왼쪽 이두근을 집중적으로 자극하는 강화 루틴이 병행되어야 합니다.</p>
          </section>
        </div>
      </section>

      <button className="comparison-analysis-routine" type="button" onClick={onCreateRoutine}>맞춤 루틴 생성 →</button>
    </section>
  </main>
}
