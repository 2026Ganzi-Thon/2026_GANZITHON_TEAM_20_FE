import { Link } from 'react-router-dom'
import { isNight } from './domain.js'
export default function NotFound(){
  return <div className={'fe2-layout '+(isNight(new Date())?'theme-night':'theme-morning')}><main className="fe2-state"><h1 className="title-2">페이지를 찾을 수 없어요</h1><p>주소를 확인하거나 금고에서 다시 선택해 주세요.</p><Link className="fe2-button fe2-primary" to="/vault">금고로</Link><Link className="fe2-button fe2-secondary" to="/">홈으로</Link></main></div>
}
