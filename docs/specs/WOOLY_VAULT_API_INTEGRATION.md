# Wooly Vault — BE1·BE2·AI API 통합 문서

> 저장일: 2026-11-12 (한국 기준)
> 원본: BE1_BE2_AI_API 통합 문서.pdf, 25쪽
> 원본 버전: v1.0-draft / 작성 기준 2026-11-09
> **팀 합의 전 제안 계약**이다. 실제 서버가 구현·배포·검증되었다는 의미가 아니다.

원본의 모든 25쪽을 페이지별 텍스트로 보존하고, 앞부분에 FE2 개발용 연결표와 주의점을 추가했다. 원문에 포함된 엔드포인트·DTO·enum·DB·타임아웃·내부 처리값은 원본이 명시한 설계 제안으로 취급한다. 아래 정리는 PDF를 읽고 작성한 개발 참고사항이며 팀의 확정 결정을 대신하지 않는다.

## 연결 문서와 담당 범위

- [서비스 기획안](WOOLY_VAULT_PLAN.md)
- [와이어프레임 상세](WOOLY_VAULT_WIREFRAMES.md)
- [Swagger API 전체](WOOLY_VAULT_SWAGGER_API.md)
- 사용자 담당: **FE2 — S-07~14, S-18 중심. 금고·잠금 안내·상세·도움 활동·회고·기록·시연**
- Figma 원본은 절대 변경하지 않는다. 현재 작업은 PDF 조회와 별도 MD 저장이다.

원본이 선언한 업무 정책 적용 순서: 화면·동작 정책 → 기능명세서 → 수정 기획안. 원본은 별도 위기 대응 정책이 필요함도 명시한다. 이 대화에 제공되지 않은 참조 문서까지 읽은 것으로 취급하지 않는다. 실제 구현 시 API 확정본·최신 YAML·팀 합의와 함께 확인한다.

## 역할 경계와 공통 계약

| 항목 | 원본 제안 / FE2 적용 |
| --- | --- |
| BE1 | 게스트·권한·접수·AI 오케스트레이션·공개·금고/상세·푸시·위기 |
| BE2 | 도움·활동·평가·회고·기록·공통 삭제·만료·시연 |
| AI | 서버 내부에서만 호출. FE에 공급자 키·내부 토큰·직접 모델 호출을 넣지 않음 |
| 공개 API 기본 경로 | {API_BASE_URL}/api/v1. 실제 서버 주소는 미제공 |
| 인증 | HttpOnly; Secure; SameSite=Lax 서버 세션 쿠키 제안 |
| 쓰기 보안 | X-CSRF-Token + Origin 검사 제안. GET /session 발급 토큰 연동 |
| 시간 | 서버 UTC ISO 8601 기준, 화면은 사용자 IANA 시간대 표시 |
| 멱등성 | 제출·활동 생성·명시적 완료 등 문서에 지정된 요청의 Idempotency-Key 유지 |
| 성공 | data + meta. meta.request_id는 관찰용이고 data.request_id의 분석 요청 ID와 구분 |
| 실패 | error.code / message / retryable / details / field_errors + meta |
| 204 | 응답 본문 없음. 무조건 JSON 파싱하지 않음 |
| 페이지네이션 | 불투명 cursor / next_cursor, 기본 limit 20 |
| 접근 검사 | 조회·쓰기마다 소유권·공개·삭제·만료 재확인 |
| 민감 데이터 | no-store, URL·일반 로그·오류 리포트·사용 분석에 원문·AI 응답·구독 비밀정보 금지 |
| 문자 수 | Array.from(s).length 코드포인트 제안. 공백 제외 최소 1, 공백 포함 최대 길이 |
| 보관 | accepted_at + 30일 제안. 수정·열람·재시도로 연장하지 않음 |

## 화면별 FE2 API 연결표

경로는 공개 API 기본 경로 뒤에 붙는 상대 경로다. 이는 원본 초안의 계약이지 확인된 실제 서버 경로가 아니다.

| 화면/기능 | 조회 | 변경·실행 | 핵심 조건 |
| --- | --- | --- | --- |
| S-07 금고 | GET /vault/worries | — | 공개/잠김 별도 DTO, 분석 요청을 잠긴 수에 합치지 않음 |
| 잠금 안내 | GET /worries/{worryId}/lock | PATCH /worries/{worryId}/release | 공개 도달 시 409 ALREADY_AVAILABLE 처리, 재잠금 불가 |
| S-08 상세 | GET /worries/{worryId} | — | 실제 상세 조회가 first_viewed_at 기록. 목록은 열람 아님 |
| AI 정리 수정 | 상세의 수정 우선 요약 | PATCH /worries/{worryId}/summary | display_summary, 원문 불변·재생성 없음 |
| 지금 불안도 | 상세의 distress_before/after | PUT /worries/{worryId}/post-distress | 1~5 또는 미기록 null 제안. 미기록을 0으로 변환하지 않음 |
| 회고 카드 | GET /reflections/candidate?current_worry_id=... | PUT /reflections/{worryId}, POST /reflections/skip-today | 응답 대상 과거 worry_id 사용 |
| 과거 경험 | GET /worries/{worryId}/similar-experience | — | 최대 1개, data:null 처리, record_id로 S-14 |
| 도움 선택 | 상세 allowed_help·추천 | POST /worries/{worryId}/help-selections | 409 확인 후 expected_active_activity_id를 포함해 재요청 |
| S-09 파쇄·공개 전/기록 삭제 | GET /deletion-jobs/{jobId} | DELETE /worries/{worryId} | 202 접수와 완료 구분, 204는 본문 없이 완료 |
| S-10 액션 | GET /activities/{activityId} | POST /worries/{worryId}/activities, PATCH steps, POST pause/resume/complete | 진입 때 생성, 3개 체크 후 별도 완료 |
| S-11 휴식 | GET /activities/{activityId} | POST activities, pause/resume/stop/complete | 시작 버튼 이후 생성, 180초·서버 0초 후 명시적 완료 |
| S-12 공감 | GET /worries/{worryId}/empathy | POST activities, POST complete | 진입 때 활동 생성, 읽었어요 이후 완료. 모델 재호출 없음 |
| S-13 완료·평가 | GET /activities/{activityId} | PUT /activities/{activityId}/rating | 평가 선택형, 파쇄 제외 |
| S-14 기록 | GET /records, GET /records/{worryId} | DELETE /worries/{worryId} | 공개·미삭제·미만료만. 기록 상세도 최초 열람 처리 |
| S-18 시연 | GET /demo/scenarios | POST /demo/sessions, POST /demo/sessions/{demoId}/advance, DELETE /demo/sessions/{demoId} | DEMO_OPERATOR 권한, 일반 데이터/실제 알림과 격리 |

## FE2가 보존할 요청 필드와 값

| 동작 | 요청 본문 핵심 | 별도 조건 |
| --- | --- | --- |
| 공개 시간 변경 | release_at: UTC ISO 8601 | 서버가 미래·잠김·만료 이전 확인 |
| 요약 수정 | display_summary: string | 공백 제외 1자 이상, 최대 500자 |
| 공개 후 불안도 | distress_after: 1~5 또는 null 제안 | Swagger PDF의 nullable 표현은 별도 확인 |
| 도움 선택 | help_type, confirm_switch, expected_active_activity_id | 첫 시도 false, 확인 후 true + 실제 활동 ID |
| 활동 생성 | type: ACTION / REST / EMPATHY | SHRED 활동 생성 없음, Idempotency-Key |
| 액션 체크 | completed: true / false | stepNumber 1~3, 응답 단계는 checked 필드 |
| 활동 그만두기 | reason: USER_QUIT / HELP_SWITCH | 단순 확인창 열기에서는 호출하지 않음 |
| 명시적 완료 | 본문 없음 | Idempotency-Key, 서버 완료 자격 확인 |
| 도움 평가 | helpfulness: HELPFUL / UNSURE / NOT_HELPFUL | 완료 성공과 독립된 저장 |
| 회고 | outcome: BETTER / ONGOING / HAPPENED | 괜찮아짐 / 진행 중 / 걱정대로 됨 |
| 오늘 회고 건너뛰기 | timezone: 사용자 IANA 시간대 | 저장된 시간대와 서버 교차 검증 |
| 개별 삭제 | 본문 없음, 선택 헤더 X-Deletion-Intent | SHRED / STANDARD는 삭제 범위가 같음 |
| 시연 생성 | scenario_id | 서버가 제공한 프리셋 ID |
| 시연 시간 이동 | simulated_now | 일반 server_now는 바꾸지 않음 |

## 상태·완료 기준

| 대상 | enum / 구분 | 화면 의미 |
| --- | --- | --- |
| 분석 요청 | ACCEPTED / PROCESSING / SUCCEEDED / FAILED / CRISIS | 30초 경과는 FAILED가 아님 |
| 걱정 | LOCKED / AVAILABLE / DELETING / DELETED / EXPIRED | VIEWED는 별도 first_viewed_at |
| 활동 | IN_PROGRESS / PAUSED / STOPPED / READY_TO_COMPLETE / COMPLETED | REST 0초는 READY_TO_COMPLETE, 자동 완료 아님 |
| 삭제 작업 | PENDING / RUNNING / COMPLETED / FAILED_RETRYABLE | COMPLETED 전에 파쇄 성공 연출 금지 |
| 알림 | SCHEDULED / SENDING / REQUESTED / CANCELED / FAILED | REQUESTED는 기기 도착·열람 확정 아님 |

### 액션과 휴식의 pause/stop 차이

- ACTION의 pause는 ‘나중에 이어하기’: STOPPED + 체크 유지. resume으로 이어갈 수 있다는 초안이다.
- REST의 pause는 PAUSED + 남은 시간 고정. resume은 서버가 새 ends_at을 계산한다.
- REST의 stop은 남은 시간을 이어하기로 보존하지 않는다. 다음 시작은 새 180초 활동이다.
- STOPPED라는 같은 상태만으로 재개 가능 여부를 단정하지 않는다. 종류·중단 사유·서버 계약을 함께 확인한다.
- 진행 활동 전환은 help-selections의 confirm_switch 처리 안에서 기존 활동 중단을 수행한다. 별도 stop을 중복 호출해야 한다고 임의로 가정하지 않는다.
- 3개 체크, 타이머 0초, 공감 메시지 조회는 각각 완료 버튼 자격/내용 조회일 뿐이다. complete 성공 후 S-13이다.
- 파쇄는 활동 생성·평가 없이 삭제 완료 후 전용 완료 화면으로 간다.

### 삭제 흐름

1. 사용자에게 대상·삭제 범위를 확인받는다.
2. DELETE /worries/{worryId}를 호출한다.
3. 202 + deletion_job_id이면 접수/진행 상태로 표시하고 GET /deletion-jobs/{jobId}로 확인한다.
4. PENDING/RUNNING에서는 성공 문구·파쇄 완료 연출을 하지 않는다.
5. COMPLETED 또는 원본이 정의한 즉시 삭제 204에서만 완료로 전환한다.
6. 조회·추천·홈·기록·과거 경험의 해당 데이터를 갱신/제거한다.
7. FAILED_RETRYABLE이나 결과 불명확 상태를 성공으로 안내하지 않는다. 재처리 책임·조회 주기는 팀 계약 확인 사항이다.

### 회고 후보와 과거 경험

통합 초안 p.14의 회고 후보 조건은 first_available_at부터 24시간 이상, 최초 상세 열람됨, 회고 미응답, 미삭제·미만료, 현재 걱정 제외다. 후보 중 first_available_at이 가장 오래된 것을 우선한다. 오늘 현지 날짜에 건너뛰었다면 data:null이다. 이는 기존 와이어프레임에서 미정이었던 부분을 **이번 초안이 제안한 기준**으로 보완하며 확정 정책으로 승격시키지 않는다.

과거 경험은 같은 게스트의 과거 공개 기록 중 기준을 통과한 최대 1개다. 실제 HELPFUL 평가가 있을 때만 ‘도움이 되었던’ 표현을 사용한다. 현재·잠김·분석 중·실패·삭제·만료 기록은 제외한다.

## 구현 전 확인할 차이와 미정 사항

| 항목 | 발견 내용 | 적용 원칙 |
| --- | --- | --- |
| 문서 상태 | 두 API 문서 모두 draft·팀 합의 전 | 실제 서버·최신 YAML·팀 확정본 확인 후 연동 |
| nullable | 통합 초안은 distress_after:null 등 허용. Swagger 인쇄 표는 integer만 보이는 곳이 있음 | PDF만으로 nullable 허용 여부를 역추정해 TypeScript를 확정하지 않음 |
| ACTION pause | 본문은 STOPPED, 통합 초안 p.8 홈 예시는 ACTION/PAUSED | 타입별 동작과 홈 예시를 팀과 정합화. 원본 보존 |
| REST stop 응답 | Swagger p.49는 STOPPED에 remaining_seconds:72 예시 | 값 존재가 재개 가능이라는 뜻은 아님. stop 후 새 180초 정책과 구분 |
| 완료 응답 | 통합 본문 200/201 언급, Swagger는 200 | 실제 서버의 확정 상태 코드 확인 |
| 전체 알림 해제 | 통합 초안에서 부분 실패 응답 정책 미정 | 전체 성공으로 표시하지 않음, FE1 연동 참고 |
| 요약 동시성 | version/If-Match 방식 미정 | 버전 충돌 계약 확인 |
| 활동 완료 후 체크 변경 | 통합 초안에 정책 확정 필요 표시 | 서버·UX에서 확인 |
| 시연 응답/모드 | mode:DEMO_PRESET, source:PRESET 언급, 장애용 프리셋 구분 필요 | 실제 응답의 식별 필드를 확정하고 UI의 예시 표시 유지 |
| API·인프라 | 실제 주소·CORS·배포·언어·DB·Queue 미확정 | 샘플 도메인·키·내부 주소를 운영값으로 사용하지 않음 |
| 공급자 사양 | 모델 별칭·OCR·SDK 코드는 원본의 예시 | 실제 사용 시 공식 사양 재확인. 이 변환에서는 외부 사양을 검증하지 않음 |
| 참조 업무 정책 | 화면·동작 정책/기능명세 원본은 이번 2개 PDF와 별개 | 해당 원문을 받은 뒤 충돌 비교. 읽었다고 가정하지 않음 |

상세 GET은 실제 열람 기록의 부작용이 있으므로, FE2 구현에서 목록을 보여주려고 모든 상세를 미리 조회하는 방식은 피한다. 이 문장은 최초 열람 정책에서 도출한 구현 참고사항이다.

## 원본 전 페이지 텍스트 보존

아래는 읽은 원문의 페이지별 텍스트다. 표의 열 정렬, 줄바꿈으로 분리된 식별자, 페이지를 넘는 JSON/코드가 있어 **그대로 실행하거나 원본 YAML로 취급하지 않는다.** 추출 과정의 레이아웃 한계를 숨기지 않기 위해 원문 블록을 보존한다. 앞부분의 구조화 표는 읽기 편의를 위한 별도 정리다.

<a id="pdf-page-1"></a>

## 원문 p.1 / 25

```text

Wooly Vault | 통합 API 명세서

  CONTENTS / 목차


     0. 읽는 법과 원본 문서 적용 우선순위


     1. 공통 용어·역할·범위


     2. 권장 전체 아키텍처


     3. 공통 API 계약 (확정 제안)


     4. API 엔드포인트 인덱스 (역할/화면/기능 ID)


     5. BE1 API 상세 — 인증·접수·공개·알림·위기


     6. BE2 API 상세 — 도움·활동·기록·회고·삭제·시연


     7. AI 기능·내부 API 명세서 (공급자 교체형)


     8. DB·보관·이벤트 설계(제안)


     9. 전체 시퀀스 및 FE 화면별 연결


     10. 대표 E2E 시나리오·테스트 케이스


     11. 팀별 인수인계 및 개발 순서


     12. 원문 추적표·참조 문서




BE1 · BE2 · AI / FE1 · FE2 · 기획·디자인 공용 / Notion Markdown 원본

  • 문서 버전: v1.0-draft | 작성 기준: 2026-11-09 | 상태: 연동을 위한 제안 계약(팀
   합의 전)
  • 서비스: 심야 걱정 금고(Wooly Vault) | 공개 API 기본 경로: /api/v1
  • 대상 독자: BE1(인증·접수·공개·알림·위기), BE2(활동·기록·삭제·시연), AI(분
   석·모델 어댑터), FE1·FE2, 기획·디자인


                                                                 1 / 25
```

<a id="pdf-page-2"></a>

## 원문 p.2 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                              v1.0-draft | 2026.11.09



               • 매우 중요: 첨부 문서는 사용자 요구사항이며 이 문서의 엔드포인트 이름, DTO 필드,
                DB 테이블, 내부 처리 한도는 구현을 돕기 위해 새로 제안한 계약입니다. 원문에 없
                던 기술적 결정은 설계 제안 으로 표시합니다.


         0. 읽는 법과 원본 문서 적용 우선순위

           1. **화면·동작 정책(1)**의 화면·시간·상태·예외 정책을 최우선 기준으로 적용한다.
                해당 문서는 와이어프레임 충돌 시 수정 기준을 적용하라고 명시한다.
           2. **기능명세서(1)**은 기능 ID, FE/BE 담당, 우선순위 및 연동 지점을 추적하기 위한
                기준이다.
           3. 기획_수정 내용 반영은 서비스 목적, 핵심/선택/제외 범위, 사용자 경험과 기술 방향
                의 기준이다.
           4. 과거 초기 기획과 달리 공개 시간은 사용자가 선택 가능, 기본값은 다음 도래하는 오
                전 08:00이다. 나이트 테마는 22:00~다음 날 06:00이고, 이 시간 외에도 걱정 등록
                과 공개 후 확인을 허용한다.
           5. 제외 기능: 실시간 AI 채팅, 익명 커뮤니티, 위치 추천, 외부 공유, 코인·상점, 기상청
                API 및 Document Parse. 선택 기능: OCR, 음성 입력, 호흡 가이드, 패턴 리포트,
                계정 연결 등. 핵심 일정과 API에서 제외 기능을 필수로 취급하지 않는다.
           6. 위기 대응의 정확한 감지 조건·안내 문구·연락 정보는 별도 위기 대응 정책 문서가
                필요하다. 현재 첨부 자료에 그 원문이 없으므로 본 명세는 확정하지 않는다.

         원문 근거: [화면·동작 정책(1) p.1~2, p.15~18], [기능명세서(1) p.1, p.27~29], [기획
         _수정 내용 반영 p.5~10].


         1. 공통 용어·역할·범위

          역할        책임 경계                                                         연동할 파트
          BE1       게스트 발급·인증, 권한 미들웨어, 걱정 제출·AI 분석 오케스트레이션, 상태 조회, 공개 시간·금       FE1, FE2, BE2, AI
                    고 조회, 웹 푸시·재알림, 위기 분기
          BE2       도움 선택, 액션·휴식·공감, 평가·회고·과거 경험, 기록, 공통 삭제·만료, 시연 데이터            FE2, FE1, BE1, AI 유사도
          AI        걱정 내용의 구조화·추천·안전 검증, 의미 유사도·선택형 OCR, Upstage/Self-hosted 모델   원칙적으로 서버
                    어댑터                                                           (BE1·BE2)만 호출
          FE1       S-01~06 중심, 홈·설정·알림·S-16(위기)                                  BE1 + BE2 홈 요약
          FE2       S-07~14, S-18 중심, 금고·활동·기록·시연                                 BE1 공개·상세 + BE2
          기획·디      문구·기본값·정보 비노출·화면별 이벤트와 예외 상태 확정                               이 문서의 화면 매핑/표준
          자인                                                                      에러



         개념 분리: analysis_request (접수/처리 요청) ≠ worry (AI 검증 후 저장된 걱정) ≠
         activity (도움 실행 기록) ≠ notification_job (예약 작업). 집계 시 서로 섞지 않는
         다.




BE1 · BE2 · AI / FE & PRODUCT                                                                                  2 / 25
```

<a id="pdf-page-3"></a>

## 원문 p.3 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                    v1.0-draft | 2026.11.09



         우선순위: P0=현재 문서의 필수 구현, P1=선택 구현, X=명시적 제외. API 뒤에 (P1) 이
         있으면 핵심 시연에 필수 아님.


         2. 권장 전체 아키텍처

           [FE1/S01~06·15~16]         [FE2/S07~14·18]
                      \                       /
                       \    HTTPS /api/v1    /
                      [API Gateway / 공통 Auth·CSRF·권한]
                               |                   |
                     [BE1: Vault Core]        [BE2: Experience Core]
                     접수·조회·공개·알림            활동·기록·회고·삭제·시연
                               |                   |
                      [DB/Queue/Jobs/Cache (user scope, encryption, TTL)]
                               |
                     [BE1 AI Orchestrator / Async Worker]
                               |
                     [AI Adapter: generateStructured / embed / ocr]
                           /                              \
             [Upstage Solar API]              [Self-hosted Fine-tuned Model]
                           \                              /
                            [공통 결과 스키마 + 검증·안전 게이트]




            • 서버만 외부 모델 호출: FE는 Upstage API 키 또는 자체 모델 비밀키를 알지 못한
               다.
            • 서버 시각이 판정 기준: release_at , 보관 만료, 알림 예약은 UTC 시각으로 계산한
               다. FE는 IANA 시간대( Asia/Seoul 등)로 표현한다.
            • 시간 기반 공개는 서버 권한 검사: 클라이언트 토글·로컬 시각·URL·직접 API 호출
               로 조기 공개할 수 없다. 단, 별도 격리된 시연 데이터는 예외.
            • 분석 중 이탈 허용: 제출 확인 이후 백그라운드 작업이 지속된다. 15초 지연 안내, 30
               초 상태 재확인은 FE 표현 정책일 뿐 서버 실패 기준이 아니다.
            • 삭제 우선: 삭제/만료 tombstone 검사가 AI 저장보다 우선하며, 뒤늦은 모델 결과
               로 데이터를 재생성할 수 없다.


         3. 공통 API 계약 (확정 제안)

         3.1 기본 헤더·전송·인증
          항목          제안 계약
          Base URL    {API_BASE_URL}/api/v1 (스테이징/프로덕션 분리)

          포맷          application/json; charset=utf-8 , 시각은 UTC ISO 8601 ( 2026-11-10T23:00:00Z )

          게스트 인       서버 발급 랜덤 세션을 HttpOnly; Secure; SameSite=Lax 쿠키로 전달. 일반 로그인·기기 동기화 없음
          증
          세션 기간       유효한 접근 시 갱신되는 30일. 기록의 30일 보관 기간과 별개
          CSRF        쓰기 요청 시 X-CSRF-Token (예: /session 에서 제공) + Origin 검증; 쿠키 기반이므로 필수 고려
          멱등성         POST /worry-submissions 는 Idempotency-Key 필수; 동일 키·동일 본문 재요청은 동일 request_id 반환. 다른 본문
                      이면 409




BE1 · BE2 · AI / FE & PRODUCT                                                                                        3 / 25
```

<a id="pdf-page-4"></a>

## 원문 p.4 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                                   v1.0-draft | 2026.11.09



          항목              제안 계약
          요청 식별            X-Request-Id (관찰용 UUID), 응답 request_id 필드(비즈니스 요청 ID)와 구분

          페이지네이            ?cursor=...&limit=20 , 서버가 불투명한 next_cursor 반환
          션
          접근 범위           매 GET·PATCH·POST·DELETE마다 세션 소유자 + 상태 + 만료 검사. ID 존재 유추 방지에 404 사용 가능
          문자 수            걱정/요약: 공백 제외 최소 1자, 공백 포함 최대 500자; 메모 최대 100자. FE/BE 동일 JS Unicode 코드포인트
                          ( Array.from(s).length )로 제안
          불안도              1~5 정수, 필수 등록 시 기본 선택 없음; 공개 후 재기록은 선택

          조회 캐시           잠긴 정보와 민감 API는 Cache-Control: no-store ; URL·알림·로그에 걱정 원문 금지



         3.2 공통 성공·실패 봉투

           {
               "data": { "id": "w_8f21", "status": "LOCKED" },
               "meta": { "request_id": "req_8a17", "server_now": "2026-11-09T06:00:00Z" }
           }




           {
               "error": {
                    "code": "WORRY_LOCKED",
                    "message": "아직 공개 시간이 되지 않았어요.",
                    "retryable": false,
                    "details": { "release_at": "2026-11-10T23:00:00Z" }
               },
               "meta": { "request_id": "req_8a17" }
           }




         204 No Content 에는 본문이 없다. 오류 메시지는 FE 화면용 예시이며, 최종 문구는 기
         획·디자인 확인을 받는다.


         3.3 서버 상태와 화면 상태의 매핑
          대상           서버 enum (제안)                                            FE 의미 / 주의
          분석 요          ACCEPTED , PROCESSING , SUCCEEDED , FAILED , CRISIS    30초 대기 는 enum 아님. CRISIS는 걱정 레코드가 아닌 안내
          청                                                                    로 이동
          걱정            LOCKED , AVAILABLE , DELETING , DELETED , EXPIRED      VIEWED 는 별도 first_viewed_at ; 공개 이후 GET detail
                                                                               에서만 기록
          활동            IN_PROGRESS , PAUSED , STOPPED , READY_TO_COMPLETE ,   REST에서 0초는 READY_TO_COMPLETE 이며 자동 완료 아님
                        COMPLETED

          알림            SCHEDULED , SENDING , REQUESTED , CANCELED , FAILED    전송 요청 성공과 기기 도착·열람은 다름
          삭제 작          PENDING , RUNNING , COMPLETED , FAILED_RETRYABLE       삭제 시작 시 모든 조회·추천을 차단, 필수 삭제 완료 전 성공
          업                                                                    연출 금지



         3.4 공통 에러 코드 (FE·기획 공용)
          HTTP        code                                  사용자 동작 / 서버 동작
          400         INVALID_REQUEST                       구조·형식 오류, 유효 입력 안내
          401         GUEST_SESSION_INVALID                 인증이 있었으나 무효: S-01 접근 오류·새로 시작
          403         CSRF_INVALID / DEMO_FORBIDDEN         새 토큰 요청 / 시연 권한 숨기기
          404         NOT_FOUND                             삭제·타인 소유·만료 레코드와 구분 없이 안전한 안내
          409         IDEMPOTENCY_CONFLICT                  동일 키의 다른 본문 금지
          409         RELEASE_TIME_PASSED                   시간 재선택·상태 갱신
          409         WORRY_LOCKED                          잠금 안내: 민감 필드 미반환




BE1 · BE2 · AI / FE & PRODUCT                                                                                                       4 / 25
```

<a id="pdf-page-5"></a>

## 원문 p.5 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                              v1.0-draft | 2026.11.09



          HTTP     code                                  사용자 동작 / 서버 동작
          409      ALREADY_AVAILABLE                     시각 변경 취소, 재잠금 없음
          409      ACTIVITY_SWITCH_CONFIRM_REQUIRED      중단 확인 팝업, 원래 상태 유지
          409      ACTIVITY_NOT_READY                    액션 3개 미체크 / 휴식 0초 미도달
          409      REINPUT_REQUIRED                      재시도 원문 없음: FE 재입력 요청
          422      VALIDATION_FAILED                     필드별 제한 안내; field_errors 제공
          429      RATE_LIMITED                           Retry-After 기반 재시도, 반복 호출 제한

          503      AI_UNAVAILABLE                        최종 실패 확정 시만 S-05 재시도 노출
          503      SAFETY_CHECK_UNAVAILABLE              정상 봉인 처리 금지, 안전 분기 확인 필요
          503      PUSH_UNAVAILABLE                      핵심 봉인 허용, 알림 상태는 실패 안내



         3.5 프런트 필드 노출 정책
          화면/API 상태                  공개 가능                                              공개 금지
          S-02 홈                     잠김/공개 수, 가장 가까운 공개 시각, 분석 상태, 활동 이어하               걱정 원문·메모·AI 요약·불안도
                                     기
          S-07 잠긴 카드·잠금 안            worry_id , created_at , release_at , 삭제·변경 가능      원문·메모·요약·불안도·AI 결과
          내                          여부
          S-07 공개 카드                 작성 시각, 수정 우선 한 줄 요약, 봉인 전 불안도, 미열람 여               공개 전 카드에는 이 필드를 절대 보내지 않음
                                     부
          S-08·S-14 공개 상세            원문·메모·분석·활동·회고·평가                                  다른 사용자·만료·삭제·잠긴 레코드의 민감
                                                                                        내용
          S-05 분석 요청                 request_id , 상태, 지연, retryable                     원문·AI 초안·위기 판정 근거 상세 로그
          알림 페이로드                    정해진 제목·중립 문구·목록 이동 route                           원문·요약·불안도·토큰·위기 내용




         4. API 엔드포인트 인덱스 (역할/화면/기능 ID)

         아래의 메서드·경로는 팀 합의용 제안이다. AI* 는 서비스 간 내부 호출이며 브라우저에
         서 호출하지 않는다.

          소      메서드      경로                                     화면        기능 ID              목적                     단
          유                                                                                                          계
          BE     GET      /session                               S-01/02   A-01/04/05         세션 복원·상태·CSRF          P0
          1
          BE     POST     /guest-sessions                        S-01      A-03               게스트 생성/새로 시작           P0
          1
          BE     GET      /home                                  S-02      HOME-01/03/04/07   홈 통합 요약(민감 내용 제외)      P0
          1
          BE     GET      /settings                              S-15      SET-01/02          설정·알림 상태 조회            P0
          1
          BE     PATCH    /settings                              S-15      SET-01/02          기본 공개 시각·시간대·공개        P0
          1                                                                                   동의 수정
          BE     POST     /worry-submissions                     S-04/05   AI-01/04           걱정 접수·비동기 분석           P0
          1
          BE     GET      /analysis-requests/{requestId}         S-05/02   AI-03/06           분석·성공·실패·위기 상태 확       P0
          1                                                                                   인
          BE     POST     /analysis-requests/{requestId}/        S-05      AI-06              최종 실패 재시도(원문 재전송       P0
          1               retry                                                               검증)
          BE     PATCH    /analysis-requests/{requestId}/        S-02      HOME-07            실패 카드 닫기               P0
          1               dismiss

          BE     GET      /vault/worries                         S-07      M-01               잠김/공개 목록 분리            P0
          1
          BE     GET      /worries/{worryId}/lock                S-07      LOCK-01/03         잠긴 메타정보 조회             P0
          1




BE1 · BE2 · AI / FE & PRODUCT                                                                                                  5 / 25
```

<a id="pdf-page-6"></a>

## 원문 p.6 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                          v1.0-draft | 2026.11.09



          소    메서드      경로                                  화면         기능 ID             목적                      단
          유                                                                                                      계
          BE    PATCH   /worries/{worryId}/release          S-07       TIME-03           공개 전 시각 변경              P0
          1
          BE    GET     /worries/{worryId}                  S-08       M-02              공개 상세·최초 열람 기록          P0
          1
          BE    GET     /worries/{worryId}/empathy          S-12       EMP-01            기존 생성 공감 메시지 조회         P0
          1
          BE    POST    /push-subscriptions                 S-04/15    AL-02             푸시 구독 연결·갱신             P0
          1
          BE    DELET   /push-subscriptions/current         S-15       AL-02/SET-03      현재 브라우저 구독 해제           P0
          1    E

          BE    GET     /notifications/status               S-06/15    AL-02/06          동의·권한·구독·예약 구분 조        P0
          1                                                                              회
          BE    PUT     /reminders/current                  S-06       AL-05             사용자당 1개 재알림 생성/교        P0
          1                                                                              체
          BE    DELET   /reminders/current                  S-06/02/   AL-06             재알림 취소                  P0
          1    E                                            15
          BE    POST    /notifications/disable-all          S-15       SET-03            공개 동의 해제·재알림 취소         P0
          1
          BE    GET     /crisis-guidance/{requestId}        S-16       C-02/03           현재 세션의 일회성 위기 안내        P0
          1
          BE    PATCH   /worries/{worryId}/summary          S-08       M-04              수정 요약 저장(재분석 없음)        P0
          2
          BE    PUT     /worries/{worryId}/post-distress    S-08       M-03              공개 후 불안도 입력/덮어쓰기        P0
          2
          BE    POST    /worries/{worryId}/help-            S-08       M-05              선택/변경·중단 확인             P0
          2             selections

          BE    POST    /worries/{worryId}/activities       S-10/11/   ACT-01/REST-01/   활동 시작(휴식은 명시적 시작)       P0
          2                                                 12         EMP-02
          BE    GET     /activities/{activityId}            S-10/11/   ACT-03/REST-03    활동 상태·시간 복원             P0
          2                                                 12
          BE    PATCH   /activities/{activityId}/steps/     S-10       ACT-02            액션 체크·체크 취소             P0
          2             {stepNumber}

          BE    POST    /activities/{activityId}/pause      S-10/11    ACT-03/REST-02    액션 중단/휴식 일시정지           P0
          2
          BE    POST    /activities/{activityId}/resume     S-10/11    ACT-03/REST-02    활동 재개                   P0
          2
          BE    POST    /activities/{activityId}/stop       S-08/11    M-05/REST-04      도움 변경·휴식 그만두기           P0
          2
          BE    POST    /activities/{activityId}/complete   S-10/11/   ACT-04/REST-04/   명시적 완료 및 S-13 데이터       P0
          2                                                 12         EMP-02
          BE    PUT     /activities/{activityId}/rating     S-13       RESULT-02         선택형 도움 평가               P0
          2
          BE    GET     /records                            S-14       R-01              공개·미삭제 기록 목록            P0
          2
          BE    GET     /records/{worryId}                  S-14       R-02/03           기록 상세·최초 열람 처리          P0
          2
          BE    GET     /reflections/candidate              S-08       REVIEW-01         24h 경과 회고 대상 최대 1개      P0
          2
          BE    PUT     /reflections/{worryId}              S-08       REVIEW-02         회고 응답 저장                P0
          2
          BE    POST    /reflections/skip-today             S-08       REVIEW-03         현지 날짜 회고 제안 건너뛰기        P0
          2
          BE    GET     /worries/{worryId}/similar-         S-08       PAST-01/02        관련 과거 경험 최대 1개          P0
          2             experience

          BE    DELET   /worries/{worryId}                  S-07/09/   H-02/LOCK-02/     개별 삭제·파쇄(동일 실제 삭        P0
          2    E                                            14         R-04              제)
          BE    GET     /deletion-jobs/{jobId}              S-09/14/   D-01              삭제 완료 확인                P0
          2                                                 15




BE1 · BE2 · AI / FE & PRODUCT                                                                                              6 / 25
```

<a id="pdf-page-7"></a>

## 원문 p.7 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                              v1.0-draft | 2026.11.09



          소     메서드     경로                                화면     기능 ID        목적                     단
          유                                                                                          계
          BE    DELET   /guest-vault                      S-15   SET-05       전체 삭제·인증 종료 연동         P0
          2     E

          BE    GET     /demo/scenarios                   S-18   DEMO-01/03   격리 시연 프리셋 조회           P0
          2
          BE    POST    /demo/sessions                    S-18   DEMO-01/03   격리 시연 세션 생성            P0
          2
          BE    POST    /demo/sessions/{demoId}/advance   S-18   DEMO-02      시연 시간만 이동              P0
          2
          BE    DELET   /demo/sessions/{demoId}           S-18   DEMO-03      시연 데이터만 초기화            P0
          2     E

          BE    POST    /inputs/ocr                       S-03   OPTIONAL     이미지 OCR(동의 후)          P1
          1
          AI*   POST    /internal/ai/v1/analyze           서버     AI-02/C-01   분석·안전 관련 구조화 출력        P0
          AI*   POST    /internal/ai/v1/similarity        서버     PAST-01      과거 경험 의미 유사도           P0
          AI*   POST    /internal/ai/v1/ocr               서버     OPTIONAL     OCR 어댑터                P1
          AI*   GET     /internal/ai/v1/health            서버     COM-01       AI 프로바이더 상태(외부 비공      P0
                                                                              개)




         5. BE1 API 상세 — 인증·접수·공개·알림·위기

         5.1 세션·홈·설정

         GET /session (A-01/04/05, FE1): 쿠키 없음이면 200 {data:
         {authenticated:false,reason:"NO_SESSION",csrf_token:"<anonymous-
         csrf>"}} ; 유효하면 200 {data:
         {authenticated:true,guest_id:"g_...",csrf_token:"...",expires_at:"...
         ",timezone:"Asia/Seoul"}} . 게스트 생성 요청에서도 Origin 검증과 발급받은 익명
         CSRF 토큰을 적용한다(설계 제안). 기존 쿠키가 무효인 경우 401
         GUEST_SESSION_INVALID 로 첫 이용과 구분한다. 만료 쿠키 삭제는 사용자가 명시적으
         로 새 시작을 선택한 후 수행한다.

         POST /guest-sessions (A-03, FE1): 요청 { "start_over": true } (무효 세션
         재시작) 또는 { "start_over": false } (최초 이용). 201 로 새 guest_id , 세션 상태
         반환, HttpOnly 세션 쿠키 발급. FE는 성공 직후 S-03 으로 이동. 같은 유효 게스트에서
         중복 생성하지 않는다.

         GET /home (HOME-01/03/04/07, FE1): 데이터 vault:
         {locked_count,available_count,next_release_at} , requests:
         [{request_id,status,created_at,dismissible}] , latest_activity:
         {activity_id,worry_id,type,status,progress_summary}|null , reminder:
         {scheduled_at}|null , has_any_record . 절대 포함하지 말 것: 원문·메모·요약·불
         안도·AI 결과. 분석 중 요청은 locked_count 에 합치지 않는다.




BE1 · BE2 · AI / FE & PRODUCT                                                                                  7 / 25
```

<a id="pdf-page-8"></a>

## 원문 p.8 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                         v1.0-draft | 2026.11.09



         GET /settings + PATCH /settings (SET-01/02): 조회/수정 DTO의 핵심 필드는 t
         imezone (IANA ID), default_release_local_time ( HH:mm , 최초 08:00 ), public_
         notifications_opt_in (기본 false ). 설정 변경은 다음 등록부터 적용되고 기존 걱정
         공개 시각을 일괄 변경하지 않는다. BE1은 세션 유효성·동의를 기록한다. 브라우저 권한
         ·구독 여부는 /notifications/status 로 별도 확인한다.

           {
                "data": {
                     "vault": {"locked_count": 2, "available_count": 1,
                               "next_release_at": "2026-11-10T23:00:00Z"},
                     "requests": [{"request_id":"ar_101","status":"PROCESSING",
                                   "created_at":"2026-11-09T14:00:00Z","dismissible":false}],
                     "latest_activity": {"activity_id":"a_11","worry_id":"w_15",
                                         "type":"ACTION","status":"PAUSED","progress_summary":"1/3"},
                     "reminder": {"scheduled_at":null},
                     "has_any_record": true
                },
                "meta": {"request_id":"req_home", "server_now":"2026-11-09T14:00:01Z"}
           }




         5.2 걱정 접수 및 비동기 AI

         POST /worry-submissions (AI-01/04, FE1, P0). FE가 S-03 초안을 로컬 상태에서
         유지하다 S-04 확인 후 처음으로 서버에 제출한다. 서버는 입력 검증→안전 판단→AI 콘
         텐츠 생성/검증→트랜잭션 저장 순서로 처리한다.

          입력                         타입 / 제약                       비고
          헤더 Idempotency-Key         UUID/랜덤 문자열, 필수               같은 걱정의 중복 생성 방지
           worry_text                string, 공백 제외 ≥1, 최대 500자     HTML 아닌 원문 그대로 저장; 일반 로그 금지
           distress_level            integer, 1~5, 필수              자기보고 값, 진단 점수 아님
           tomorrow_note             string 또는 null, ≤100          선택 입력
           release_at                UTC ISO 8601, 필수              접수 시 서버가 미래 & accepted_at+30일 이전 검증
           public_notify             boolean, 기본 false             알림 동의·구독 성공 여부와 별도 최종 검증
           client_started_at         ISO 8601 또는 null              사용자 동의하에 소요 시간 측정용; 측정 오류 고려



           POST /api/v1/worry-submissions
           Content-Type: application/json
           Idempotency-Key: 85dbea43-58df-40bb-84a5-d95debfca401
           X-CSRF-Token: <token>




           {
               "worry_text":"내일 발표에서 실수할까 봐 걱정돼요.",
               "distress_level":4,
               "tomorrow_note":"첫 장만 다시 확인하기",
               "release_at":"2026-11-10T23:00:00Z",
               "public_notify":false,
               "client_started_at":"2026-11-09T13:58:00Z"
           }




           {
               "data":{"request_id":"ar_101","status":"ACCEPTED",
                          "accepted_at":"2026-11-09T14:00:00Z",




BE1 · BE2 · AI / FE & PRODUCT                                                                                             8 / 25
```

<a id="pdf-page-9"></a>

## 원문 p.9 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                             v1.0-draft | 2026.11.09



                       "status_url":"/api/v1/analysis-requests/ar_101"},
               "meta":{"request_id":"req_101","server_now":"2026-11-09T14:00:00Z"}
           }




         GET /analysis-requests/{requestId} (AI-03/06): ACCEPTED/PROCESSING 이면
         worry_id=null ; 성공 시 status=SUCCEEDED,worry_id,release_at,display_sta
         te=LOCKED|AVAILABLE ; 실패 시 status=FAILED,retryable,reason_code (원문 없
         음); 위기 시 status=CRISIS,guidance_available=true (일반 걱정 생성 없음). FE는
         15초에 지연 문구, 30초에 마지막 조회 후 홈 복귀 가능. 요청을 떠나도 서버는 진행한다.
         현재 S-05인 경우에만 S-06 자동 이동.

           {"data":{"request_id":"ar_101","status":"SUCCEEDED",
                       "worry_id":"w_101","display_state":"LOCKED",
                       "release_at":"2026-11-10T23:00:00Z","retryable":false},
               "meta":{"request_id":"req_status","server_now":"2026-11-09T14:00:08Z"}}




         POST /analysis-requests/{requestId}/retry (AI-06): FAILED 일 때만 허용. 클
         라이언트에 원문이 남은 경우 동일 내용의 worry_text , distress_level ,
         tomorrow_note , release_at 을 재전송; 서버는 원래 입력의 해시 일치 검증(설계 제
         안) 및 현재 유효 공개 시간을 재검사한 후 202 PROCESSING . 재시도할 원문이 없으면 4
         09 REINPUT_REQUIRED ; 이미 성공이면 200 SUCCEEDED , 아직 처리 중이면 200
         PROCESSING ; 요청이 달라야 할 경우 새 제출/새 멱등성 키 사용.

         PATCH /analysis-requests/{requestId}/dismiss (HOME-07):
         { "dismissed": true } 로 실패 카드만 닫는다. 다른 걱정/요청에는 영향 없음. 실패
         후 서버 임시 원문 즉시 정리; 내용 없는 실패 카드 메타는 최대 24시간 이후 정리.

         내부 처리 제한값(설계 제안): 큐 처리 상한 60초/외부 호출 20초 타임아웃, 자동 재시도
         최대 1회, 최종 성공·실패 강제 확정. 이는 정책 문서가 값 결정을 개발팀에 위임했으므
         로 운영 환경에 맞춰 재검토해야 한다.


         5.3 금고 목록·상세·공개 제어

         GET /vault/worries?status=all|locked|available&cursor=&limit= (M-01):
         조회는 영역별 최신 작성순. 각 카드가 LOCKED 면 id,created_at,release_at 만 직렬
         화하며, 공개 카드만
         display_summary,distress_before,is_unviewed,first_available_at 포함. 보
         안상 같은 DTO라도 잠김 필드를 null 로 노출하는 대신 해당 필드를 아예 반환하지 않는
         것을 권장.

           {"data":{"locked":[{"id":"w_102","created_at":"2026-11-09T14:00:00Z",
                                  "release_at":"2026-11-10T23:00:00Z","status":"LOCKED"}],
                       "available":[{"id":"w_091","created_at":"2026-11-07T15:00:00Z",
                                     "display_summary":"시험 준비에 대한 걱정","distress_before":3,




BE1 · BE2 · AI / FE & PRODUCT                                                                                 9 / 25
```

<a id="pdf-page-10"></a>

## 원문 p.10 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                   v1.0-draft | 2026.11.09



                                  "is_unviewed":true,"status":"AVAILABLE"}],
                    "next_cursor":null},"meta":{"request_id":"req_vault"}}




         GET /worries/{worryId}/lock (LOCK-01): 잠긴 항목의 생성·공개 시각만 반환. 만
         료/삭제는 404 . 시각 경과 시 409 ALREADY_AVAILABLE 과 현재 상태 갱신 지시(원문 자
         동 제공 금지).

         PATCH /worries/{worryId}/release (TIME-03): 요청 { "release_at":"..."
         } . 소유·잠김 상태·미래·삭제 예정 시각 이전 조건을 서버 트랜잭션에서 모두 확인. 성
         공 시 새로운 release_at / version 및 연결 알림 재예약. 이미 공개됐다면 409
         ALREADY_AVAILABLE , 절대 다시 잠금 금지. 개별 수정은 사용자 기본 시각에 영향 없음.

         GET /worries/{worryId} (M-02): 서버 시각상 공개 가능하고 삭제/만료되지 않은
         경우에만 원문·메모·불안도·수정 우선 요약·추천·액션 3단계·휴식 내용·공감과 활동
         링크를 반환. 이 상세 GET 자체가 최초 실제 열람이며 first_viewed_at 을
         idempotent하게 기록. 일반 목록 GET은 열람으로 간주하지 않는다.

           {"data":{"id":"w_091","status":"AVAILABLE",
            "created_at":"2026-11-07T15:00:00Z","release_at":"2026-11-07T23:00:00Z",
            "first_available_at":"2026-11-07T23:00:00Z",
            "first_viewed_at":"2026-11-09T14:01:00Z",
            "worry_text":"내일 시험 준비가 부족한 것 같아.","tomorrow_note":"목차 확인",
            "distress_before":3,"distress_after":null,
            "ai_content":{"original_summary":"시험 준비에 대한 걱정",
                          "display_summary":"시험 준비에 대한 걱정",
                          "recommended_help":"ACTION","recommendation_reason":"작은 준비 행동을 선택할 수 있어요.",
                          "action_steps":[{"step_number":1,"title":"시험 범위 확인"},
                                          {"step_number":2,"title":"우선할 1쪽 정리"},
                                          {"step_number":3,"title":"짧게 복습"}],
                          "rest_guidance":"잠시 쉬어가도 괜찮아요.",
                          "empathy_message":"걱정을 적어두고 다시 확인하러 오셨군요."},
            "allowed_help":["SHRED","ACTION","REST","EMPATHY"]},
            "meta":{"request_id":"req_detail"}}




         GET /worries/{worryId}/empathy (EMP-01): 이미 봉인 과정에서 생성·저장한 em
         pathy_message 만 반환. 새 모델 호출, 자유 채팅 없음. 공개·소유권 검사 동일.


         5.4 공개 알림·재알림

         POST /push-subscriptions { "endpoint":"https://push...", "keys":
         {"p256dh":"...","auth":"..."}, "client_permission":"granted" } → 201
         또는 기존 구독 갱신 200 . public_notifications_opt_in=true 와 브라우저
         permission, 구독 저장을 각기 별도 상태로 관리. 수집한 Push subscription은 비밀로
         취급; 로그 금지.




BE1 · BE2 · AI / FE & PRODUCT                                                                                      10 / 25
```

<a id="pdf-page-11"></a>

## 원문 p.11 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                          v1.0-draft | 2026.11.09



         DELETE /push-subscriptions/current → 204 , 현재 구독 해제. GET /
         notifications/status → { opt_in, browser_permission_reported,
         subscribed, public_jobs_pending, active_reminder } . 브라우저 권한 값은 FE
         에서 확인한 마지막 관찰 상태일 뿐 OS 권한의 권위 있는 최신값으로 주장하지 않는다.

         PUT /reminders/current { "worry_id":"w_101", "delay_minutes":30 } 또
         는 { "worry_id":"w_101", "delay_minutes":60 } → 200
         {scheduled_at,reminder_id, replaces_previous} . 사용자가 직접 요청한 경우
         만; 사용자당 활성 예약 1개. 기존 예약 교체는 새 예약 저장 성공 후 기존 예약 정리, 실패
         시 기존 유지. 공개 동의와 별개. 알림 권한/구독 실패면 실패를 구분해 반환.

         DELETE /reminders/current → 204 (이미 없음도 멱등 성공). POST /
         notifications/disable-all → 공개 동의 해제 + 재알림 취소 결과를 각각 알려주는
         200
         {public_opt_in:false,reminder_canceled:true,partial_failure:false} ; 일
         부만 성공이면 207 대신 200 partial_failure:true +상세 또는 명확한 503 정책 중
         하나로 최종 확정 필요. 전체 성공으로 오도 금지.

         푸시 스케줄러 내부 규칙: 공개 시각이 같은 여러 걱정은 묶음 알림 1개. 발송 직전 소유·
         공개·미삭제·미열람·동의·유효 구독·중복 전송을 재확인. REQUESTED 는 푸시 제공자
         전송 요청 수락을 뜻하며 실제 도착 확정 아님. 공개 알림과 재알림이 정확히 같으면 공개
         알림만 보내고 재알림은 정리. 공개 시각보다 AI 저장이 늦어도 제출 당시 동의 + 현재 동
         의/유효 구독 + 미열람이면 한 번만 공개 가능 알림 후보. 별도 '분석 완료' 푸시 금지. 알
         림 텍스트에는 걱정 내용 금지.


         5.5 위기 대응 (S-16)

         GET /crisis-guidance/{requestId} (C-02/03): 현재 세션 내 CRISIS 판정 요청
         에 대해서만 일회성 안내. 반환 예시 { "guidance_version":"crisis-v1",
         "message":"...", "resources":[{"label":"도움 연
         결","phone":"..."}],"can_copy_phone":true } . 문구와 연락처는 별도 위기 정책
         승인 후 서버에서 제공. requestId 만으로 타인 조회 불가. 위기 입력은 일반 걱정 레코
         드·활동·회고·알림·추천에 미편입, 임시 민감 내용 삭제. 브라우저 종료 이후 복원·푸
         시 금지. 명확한 규칙 신호는 LLM 오류에도 위기 안내를 가능하게 하고, 안전 판정 전체
         실패를 정상 봉인으로 통과시키지 않음.


         5.6 BE1 내부 워커 의사 코드 (설계 제안)

           async def process_submission(request_id):
               req = await db.get_active_request_for_update(request_id)
               if req.is_deleted_or_expired: return    # 늦은 워커 차단
               rule_risk = safety_rules(req.worry_text)
               if rule_risk == "CLEAR_CRISIS":




BE1 · BE2 · AI / FE & PRODUCT                                                             11 / 25
```

<a id="pdf-page-12"></a>

## 원문 p.12 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                    v1.0-draft | 2026.11.09



                      return await finalize_crisis_without_worry(req)
               try:
                   ai = await ai_adapter.analyze(req.worry_text, req.tomorrow_note)
                      if ai.safety == "CRISIS":
                          return await finalize_crisis_without_worry(req)
                      if ai.safety == "UNKNOWN":
                          raise SafetyUnavailable()   # 정상 봉인으로 간주하지 않음
                   validated = validate_and_sanitize(ai)     # 구조/근거/금지 표현 검사
                      await db.commit_worry_if_not_deleted(req, validated)
                      await schedule_public_notification_if_eligible(req)
                      return await mark_succeeded(req)
               except Exception as exc:
                      await mark_final_failed_or_retry_with_bound(req, exc)
                      # 최종 실패 후 임시 원문 삭제, 상태 메타만 최대 24시간 유지




         6. BE2 API 상세 — 도움·활동·기록·회고·삭제·시연

         6.1 AI 요약·주관적 불안도·도움 선택

         PATCH /worries/{worryId}/summary (M-04): { "display_summary":"수정한 걱
         정 정리" } , 공백 제외 ≥1/최대 500자. 원문 수정 불가. 변경 이후 S-07/S-08/S-14에
         서 수정본을 우선 사용하지만 AI 추천·액션·휴식·공감은 재생성하지 않음. 실패 시 FE
         초안 유지. 공개 전 금지.

         PUT /worries/{worryId}/post-distress (M-03): { "distress_after":2 } 또
         는 { "distress_after":null } ; 1~5 또는 미기록. 재입력은 덮어쓰기; 2값 모두 있
         을 때만 변화량 계산. null 은 측정 없음이지 0 아님.

         POST /worries/{worryId}/help-selections (M-05):
         { "help_type":"ACTION", "confirm_switch":false,
         "expected_active_activity_id":null } . 허용 enum: SHRED|ACTION|REST|
         EMPATHY . 진행·일시정지 활동이 있고 다른 도움을 택하면 부작용 없이 409
         ACTIVITY_SWITCH_CONFIRM_REQUIRED + 현재 활동 요약. 사용자가 확인 후 confirm_
         switch:true + expected_active_activity_id 로 재요청하면 기존 활동 STOPPED 기
         록 후 새 선택 저장. 선택 자체가 곧 활동 완료는 아님. SHRED 는 추가 삭제 확인 후 DELET
         E /worries/{id} 호출(파쇄 연출은 프런트).


           {"error":{"code":"ACTIVITY_SWITCH_CONFIRM_REQUIRED",
                        "message":"진행 중인 활동을 중단하고 다른 도움을 선택할까요?",
                        "retryable":false,
                        "details":{"active_activity_id":"a_23","type":"REST","status":"PAUSED"}},
            "meta":{"request_id":"req_switch"}}




BE1 · BE2 · AI / FE & PRODUCT                                                                                       12 / 25
```

<a id="pdf-page-13"></a>

## 원문 p.13 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                           v1.0-draft | 2026.11.09



         6.2 활동 생성·복원·진행·완료

         POST /worries/{worryId}/activities { "type":"ACTION" } / { "type":"RES
         T" } / { "type":"EMPATHY" } → 201 {activity_id,type,status,...} . 실행
         시점: ACTION은 S-10 진입 즉시, REST는 S-11의 시작하기 버튼 이후, EMPATHY는
         S-12 진입(열람만으로 완료하지 않음). Idempotency-Key 로 화면 재진입 시 중복 활동
         금지. SHRED 활동은 만들지 않는다. REST의 3분은 duration_seconds:180 (문서 기
         본값).

         GET /activities/{activityId} 활동 진행 정보 복원. ACTION은 steps[3] 의
         checked 상태 및 진행률. REST는 remaining_seconds , ends_at , paused_at 반환.
         서버 시각을 기준으로 남은 시간 계산하여 페이지 이탈 중에도 실행 계속. PAUSED이면
         잔여 시간 고정.

         PATCH /activities/{activityId}/steps/{stepNumber} { "completed":true|
         false } ; stepNumber ∈ {1,2,3} . 순서 자유·완료 취소 가능. 동일 값 반복 업데이트
         는 멱등. 상태 COMPLETED 후 체크 변경 금지(정책 확정 필요).

         POST /activities/{activityId}/pause ACTION: ‘나중에 이어하기’ → STOPPED
         + 체크 유지; REST: PAUSED + 잔여 시간 보존. 동일 API지만 type별 의미가 다른 점
         FE2에 명시.

         POST /activities/{activityId}/resume ACTION: 기존 체크 상태에서 IN_PROGR
         ESS ; REST: 보존한 잔여 시간으로 새로운 ends_at=server_now+remaining 생성.
         REST의 그만두기 이후에는 재개 불가.

         POST /activities/{activityId}/stop { "reason":"USER_QUIT"|"HELP_SWITC
         H" } → STOPPED . REST는 잔여 시간을 이어하기로 보존하지 않으며, 다음 시작에서 새
         180초 활동. 확인창을 여는 것 자체는 중단 API 호출이 아님.

         POST /activities/{activityId}/complete Idempotency-Key 포함. ACTION: 3
         단계 모두 체크되어야만 완료 가능. REST: 서버 잔여시간 0초 뒤에만 명시적 완료 가능.
         EMPATHY: 사용자가 읽었어요를 선택한 경우만 완료. 저장 성공 후 200/201
         {status:"COMPLETED", completion_message,can_go_next} 로 S-13 이동. 별도
         S-13 평가는 선택.

           {"data":{"activity_id":"a_rest","worry_id":"w_091","type":"REST",
                    "status":"IN_PROGRESS","duration_seconds":180,
                    "remaining_seconds":72,"ends_at":"2026-11-09T14:03:00Z",
                    "can_complete":false},"meta":{"request_id":"req_activity","server_now":"2026-11-09T14:01:48Z"}}




BE1 · BE2 · AI / FE & PRODUCT                                                                                              13 / 25
```

<a id="pdf-page-14"></a>

## 원문 p.14 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                       v1.0-draft | 2026.11.09



         PUT /activities/{activityId}/rating { "helpfulness":"HELPFUL"|"UNSURE
         "|"NOT_HELPFUL" } → 200 . 완료된 ACTION/REST/EMPATHY에만; 평가가 비어 있
         어도 활동 완료는 유지. 평가 저장 오류는 활동 완료 오류가 아니다. 파쇄에는 평가 없음.


         6.3 기록·회고·유사 경험

         GET /records (R-01): 공개·미삭제·미만료 걱정만 작성 시각 최신순, display_summ
         ary 는 수정 우선. 각 레코드에 distress_before , distress_after|null , latest_h
         elp_type|null , has_completed_activity 포함. 공개 후 미기록 불안도는 null 이
         며 변화량 계산 금지. 잠김과 실패 요청 제외.

         GET /records/{worryId} (R-02/03): S-14 상세 데이터: 원문·메모·수정 우선 요약
         ·전체 활동 이력(중단 포함)·회고·평가·불안도. BE1 상세와 동일한 공개·열람 서비스
         사용, 이 API도 최초 상세 열람으로 간주. BE2가 BE1 공통 검사 함수를 사용하도록 구
         현.

         GET /reflections/candidate?current_worry_id=w_... (REVIEW-01): 결과는
         최대 1개. 후보 조건: first_available_at 부터 24h 이상, 최초 상세 열람됨, 회고 미
         응답, 미삭제·미만료, 현재 열람 중 걱정 제외. 후보 중 가장 오래된
         first_available_at 우선. 오늘 현지 날짜에 건너뛰기 기록 있으면 data:null .

         PUT /reflections/{worryId} (REVIEW-02): { "outcome":"BETTER"|"ONGOING
         "|"HAPPENED" } → 200 . 표시: 괜찮아짐 / 진행 중 / 걱정대로 됨. 반복 응답 강요 금지.
         현재 상세 걱정 ID와 회고 대상 ID가 다를 수 있음.

         POST /reflections/skip-today (REVIEW-03): { "timezone":"Asia/Seoul" }
         → 200 {local_date:"2026-11-09",skipped:true} . 저장된 사용자 시간대와 교차
         검증하며 해당 날짜 회고 추천을 모두 숨김. 다음 날 다시 후보 가능.

         GET /worries/{worryId}/similar-experience (PAST-01/02): 관련성 기준을 통
         과한 동일 게스트의 과거 공개 기록 최대 1개 반환. 현재·잠김·분석중·실패·삭제·만료
         제외. 응답 DTO 예시: { "record_id":"w_002", "display_summary":"비슷한 경
         험", "previous_help_type":"ACTION", "helpfulness":"HELPFUL",
         "label":"도움이 되었던 경험" } . HELPFUL 평가가 실제로 있을 때만 '도움이 되었던
         경험' 표현 사용. 유사도 낮으면 data:null . FE 링크는 S-14 해당 상세로.


         6.4 파쇄·개별 삭제·전체 삭제

         DELETE /worries/{worryId} (H-02/LOCK-02/R-04): 파쇄·잠김 삭제·기록 삭제
         모두 동일 서버 삭제 파이프라인 호출. X-Deletion-Intent: SHRED|STANDARD 은 분
         석용 선택값(선택), 삭제 범위에는 차이 없음. 202



BE1 · BE2 · AI / FE & PRODUCT                                                          14 / 25
```

<a id="pdf-page-15"></a>

## 원문 p.15 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                  v1.0-draft | 2026.11.09



         {deletion_job_id,status:"RUNNING"} 또는 필수 삭제 전부 완료 시 204 . 202 는 삭
         제 완료가 아니므로 성공 연출 금지. 시작 즉시 해당 레코드 및 파생 내용 조회·검색 차단.
         이미 삭제되었으면 멱등 성공. 예약·AI 결과·활동·평가·유사도 인덱스·캐시까지 제거.

         GET /deletion-jobs/{jobId} : { "status":"RUNNING"|"COMPLETED"|"FAILED_
         RETRYABLE" } . COMPLETED 시에만 FE 완료로 전환. 운영자 재처리 작업은 BE2가 담
         당. 삭제 대상 상세를 응답에 절대 포함하지 않는다.

         DELETE /guest-vault (SET-05): 잠긴/공개 걱정, 분석 중 요청, 활동, 예약, 구독, 게
         스트 세션 모두 삭제 대상. 처리 시작 즉시 읽기 차단·늦은 AI 결과 폐기. 필수 삭제 완료
         후 BE1에 세션/쿠키 폐기 요청하고 S-01로 이동. 오류 시 새 게스트를 자동 발급하지 않
         고 실패 상태 노출.

         30일 보관: 기준은 서버의 제출 접수 시각 accepted_at + 30 days . 수정·열람·재시
         도로 연장하지 않음. 만료되면 즉시 API 조회·검색·추천 차단. 삭제 이력은 내용 없이 30
         일, 백업을 운용한다면 최대 7일 보관 및 복원 시 삭제 재적용(정책 문서 기준).


         6.5 시연 전용 (S-18)

         GET /demo/scenarios , POST /demo/sessions , POST /demo/sessions/
         {demoId}/advance , ** DELETE /demo/sessions/{demoId} **는 서버에서 검증한 DE
         MO_OPERATOR 권한에만 허용하고 실제 사용자 금고/알림 테이블과 논리·물리적으로 격
         리. 일반 내비게이션 노출 없음.

           {
               "data": {"demo_id":"d_1","simulated_now":"2026-11-10T23:00:00Z",
                        "unlocked_demo_worry_ids":["demo_w_1"],
                        "mode":"DEMO_PRESET","notice":"시연용 가상 데이터입니다."},
               "meta":{"request_id":"req_demo"}
           }




               • 시연용 타임머신은 데모 조회의 가상 시간에만 적용. 정상 공개 판정 server_now 를
                 변경하지 않는다.
               • 오프라인 프리셋은 source:"PRESET" 로 표시하여 실제 AI 모델 응답처럼 오도하지
                 않는다.
               • 시연 중 위기 안내의 번호는 보여줄 수 있어도 자동 전화 연결은 금지한다.




BE1 · BE2 · AI / FE & PRODUCT                                                                     15 / 25
```

<a id="pdf-page-16"></a>

## 원문 p.16 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                             v1.0-draft | 2026.11.09




         7. AI 기능·내부 API 명세서 (공급자 교체형)

         7.1 요구사항에서 확정된 AI의 역할
          기능                       P0/P1           생성·판정 결과                             실제 반영 시점
          걱정 내용 구조화·요              P0              요약(공개 후 노출)                          접수 후 백그라운드 생성, 공개까지 숨김
          약
          도움 추천 4종                 P0              SHRED/ACTION/REST/EMPATHY 중 1종 + 근   공개 후 강조, 사용자가 자유롭게 변경
                                                   거
          액션 제안                    P0              작은 행동 3단계                            ACTION 선택 시 표시, 완료는 사용자 제어
          짧은 휴식 안내                 P0              짧고 비진단적인 안내 문구                       REST 선택 시 표시, 타이머는 BE2 제어
          공감 한 문장                  P0              확정적 추측·진단 없는 1회 메시지                  봉인 시 생성, S-12에서 재호출 없이 조회
          안전 분기 보조                 P0              규칙+맥락 기반 SAFE/CRISIS/UNKNOWN         정상 저장 전에 검사, 불확실하면 정상 처리 금
                                                                                        지
          과거 경험 유사도                P0              사용자 내 후보 순위와 기준 통과 여부                공개 후 관련 경험 최대 1개
          캡처 OCR                   P1              이미지 → 검토 가능한 텍스트                     이미지 업로드 후 사용자 확인·수정
          정식 파인튜닝                  추후 기술 선         동일 응답 스키마를 유지하는 신규 provider          기존 API 변경 없이 백엔드 어댑터만 교체
                                   택



         AI 기능명세서가 첨부되어 있지 않음: 이 절의 내부 URL, 모델 입출력 DTO, 프롬프트 버
         전, 검증 로직 및 파인튜닝 운영 정책은 새로 제안한 범용 설계다. 원문에서 AI에 요구된
         동작과 구현 제안을 분리해서 읽어야 한다.


         7.2 내부 추론 API: POST /internal/ai/v1/analyze

         호출자: BE1 Worker만. 인증: 내부 서비스 토큰 또는 mTLS(설계 제안). 내부 네트워크
         ·서비스 ACL로 외부 FE 호출 차단. 중복 처리: 동일 analysis_request_id 와 동일 데
         이터에 대해 결정적 재실행 키로 추적. 로그에는 ID·지연·토큰·오류 종류만 남기고 원문
         ·응답 문장은 저장 금지.

           {
               "analysis_request_id":"ar_101",
               "input":{"worry_text":"내일 발표에서 실수할까 봐 걱정돼요.",
                           "tomorrow_note":"첫 장 확인", "language":"ko"},
               "policy":{"max_action_steps":3,"allowed_helps":["SHRED","ACTION","REST","EMPATHY"],
                            "prompt_version":"wv-2026-11-v1","schema_version":"1.0"},
               "context":{"past_worries":[]}
           }




           {
               "schema_version":"1.0",
               "safety":{"decision":"SAFE","reason_code":"NONE"},
               "content":{
                    "summary":"발표에서 실수할 수 있다는 걱정",
                    "recommended_help":"ACTION",
                    "recommendation_reason":"작게 준비를 시작할 수 있는 부분이 있어요.",
                    "action_steps":["발표 첫 장 키워드 3개 적기", "첫 문장 1번 읽기", "질문 하나 예상해보기"],
                    "rest_guidance":"잠시 자리에서 쉬어가도 괜찮아요.",
                    "empathy_message":"발표가 중요한 만큼 여러 생각이 떠오를 수 있겠어요."
               },
               "model_info":{"provider":"upstage","model":"solar-mini4",




BE1 · BE2 · AI / FE & PRODUCT                                                                                                16 / 25
```

<a id="pdf-page-17"></a>

## 원문 p.17 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                        v1.0-draft | 2026.11.09



                               "prompt_version":"wv-2026-11-v1","latency_ms":1684}
           }




         필수 스키마 검증 규칙: summary 1~500자, 도움 enum 4종 중 1개, action_steps 정
         확히 3개, 사용자 입력에 없는 사실·관계·결과를 단정하지 않음, 의학적 진단·자살위험
         점수·치료 약속 금지, 야간 자유 대화 생성 금지, UNKNOWN 시 정상 봉인 중단. 민감한 출
         력은 별도 저장소 암호화. SHRED 추천을 받아도 서버가 자동 삭제해서는 안 됨.

         예외 응답: { "error_code":"PROVIDER_TIMEOUT|SCHEMA_INVALID|
         SAFETY_UNAVAILABLE|MODEL_RATE_LIMITED", "retryable":true|false } . 모델
         오류가 발생해도 AI 서비스가 빈 문구를 정상 결과처럼 채워 반환하지 않는다.


         7.3 모델 독립 인터페이스

           from typing import Protocol


           class WorryModelProvider(Protocol):
                 async def generate_structured(self, messages, json_schema) -> dict: ...
                 async def embed_text(self, texts: list[str]) -> list[list[float]]: ...
                 async def ocr_image(self, content: bytes, mime_type: str) -> str: ...     # P1


           class WorryAnalyzer:
                 def __init__(self, provider: WorryModelProvider, validator, risk_rules):
                     self.provider, self.validator, self.risk_rules = provider, validator, risk_rules


                 async def analyze(self, safe_input):
                     # 1. 확정 규칙 검사 -> 2. provider 생성 -> 3. 스키마 검증
                     # 4. 안전/사실성 검사 -> 5. 내부 공통 DTO 반환
                    ...




         설정 키(예시): AI_PROVIDER=upstage|self_hosted|mock , AI_MODEL_ID , AI_BASE
         _URL , AI_TIMEOUT_SECONDS , AI_SCHEMA_VERSION , AI_PROMPT_VERSION . FE API와
         DB의 사용자 관점 DTO는 공급자별로 바뀌지 않는다. AI 서비스 내부 model_info 는 관
         측성 메타데이터이며 일반 사용자 UI에는 불필요.


         7.3.1 AI 생성 모델의 실제 Strict JSON Schema (구현 예시)

         다음 스키마는 LLM이 직접 생성하는 부분만 정의한다. schema_version ,
         model_info , provider 명칭, 처리 시간은 모델이 만들지 않고 AI 어댑터/서버가 추가한
         다. minLength , 항목 개수 등 세부 조건은 공급자의 스키마 지원 범위와 무관하게 서버
         validator에서 재검증한다.

           {
               "type": "object",
               "additionalProperties": false,
               "properties": {
                 "safety": {
                   "type": "object",
                   "additionalProperties": false,
                   "properties": {




BE1 · BE2 · AI / FE & PRODUCT                                                                                           17 / 25
```

<a id="pdf-page-18"></a>

## 원문 p.18 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                                        v1.0-draft | 2026.11.09



                              "decision": {"type": "string", "enum": ["SAFE", "CRISIS", "UNKNOWN"]},
                              "reason_code": {"type": "string"}
                         },
                         "required": ["decision", "reason_code"]
                    },
                    "content": {
                         "type": "object",
                         "additionalProperties": false,
                         "properties": {
                              "summary": {"type": "string"},
                              "recommended_help": {"type": "string", "enum": ["SHRED", "ACTION", "REST", "EMPATHY"]},
                              "recommendation_reason": {"type": "string"},
                              "action_steps": {"type": "array", "items": {"type": "string"}},
                              "rest_guidance": {"type": "string"},
                              "empathy_message": {"type": "string"}
                         },
                         "required": ["summary", "recommended_help", "recommendation_reason", "action_steps",
                            "rest_guidance", "empathy_message"]
                    }
               },
               "required": ["safety", "content"]
           }




         정책: decision=CRISIS 또는 UNKNOWN 이면 content 의 생성 문장은 무시하고 BE1이
         위기/안전 오류 흐름으로 전환한다. 구조화 출력 기능은 JSON 형식을 제한할 뿐 의료적
         안전성·사실성을 보장하지 않는다.


         7.4 시나리오 A — Upstage Solar API 호출형 (가장 빠른 P0)

         Upstage 공식 Chat Completions 문서의 API는 POST https://api.upstage.ai/
         v1/chat/completions , SDK Base URL https://api.upstage.ai/v1 이다.
         2026-11 확인 모델 별칭은 solar-mini4 , solar-pro4 등이고,
         response_format.type=json_schema 를 지원한다. 모델 별칭/지원 기능은 배포 시 공
         식 문서 재검증.

           # BE1/AI 서버에서만 실행. 키를 FE 코드나 공개 저장소에 넣지 않는다.
           from openai import AsyncOpenAI


           client = AsyncOpenAI(
                api_key=UPSTAGE_API_KEY,
                base_url="https://api.upstage.ai/v1",
                timeout=20,
           )


           response = await client.chat.completions.create(
                model="solar-mini4",            # 환경 변수로 교체 가능
                messages=[
                            {"role":"system", "content": SYSTEM_PROMPT_V1},
                            {"role":"user", "content": user_worry_text},
                ],
                response_format={
                         "type":"json_schema",
                         "json_schema":{
                              "name":"wooly_worry_analysis",
                              "strict":True,
                              "schema":ANALYSIS_JSON_SCHEMA,
                        }
                },




BE1 · BE2 · AI / FE & PRODUCT                                                                                                           18 / 25
```

<a id="pdf-page-19"></a>

## 원문 p.19 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                  v1.0-draft | 2026.11.09



               stream=False,
           )
           result = validate_analysis_json(response.choices[0].message.content)




         Strict JSON 주의: 모든 중첩 객체에 additionalProperties:false , 모든 속성을
         required 로 나열한다. 선택값은 required에서 빼지 말고 type:["string","null"]
         등으로 표현한다. response_format=json_object 는 JSON 파싱만 보장하며 필드 스
         키마는 보장하지 않으므로 핵심에서는 json_schema 권장.

         Upstage 공식 문서: https://console.upstage.ai/api/chat · https://
         console.upstage.ai/ko/docs/capabilities/generate/chat

         운영: 외부 장애·429·타임아웃에 백오프 재시도(요청 작업 상태는 1개 유지), 완료 전
         DB 저장 금지, 결과 전체 스키마 검증, 원문을 일반 로그·분석 도구에 전달 금지. 외부 업
         체의 보관·학습 약관은 실제 계약과 지역 조건을 확인하고 개인정보 처리방침에 반영.


         7.5 시나리오 B — 오픈 모델+파인튜닝 후 자체 서빙 (교체형)

         권장 구성: 한국어 지원이 가능한 적절한 오픈 가중치 LLM 선택(라이선스·VRAM·상업
         조건 검토) → 일상 걱정 정리 형식/문체용 학습 데이터 구성 → LoRA/QLoRA 등의 파라
         미터 효율 미세조정(SFT) → 분리 평가 → vLLM/TGI 등 OpenAI 호환 추론 서버 배포
         → SelfHostedProvider 어댑터 연결.

           # 내부망 자체 모델 추론 엔드포인트 예시
           client = AsyncOpenAI(
               api_key=INTERNAL_INFERENCE_TOKEN,
               base_url="http://model-server.internal:8000/v1"
           )
           response = await client.chat.completions.create(
               model="wooly-analysis-sft-v1",   # 자체 서빙 모델 식별자
               messages=[{"role":"system","content":SYSTEM_PROMPT_V1},
                         {"role":"user","content":user_worry_text}],
               # 서버가 구조화 출력을 지원하면 schema/grammar 적용
           )
           result = validate_analysis_json(response.choices[0].message.content)




         필수 주의: 자체 서빙 API가 JSON Schema 강제출력을 실제 지원하는지 확인. 미지원
         이면 guided decoding/문법 제약 + JSON 파싱 + 스키마 validator + 안전 검증을 별
         도로 구현하고 실패 시 재시도/최종 실패 처리. Upstage의 파인튜닝 서비스 제공 여부를
         전제하지 않음 — 이 시나리오는 타 모델을 별도 인프라에서 fine-tune해 배포하는 설계
         임.




BE1 · BE2 · AI / FE & PRODUCT                                                                     19 / 25
```

<a id="pdf-page-20"></a>

## 원문 p.20 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                v1.0-draft | 2026.11.09



         학습 데이터 조건: 실제 이용자 걱정을 기본 학습 데이터로 자동 재활용하지 않는다. 별도
         명시적 동의·비식별화·삭제 절차를 확보하지 못하면 합성 시나리오+검토된 공개 사용
         가능 데이터로만 시작한다. 학습 데이터에 비밀번호·이메일·이름 등 민감 내용 포함 금
         지. train/validation/test는 사용자/시나리오 단위로 분리해 누출 검사. 위기 감지는 미
         세조정 모델 하나에 의존하지 말고 BE1 확정 규칙·안전 게이트를 유지.

         P0 권고: 대회 제출 전에는 Upstage 호출형으로 안정적 MVP 구현. 파인튜닝 방식은 동
         일 DTO를 쓰는 연구용 플러그인으로 시험하고, 충분한 비교 검증 후 전환.


         7.6 유사 경험 검색 POST /internal/ai/v1/similarity

           {
               "query":{"worry_id":"w_101","text":"발표에서 실수할까 봐 걱정"},
               "candidates":[
                    {"worry_id":"w_002","text":"지난번 발표가 걱정됐어","helpfulness":"HELPFUL"},
                    {"worry_id":"w_007","text":"시험 준비가 부족한 것 같아","helpfulness":"UNSURE"}
               ],
               "top_k":1
           }




           {"matches":[{"worry_id":"w_002","score":0.82}],"strategy":"embedding_cosine_v1"}




         권한 분리: BE2가 서버에서 동일 소유자의 공개·미삭제·미만료 후보를 필터한 뒤 AI로
         전달. AI는 후보의 worry_id 만 반환하며 FE에 직접 검색 엔드포인트를 노출하지 않음.
         score 기준/임계값은 실제 테스트 데이터로 정하고, P0 구현이 어려우면 서버 키워드
         방식으로 시작해도 외부 계약 유지. 삭제 즉시 임베딩/인덱스 무효화.


         7.7 OCR 선택 API

         FE1 → POST /inputs/ocr (multipart/form-data): {file} 이미지 업로드. 서버
         는 크기·MIME·개인정보 동의 검증 후 AI OCR 어댑터 호출 → 200
         {extracted_text,requires_user_review:true} . 사용자가 내용을 직접 수정·확인
         해야 하며, OCR 결과가 자동 제출되지 않는다. 원본 캡처는 업무 수행 후 즉시 삭제하도
         록 설계. 문서의 핵심 제외 항목 Document Parse 를 필수 연결하지 않는다.

         Upstage 공식 Document OCR 예시: POST https://api.upstage.ai/v1/
         document-digitization 로 multipart/form-data 의 model=ocr , document=<fil
         e> 을 전송할 수 있다. 정확한 이미지 제한과 사용 모델은 공식 문서 확인. https://
         console.upstage.ai/api/parse/document-ocr


         7.8 AI 출력 품질·안전 QA 게이트
          검사                                  실패 처리                                   담당
          구조화 JSON 스키마 일치                     자동 복구/제한 재시도 후 FAILED                   AI, BE1
          도움 추천 4종 enum 준수                    오류 처리, 임의 자동 매핑 금지                      AI



BE1 · BE2 · AI / FE & PRODUCT                                                                                   20 / 25
```

<a id="pdf-page-21"></a>

## 원문 p.21 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                             v1.0-draft | 2026.11.09



          검사                                실패 처리                                       담당
          액션 3단계·짧은 표현                      재생성 1회 또는 실패                                AI
          감정·사실·결과 확정 금지                    금지 표현 검증/QA                                 기획, AI
          위기 문장·맥락 검출                       정책 승인된 안전 분기 / 판단 실패 시 정상 저장 금지             BE1, AI, 기획
          프롬프트 인젝션(입력 안의 '규칙 무시')           사용자 입력은 데이터로 취급, 시스템 정책 변경 불허               AI
          모델 교체 회귀 테스트                      동일 30~50개 대표 시나리오로 비교                       AI, BE1, FE
          삭제·기억 유실 방지                       임베딩/캐시 삭제, 로그에 raw 미기록                      BE2, AI




         8. DB·보관·이벤트 설계(제안)

          테이블           주요 필드 (예시)                                                                                 담당
           guest_sess   id, token_hash, expires_at, timezone, deleted_at                                           BE1
          ions

           guest_sett   guest_id, default_release_local_time, public_opt_in, timezone                              BE1
          ings

           analysis_r   id, guest_id, idem_key_hash, payload_hash, status, accepted_at, finished_at, expires_at,   BE1
          equests       dismissed_at

           worries      id, guest_id, request_id, encrypted_text, encrypted_note, distress_before,                 BE1/
                        distress_after, release_at, accepted_at, first_available_at, first_viewed_at,              BE2
                        delete_state

           ai_content   worry_id, encrypted_summary, encrypted_display_summary, recommendation, reason,            BE1/
          s             actions_json, rest_text, empathy_text, schema_version                                      AI
           activities   id, worry_id, type, status, started_at, paused_at, ends_at, remaining_seconds,             BE2
                        completed_at, stop_reason

           action_ste   activity_id, step_no, title, checked                                                       BE2
          ps

           ratings      activity_id, helpfulness, answered_at                                                      BE2
           reflection   worry_id, outcome, answered_at                                                             BE2
          s

           reflection   guest_id, local_date, timezone                                                             BE2
          _skips

           push_subsc   guest_id, encrypted_endpoint, encrypted_keys, status                                       BE1
          riptions

           notificati   guest_id, worry_id_nullable, type, scheduled_at, status, dedupe_key                        BE1
          on_jobs

           deletion_j   id, guest_id, worry_id_nullable, state, attempted_at                                       BE2
          obs

           deletion_a   opaque_id, object_type, deleted_at (내용·원문 없음)                                              BE2
          udit

           demo_sessi   demo_id, operator_id, simulated_now, isolated_payload                                      BE2
          ons



         중요 불변조건:

               • UNIQUE(guest_id,idempotency_key) + payload hash 검사. request_id →
                 worry_id 는 성공 시 1:1.

               • 민감 데이터 접근은 guest_id 조건 없는 DB 조회/수정 금지; BE2도 BE1 인증 모듈
                 공동 사용.
               • expires_at=accepted_at+30 days , 만료 시각부터 조회 금지; 주기적 실제 삭제
                 워커.




BE1 · BE2 · AI / FE & PRODUCT                                                                                                21 / 25
```

<a id="pdf-page-22"></a>

## 원문 p.22 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                              v1.0-draft | 2026.11.09



            • 삭제 작업 시작 순간 tombstone과 읽기 차단을 확정 → 파생 데이터·알림·캐시 삭
               제 → 완료 확정. 늦은 AI 결과는 버전/세대 검증으로 차단.
            • 일반 DB/서버 로그, APM·크래시 리포트, 제3자 분석 도구에 원문·노트·AI 답변
               ·Push subscription·인증 토큰 미포함.
            • 백업은 최대 7일 유지 정책과 복원 시 삭제 반영 로직을 운영 체크리스트에 포함.


         9. 전체 시퀀스 및 FE 화면별 연결

         9.1 걱정 봉인→공개→도움 실행 시퀀스

           FE1(S-01) -> BE1 POST /guest-sessions -> Cookie -> FE1(S-03)
           FE1(S-03) 입력/불안도/메모 로컬 유지 (서버 기록 없음)
           FE1(S-04) 공개시각/알림 확인
           FE1 -> BE1 POST /worry-submissions [Idempotency-Key]
           BE1 -> 위험 규칙 검사 -> AI 내부 분석 -> 응답 검증 -> DB 암호화 저장
           FE1(S-05) GET /analysis-requests/{id} 반복 조회
             ├ PROCESSING    : 15초 안내 / 30초 홈 이동 가능
             ├ FAILED        : 최종 실패일 때만 재시도
             ├ CRISIS        : S-16 (일반 걱정 없음)
             └ SUCCEEDED     : S-05에 남아 있을 때만 S-06
           S-06 봉인 완료·선택형 재알림
           FE1(S-02) GET /home; FE2(S-07) GET /vault/worries
           FE2(S-07) 잠긴 상태: 목록/잠금 안내(원문 없음)
           server_now >= release_at + 저장 완료 => AVAILABLE
           FE2(S-08) GET /worries/{id} (첫 상세 열람 기록)
           FE2 -> 수정 / 선택 불안도 / 과거 경험 / 회고
           FE2 -> POST /help-selections -> ACTION/REST/EMPATHY or SHRED
           FE2(S-10~12) 활동 상태 저장/명시적 완료 -> S-13
           SHRED -> DELETE -> deletion job COMPLETED -> S-09 완료(평가·S-13 없음)




         9.2 FE 화면별 필수 API 매핑
          화면       F    읽기 API                                 쓰기 API                                   기획·디자인 주의점
                   E
          S-01 첫   FE   /session                                  /guest-sessions                       없음/무효 쿠키 분기;
          이용       1                                                                                    새 게스트 직행 S-03
          S-02 홈   FE   /home , /notifications/status             /analysis-requests/{id}/dismiss , /   요약·원문 비노출, 분
                   1                                           reminders/current (DELETE)               석 요청 별도 표시
          S-03 입   FE   없음                                     없음                                       다음 클릭에 서버 저장
          력        1                                                                                    X, 로컬 초안만
          S-04 시   FE   /settings                                 /worry-submissions , /push-           기본 오전 8시, 알림 기
          간        1                                           subscriptions                            본 꺼짐
          S-05 분   FE   /analysis-requests/{id}                   /.../retry                            15초/30초는 UI 시간,
          석        1                                                                                    실패 확정 아님
          S-06 봉   FE   /notifications/status                     PUT/DELETE /reminders/current         저장 성공 후만 봉인,
          인        1                                                                                    재알림은 수동
          S-07 금   FE   /vault/worries , /worries/{id}/lock       PATCH /worries/{id}/release ,         잠김 메타만, 조기 공
          고        2                                              DELETE /worries/{id}                  개 불가
          S-08 상   FE   /worries/{id} , /reflections/          summary/post-distress/help-              요약 수정은 AI 콘텐츠
          세        2    candidate , /worries/{id}/similar-     selections/reflections                   재생성 안 함
                        experience

          S-09 파   FE   /deletion-jobs/{jobId}                    DELETE /worries/{id}                  완료 확인 후 연출;
          쇄        2                                                                                    S-13 없음




BE1 · BE2 · AI / FE & PRODUCT                                                                                                 22 / 25
```

<a id="pdf-page-23"></a>

## 원문 p.23 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                                     v1.0-draft | 2026.11.09



          화면        F    읽기 API                                     쓰기 API                                     기획·디자인 주의점
                    E
          S-10 액    FE   /activities/{id}                           create, steps, pause/resume/complete       3단계 체크 전 완료 비
          션         2                                                                                          활성
          S-11 휴    FE   /activities/{id}                           create, pause/resume/stop/complete         시작 전 타이머 X, 0초
          식         2                                                                                          후 수동 완료
          S-12 공    FE   /worries/{id}/empathy                      create+complete activity                   읽었어요를 누르기 전
          감         2                                                                                          완료 X
          S-13 완    FE   /activities/{id}                           rating PUT                                 평가 생략 가능, 파쇄
          료         2                                                                                          대상 아님
          S-14 기    FE   /records , /records/{id}                   DELETE /worries/{id}                       공개·미삭제만, 여러
          록         2                                                                                          활동 이력 구분
          S-15 설    FE   /settings , /notifications/status          settings, disable-all, guest-vault         전체 삭제 후 세션 무
          정         1                                               DELETE                                     효 처리
          S-16 위    FE   /crisis-guidance/{id}                      없음                                         전화 자동 연결 금지,
          기         1                                                                                          문구 별도 확정
          S-17 호    FE   없음                                         없음                                         봉인 필수 흐름을 막지
          흡(P1)     1                                                                                          않음
          S-18 시    FE   /demo/scenarios                            demo sessions/advance/reset                별도 권한·가상 시간,
          연         2                                                                                          실제 금고와 격리




         10. 대표 E2E 시나리오·테스트 케이스

          ID     입력/상태                              기대 결과                                        검증 담당
          T-01   첫 방문·쿠키 없음                         안내→새 게스트 생성→S-03                             FE1/BE1
          T-02   무효 쿠키 존재                           401 접근 오류, 자동 타인 게스트 연결 금지                   FE1/BE1
          T-03   걱정 공백만/501자/불안도 없음                 422, 서버 미저장                                  FE1/BE1
          T-04   같은 Idempotency-Key 동일 재전송          request_id 1개                                BE1
          T-05   접수 ACK 전 네트워크 끊김                   상태 확인 전 확정 문구 금지                             FE1/BE1
          T-06   S-05에서 화면 이탈 후 AI 성공               현 화면 유지, 홈 상태만 반영                            FE1/BE1
          T-07   AI 작업 30초 경과                       UI는 홈 이동 가능, 서버 요청은 진행 중                     FE1/BE1
          T-08   잠긴 상세 URL 직접 호출                    409, 민감한 필드 0개                               BE1/BE2
          T-09   다른 게스트의 기록 ID 호출                   404, 정보 유출 없음                                BE1/BE2
          T-10   공개 시각 동시 변경/도달                     성공한 변경만 반영, 재잠금 없음                           FE2/BE1
          T-11   AI 저장이 공개 시각 이후 성공                 즉시 공개 가능, 조건 충족 시 공개 알림 1회                   BE1
          T-12   AI 요약 수정                           카드에 수정 우선, 추천·활동 문구 그대로                      FE2/BE2
          T-13   ACTION 2/3 체크 후 완료                 409, 완료 버튼 비활성                               FE2/BE2
          T-14   REST 시작 후 화면 이탈                    타이머 계속, 복귀 시 서버 잔여 시간 복원                     FE2/BE2
          T-15   REST 일시정지·재개                       잔여 시간 유지, ends_at 재계산                        FE2/BE2
          T-16   REST 0초 도달                         READY 상태만, 직접 완료 버튼 필요                       FE2/BE2
          T-17   EMPATHY 열람만                        미완료, 읽었어요 저장 시 완료                            FE2/BE2
          T-18   파쇄 선택                              삭제 확인 후 DB/검색/캐시/알림 제거, 평가 없음                FE2/BE2/BE1
          T-19   삭제 중 늦은 AI 결과 도착                   재생성 금지, 조회·추천 차단                             BE1/BE2/AI
          T-20   회고 24h 미만·미열람                      후보 없음                                        BE2
          T-21   회고 건너뛰기                            현지 날짜에 추가 제안 없음                              FE2/BE2
          T-22   이전 활동 HELPFUL 없음                   '도움이 되었던' 표현 금지                              FE2/BE2
          T-23   알림 권한 거절/구독 실패                     봉인은 정상, 알림 오류 분리                             FE1/BE1
          T-24   같은 공개 시각 2개                        공개 알림 1개로 묶기                                 BE1
          T-25   재알림 교체 실패                          기존 예약 유지                                     BE1
          T-26   규칙상 명확한 위기 + LLM 장애                정상 봉인 중단, S-16 안내                            BE1/AI/FE1
          T-27   위기 판단 전체 실패                        안전한 최종 오류, 정상 걱정으로 저장 X                      BE1/AI
          T-28   30일 만료/삭제 후 상세 API                 즉시 조회 금지 및 실제 정리                             BE2/BE1
          T-29   일반 사용자의 S-18 직접 호출                 403, 실제 금고/알림 변화 없음                          BE2
          T-30   Offline mock / demo                시연 프리셋을 실제 모델 응답으로 표시 X                      FE2/BE2/AI




BE1 · BE2 · AI / FE & PRODUCT                                                                                                        23 / 25
```

<a id="pdf-page-24"></a>

## 원문 p.24 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                                v1.0-draft | 2026.11.09




         11. 팀별 인수인계 및 개발 순서

          책임자        먼저 만들 계약·목업                                          다음 연결 대상           완료 기준
          BE1        guest session, home, submission, request status,     AI, FE1, FE2       동일 요청 중복 0, 잠김 원문 누출 0
                     release guard
          BE2        공개 detail 공통 권한, summary, help select, activities,   FE2, BE1           파쇄 전 경고·실제 삭제, 활동 상태
                     records, delete                                                         복원
          AI         analysis JSON schema, safety routing, provider       BE1 worker, BE2    모델 변경해도 DTO 변화 0, 안전 실
                     adapter, 30개 테스트 데이터                                 similarity         패 정상 저장 0
          FE1        S-01~06, 15~16 계약 기반 목업 화면                           BE1                15/30초 상태, 실패·위기 분기, 알
                                                                                             림 분리
          FE2        S-07~14,18 계약 기반 목업 화면                               BE1+BE2            잠김 비노출, 변경 확인, 재개·삭제
                                                                                             완료 처리
          기획·디       위기 정책·에러 문구·3단계 액션 톤·알림 문구 승인                        전원                 민감 정보 화면 비노출, 기능 ID와 화
          자인                                                                                 면 매칭



         권장 통합 순서: (1) enum/DTO/게스트 인증 고정 → (2) BE1 접수·AI mock·상태·잠
         금 → (3) BE2 4종 도움/기록/삭제 → (4) AI Upstage 연동 및 안전 검증 → (5) 알림·시
         연·실패·만료 QA → (6) 선택 기능/OCR 및 모델 비교.


         11.1 팀 합의가 필요한 미정 사항

           1. 위기 대응 정책 원본 미첨부: 확정 감지 조건, 전화 번호, S-16 최종 문구, 고위험 판
                단 중간 상태를 별도 승인할 것.
           2. 기술 선택 미정: BE 언어·DB·Queue·Push 서비스·배포 방식·자체 모델 GPU 서
                버는 제안이며 확정 아님.
           3. REST 3분 종료 후 완료 버튼: 종료 인식 상태 명칭/앱 백그라운드 복원 방식 확정 필
                요.
           4. 알림 모든 해제 중 일부 실패: 응답 HTTP/UX 정책을 팀이 하나로 확정할 것.
           5. 요약 수정 동시성: If-Match / version 사용 여부 확정 필요. 권장: 버전 충돌 시
                409.
           6. 리트라이 원문 보유 방식: 최종 실패 후 서버 원문 삭제 정책과 FE 로컬 초안 유실 가
                능성을 고려한 재입력 UX 확정 필요.
           7. AI 제공자 개인정보 계약: 상용 API 입력 보관·학습·리전·추론 제공 방식 실제 설정
                검증 필요.
           8. 유사도 임계값: P0 샘플 평가 후 설정. 단일 숫자를 임상적 판정으로 사용하지 않음.


         12. 원문 추적표·참조 문서

          문서              명세서에 반영한 주요 정책
          화면·동작 정책        p.1~2 흐름·범위·기본값 / p.3~4 세션·홈 / p.5~7 제출·비동기 / p.8~9 공개·상세 / p.10~11 도움 / p.12 회고 /
          (1).pdf         p.13~14 알림 / p.15 위기 / p.16 데이터 삭제 / p.17~18 화면·시연
          기능명세            p.1 BE1/BE2·FE1/FE2 분담 / p.7~10 AI-01~07 / p.11~13 AL-01~10 / p.14~16 M·LOCK·H / p.17~20
          서.pdf           ACT·REST·EMP·RESULT·R / p.21~23 REVIEW·PAST·SET / p.24~29 D·C·DEMO·상태·연동




BE1 · BE2 · AI / FE & PRODUCT                                                                                                   24 / 25
```

<a id="pdf-page-25"></a>

## 원문 p.25 / 25

```text

WOOLY VAULT / TECHNICAL API SPEC                                                                    v1.0-draft | 2026.11.09



          문서            명세서에 반영한 주요 정책
          기획_수정_내       p.1~5 서비스 방향·4종 도움·핵심 범위 / p.6~8 운영·알림·안전·개인정보 / p.9~10 AI 기술 방향·시연·일정
          용_반영.pdf
          Upstage 공식    https://console.upstage.ai/api/chat (Solar Chat Completions, 구조화 출력)
          Chat API
          Upstage 공식    https://console.upstage.ai/ko/docs/capabilities/generate/chat (모델 별칭·SDK)
          빠른 시작
          Upstage 공식    https://console.upstage.ai/api/parse/document-ocr (선택형 이미지 OCR)
          OCR API




                  출처와 설계의 경계: 문서별 업무 정책과 화면 전환은 첨부된 팀 문서에서 가져
                  왔고, REST 리소스 경로, Idempotency-Key , 서비스 토큰, enum, 요청/응답
                  구조와 코드는 협업 편의를 위해 새로 설계한 내용이다. 모든 구현자는 API를
                  확정할 때 이 계약의 버전·변경 이력·FE 영향 범위를 함께 갱신해야 한다.




BE1 · BE2 · AI / FE & PRODUCT                                                                                       25 / 25
```

