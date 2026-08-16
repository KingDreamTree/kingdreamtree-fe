import inbodyInfo from '../assets/inbody-info.svg'

type InbodyWimDialogProps = { open: boolean; onClose: () => void; onConnect: () => void }

/** WIM 마이데이터 연동 안내 모달 — 바깥을 클릭하면 닫힌다. */
export function InbodyWimDialog({ open, onClose, onConnect }: InbodyWimDialogProps) {
  if (!open) return null
  return <>
    <button className="inbody-wim-backdrop" type="button" aria-label="팝업 닫기" onClick={onClose} />
    <section className="inbody-wim-modal" role="dialog" aria-modal="true" aria-labelledby="inbody-wim-title">
      <span className="inbody-wim-modal__icon"><img src={inbodyInfo} alt="" /></span>
      <h2 id="inbody-wim-title">WIM 회원이신가요?</h2>
      <p>WIM 회원이시면 인바디 정보를 연동하여<br />업로드 할 수 있어요!</p>
      <button type="button" onClick={onConnect}>마이데이터 연동하기</button>
    </section>
  </>
}
