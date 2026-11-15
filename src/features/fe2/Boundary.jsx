import { Component } from 'react'

export default class Fe2Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <main className="fe2-state" role="alert"><h1 className="title-2">화면을 표시하지 못했어요</h1><p>잠시 뒤 다시 열어 주세요. 작성 중인 내용은 다시 열면 유지되지 않을 수 있어요.</p><button type="button" className="fe2-button fe2-primary" onClick={()=>window.location.reload()}>다시 열기</button><a href="/vault" className="fe2-button fe2-secondary">금고로</a></main>
    return this.props.children
  }
}
