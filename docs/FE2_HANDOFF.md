> 최신 통합 상태·API 보완·검증 한계는 [FRONTEND_INTEGRATION_QA.md](FRONTEND_INTEGRATION_QA.md)를 우선 확인하세요. 아래의 미통합/이전 계약 문구는 당시 검토 이력입니다.

> 2026-11-16 통합: origin/main 60c45c389c8588aaa31ac0c1f2c5dadf3f0d0f8b(FE1 홈·시작·게스트 인증)을 feat/fe2에 병합했다. main 직접 변경 없음. FE2 최초 업로드는 91b6b771173766424c726edff66269f69b6b5b62이다. 과거 보류·FE1 미포함 문구는 당시 검수 이력이다.

> 디자인 최신 재검수: [FE2_DESIGN_RECHECK.md](FE2_DESIGN_RECHECK.md). Git 업로드/통합은 디자인 확인 때문에 보류했다.

# FE2 통합·출시 인계

확인일: 2026-11-15. FE 기반: TEAM_20_FE main 698aebf. 작업 브랜치: feat/fe2.
백엔드 근거는 **20팀** TEAM_20_BE develop **213b5a7a13c33378cf7fa16a3780382a802ca79c**다.
코드를 읽고 프론트를 맞췄으며, 실제 서버를 실행하거나 운영 API에 쓰기를 수행한 결과는 아니다.

- FE: https://github.com/2026Ganzi-Thon/2026_GANZITHON_TEAM_20_FE
- BE 고정 버전: https://github.com/2026Ganzi-Thon/2026_GANZITHON_TEAM_20_BE/tree/213b5a7a13c33378cf7fa16a3780382a802ca79c
- 계약 변환: src/features/fe2/springContract.js
- 통신/쿠키/CSRF: src/features/fe2/api.js

## 실제 API 기준

현재 Spring 응답은 PDF 초안과 달리 data/meta 봉투가 없는 camelCase JSON이다. 운영 어댑터는 아래 계약을 사용하고, 로컬 예시 엔진만 초안 봉투를 유지한다.

| 기능 | 실제 경로·입력 | 화면 처리 |
| --- | --- | --- |
| 기존 게스트 | GET /guest-sessions/current | 미발급은 FE1 홈으로, 자동 게스트 생성 없음 |
| CSRF | GET /csrf → token, headerName | 쓰기 직전 1회 발급, 반환된 이름의 헤더 사용. 거절 시 토큰만 비우고 사용자 재시도에서 재발급, 쓰기 자동 재전송 없음 |
| 금고 | GET /worries?visibility=PUBLIC 또는 LOCKED | 두 커서 분리, 잠김 민감 필드 매핑 금지 |
| 상세 | GET /worries/:id | PUBLIC만 상세 표시, 원문·AI 내용은 서버에서 받음 |
| 최초 열람 | POST /worries/:id/view | 실제 걱정 상세 진입에서 별도 호출. 목록·수정·기록 조회로 열람 처리하지 않음 |
| 정리 수정 | PUT /worries/:id/summary {summary} | 204를 정상 저장으로 처리, 실패 시 초안 유지 |
| 불안도 | PUT /worries/:id/anxiety {anxietyAfter} | 1~5만 전송. 건너뛰기로 기존 점수를 null로 삭제하지 않음 |
| 공개 시각 | PATCH /worries/:id/publication {publishAt} | 공개 이후 변경 거절, 30일 만료 전만 선택 |
| 과거 경험 | GET /worries/:id/past-experience | 204면 카드 숨김 |
| 회고 | /reflections/candidate?currentWorryId=&timeZone= | 후보204 숨김, 응답 PUT에 currentWorryId/timeZone과 {answer} 필요, AS_FEARED 변환 |
| 도움 시작 | POST /worries/:id/activities {helpType,replaceOpen:false} | ACTION/EMPATHY 진입에서 시작, REST는 명시적 시작까지 대기 |
| 활동 복귀 | GET /worries/:id/activities, GET /activities/:id | 서버 저장 활동으로 복귀. ACTION 문구는 공개 상세의 analysis.actionSteps와 결합 |
| 액션 체크 | PUT /activities/:id/steps/:n {done} | 서버 저장 후 표시 |
| 액션 이어하기 | POST /activities/:id/stop | 체크 보존, 다음 start가 서버에서 STOPPED 액션 재개 |
| 휴식 | /activities/:id/pause, resume, stop, complete | 서버 endsAt/remainingSeconds 기준, 0초 자동 완료 없음 |
| 평가 | PUT /activities/:id/feedback {answer} | 활동 완료와 별도 저장 |
| 기록 | GET /records, /records/:id + 활동 이력·회고 | 최신 이력 DESC→ASC 변환 후 마지막 활동/평가 연결 |
| 삭제 | DELETE /worries/:id → 204 또는 202 {status:DELETING} | 204만 즉시 완료. 202/불명확 응답은 성공으로 꾸미지 않음 |
| 시연 | /demo/session, status, presets, time-machine, reset | X-Demo-Key는 패널 입력 후 메모리에서만 전송. VITE_*나 저장소에 키를 넣지 않음 |

## FE1 연결

FE1 Home/Settings/공통 CSS는 수정하지 않았다. 현재 main의 홈·설정은 자리표시자이므로 서비스 전체가 출시 완료인 상태는 아니다.

~~~jsx
import { fe2Links, subscribeFe2Changes } from './features/fe2/integration.js'
// Link to={fe2Links.vault}
// Link to={fe2Links.activity(serverActivityId)}
// useEffect(() => subscribeFe2Changes(refetchHomeSummary), [refetchHomeSummary])
~~~

빈 기록의 ‘걱정 맡기기’는 현재 홈 /에 state.intent=create-worry를 전달한다. FE1 입력 경로가 확정되면 해당 경로로 교체한다. FE1은 본인의 게스트 START 동의 흐름을 유지한다. 새 게스트를 자동 생성하거나 기존 쿠키를 임의로 교체하지 않는다.

진행 활동·예약·카운트는 wooly:data-changed 수신 후 서버에서 재조회한다. FE2 내부 금고·기록은 이미 이 이벤트를 구독한다. 기존 FE1 브랜치와 통합할 때 App.jsx의 라우트만 합치고 FE1 화면을 덮어쓰지 않는다.

## 실행·배포

~~~sh
npm ci
npm run dev
npm run check:release
npm run preview
~~~

.env.example을 기준으로 설정한다. 기본 VITE_API_BASE_URL=/api/v1이며 동일 origin에서 /api를 Spring으로 프록시하는 구성을 권장한다. 개발 중 로컬 Spring이면 API_PROXY_TARGET=http://localhost:8080을 설정한다. 외부 API origin이면 백엔드의 credentials/CORS/쿠키 SameSite/Secure 설정과 CSRF 허용 헤더를 실제 배포 환경에서 확인해야 한다.

VITE_FE2_MOCK=true는 개발 모드에서만 유효하다. 운영 build는 실제 어댑터를 사용하며, 예시 걱정 fixture 포함 여부를 check:release가 검사한다. 원본의 빈 기록 자리표시자는 디자인 보존 대상으로 유지한다. 현재 localhost:5173은 디자인 확인을 위한 예시 모드다. 실제 서버 주소가 제공되기 전까지 예시를 실제 사용자 데이터처럼 보이게 숨기지 않는다.

배포 산출물은 dist다. BrowserRouter이므로 /records/:id 같은 주소를 직접 열어도 index.html로 연결해야 한다. /api 오류를 index.html로 돌려주면 안 된다. deploy/nginx.conf.example은 경로/서버명을 교체할 참고 설정이다. TLS 종단과 프록시의 신뢰할 수 있는 X-Forwarded-Proto 전달은 배포 환경에 맞춘다. index.html은 장기 캐시하지 않고 해시 assets만 장기 캐시한다. 걱정 데이터/API는 캐시하지 않는다.

## 팀 확인이 필요한 출시 조건

| 항목 | 현재 상태 | 필요한 확인 |
| --- | --- | --- |
| 실제 서버 E2E | 코드·모의 HTTP 검증만 완료 | 실제 게스트 쿠키, CSRF, 소유권, 공개 경계, 활동 복귀, 삭제를 브라우저에서 검증 |
| DELETE202 완료 판정 | 현재 BE에 job/status API 없음 | 백엔드가 항상 최종204를 반환하거나 완료 판정 API/계약을 제공해야 함. 404만으로 삭제 성공을 단정하지 않음 |
| 도움 전환 동시성 | 이력 조회→확인→stop, 다음 화면 start | 예상 활동ID/버전의 원자적 전환을 서버에서 보장하는 계약이 아직 없음. 다른 탭 동시 변경 조건을 통합 검증 |
| FE1 입력/홈 | main에 자리표시자 | FE1 완성 코드 머지·게스트 시작·입력 경로·홈 재조회 연결 |
| 디자인 최종 원본 | 제공 PDF/PNG/SVG 기준 구현 | 디자인팀 SUITE 원본 버전, 미제공 나이트·휴식 재개/0초 시안 확인 |
| 최종 기기·배포 검사 | 데스크톱 Chrome에서 모바일 크기 검증 | 실제 iPhone Safari/Android Chrome의 입력·뒤로가기·탭 복귀·세로 회전·HTTPS 쿠키 검증 |

위 조건이 통과하기 전 ‘연결만 하면 무조건 즉시 출시 가능’으로 판정하지 않는다. 백엔드 원본·Figma 원본·원격 저장소는 변경하지 않았다.
