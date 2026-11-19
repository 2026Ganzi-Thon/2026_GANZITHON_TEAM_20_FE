# Wooly Vault — Swagger API 전체 문서

> 저장일: 2026-11-12 (한국 기준)
> 원본: Swagger_API 전체 문서.pdf, 90쪽
> OpenAPI 3.0.3 / v1.0.0-draft / 기준일 2026-11-09
> **개발 전 팀 합의용 초안. 실제 서버 구현·검증 완료 명세가 아니다.**

원문 90쪽의 텍스트 전체를 아래에 보존했다. 50개 API operation과 57개 schema의 이름·시작 페이지를 독립적으로 추출해 색인과 대조했다. 앞부분은 FE2가 찾아보기 위한 정리이며 원본에 없는 API를 새로 확정하지 않는다.

## 같이 읽을 문서

- [API 통합 계약·FE2 연결표](WOOLY_VAULT_API_INTEGRATION.md)
- [와이어프레임과 화면 상태](WOOLY_VAULT_WIREFRAMES.md)
- [서비스 기획안과 FE2 담당](WOOLY_VAULT_PLAN.md)

사용자는 FE2(S-07~14, S-18 중심) 담당이다. 이 문서에 FE1·내부 AI operation이 포함되어도 담당 범위가 늘어나는 것은 아니다. Figma 작업물은 변경하지 않는다.

## 원본의 적용 범위

| 항목 | 내용 |
| --- | --- |
| API operation | 50개 |
| API 그룹 | 8개 |
| Schema 정의 | 57개 |
| 공개 API | 기본 경로 /api/v1. 실제 호스트는 문서에 없음 |
| AI 내부 API | /internal/ai/v1/... / 서버 전용, FE 직접 호출 금지 |
| 인증 | guestSession 쿠키, csrfToken 헤더, 내부 internalBearer, 시연 demoOperator |
| 세션 복원 | 쿠키 없는 최초 방문과 무효 쿠키를 구분 |
| 시간 | 서버 공개 판정, ISO 8601 시각과 사용자 시간대 표시 |
| 파쇄 | DELETE 202는 작업 접수. job COMPLETED 확인 후 완료 연출 |
| 원본 계약 | PDF의 원본은 wooly-vault-openapi.yaml. 이번 첨부에는 YAML 파일이 없음 |
| 실행 검증 | 실제 서버 호출·Try it out·OpenAPI lint를 수행한 문서가 아님 |

PDF의 required 표시는 필드 존재 조건이다. nullable과 optional은 별개이며, 인쇄 표에 null 허용이 생략될 수 있다. JSON 예시·통합 문서와 다른 부분은 최신 YAML 또는 백엔드 확정 계약을 확인한다. 이 MD를 기계가 검증한 OpenAPI YAML이나 자동 생성 가능한 완전한 타입 정의로 가장하지 않는다.

## FE2 중요 enum 매핑

| 종류 | API 값 | 화면 표현·동작 |
| --- | --- | --- |
| 도움 | SHRED | 걱정 파쇄. activity 생성·평가 없음 |
| 도움 | ACTION | 10분 액션. 3단계 체크 후 별도 완료 |
| 도움 | REST | 짧은 휴식. 사용자가 시작, 서버 0초 후 별도 완료 |
| 도움 | EMPATHY | 그냥 들어줘. 1회 메시지·읽었어요 후 완료 |
| 회고 | BETTER | 괜찮아짐 |
| 회고 | ONGOING | 진행 중 |
| 회고 | HAPPENED | 걱정대로 됨 |
| 평가 | HELPFUL | 도움 됨 |
| 평가 | UNSURE | 잘 모르겠음 |
| 평가 | NOT_HELPFUL | 도움 안 됨 |
| 활동 | IN_PROGRESS / PAUSED / STOPPED / READY_TO_COMPLETE / COMPLETED | 진행·정지·중단·완료 가능·완료를 구분 |
| 삭제 | PENDING / RUNNING / COMPLETED / FAILED_RETRYABLE | 접수·진행·완료·재처리 필요. 완료 전 성공 표시 금지 |

## FE2가 우선 확인할 schema

| 화면·영역 | 주요 schema | 주의 |
| --- | --- | --- |
| S-07 금고 | WorryLockedCard / WorryAvailableCard / VaultList / LockedMeta / ReleaseChanged | 잠김 카드에는 민감 필드 자체가 없어야 함 |
| S-08 상세 | WorryDetail / AiDisplayedContent / SummaryData / DistressData | 수정 요약 우선, 불안도 미기록과 0 구분 |
| 도움 변경 | HelpSelectionInput / HelpSelectionData | confirm_switch와 expected_active_activity_id |
| S-10~13 | ActivityData / ActionStep / EmpathyData / RatingData | 완료 조건·멱등성 키·종류별 pause/stop 차이 |
| S-14 기록 | RecordCard / RecordList / RecordDetail | latest_help_type와 실제 완료 이력 구분 |
| 회고 | ReflectionCandidate / ReflectionSaved / ReflectionSkip | 현재 걱정과 회고 대상 ID를 구분 |
| 과거 경험 | SimilarExperience | record_id로 기록 상세, HELPFUL 근거 확인 |
| 삭제 | DeletionJob | deletion_job_id로 job 조회 |
| 시연 | DemoScenarios / DemoSession | scenario_id·demo_id·simulated_now, 서버 권한 검사 |
| 공통 | ResponseMeta / ErrorDetail / ErrorEnvelope | data.request_id와 meta.request_id 혼동 금지 |

## 에러에 따른 FE2 처리 참고

코드 이름은 통합 초안과 함께 읽은 것이며, 실제 서버의 확정 계약과 대조해야 한다.

| HTTP·도메인 코드 | 화면 처리 |
| --- | --- |
| 401 GUEST_SESSION_INVALID | 인증 유실 안내. 자동으로 다른 게스트를 발급해 성공처럼 연결하지 않음 |
| 403 CSRF_INVALID | 세션·CSRF 상태 재확인. 무제한 쓰기 재시도 금지 |
| 403 DEMO_FORBIDDEN | 일반 사용자에게 시연 접근·성공 UI를 제공하지 않음 |
| 404 NOT_FOUND | 삭제·만료·타인 기록의 존재 여부를 노출하지 않는 안내 |
| 409 WORRY_LOCKED | 원문 없이 잠금 안내로 처리 |
| 409 ALREADY_AVAILABLE | 시간 변경 종료·상태 갱신. 재잠금 없음 |
| 409 RELEASE_TIME_PASSED | 시각 재선택·서버 상태 갱신 |
| 409 ACTIVITY_SWITCH_CONFIRM_REQUIRED | 기존 활동 유지·중단 확인. 사용자가 승인한 뒤 재요청 |
| 409 ACTIVITY_NOT_READY | 미충족 완료 조건 안내·활동 재조회 |
| 422 VALIDATION_FAILED | 필드별 유효성 안내, 저장 성공으로 표시하지 않음 |
| 429 RATE_LIMITED | Retry-After 등 계약에 따른 재시도 제어 |
| 삭제 응답 불명확/실패 | 파쇄 완료 연출 없이 결과를 확인 |
| 204 | 본문이 없으므로 JSON 파싱하지 않음 |

## 전체 operation 색인

번호는 원본 operation 번호이며, PDF에는 그룹 순서상 #14가 뒤에 나타나고 #46 OCR이 앞에 나타난다. 아래는 번호순이다. 각 페이지 링크에서 요청 본문·인증·응답·예시를 확인한다. FE2 열은 기존 담당 화면 기준으로 분류한 참고다.

| # | 담당 | 메서드 | 경로 | 목적 | FE2 | 원문 시작 |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | BE1 | GET | `/session` | 세션 복원·상태·CSRF | 공통·타 담당 / 내부 | [p.7](#pdf-page-7) |
| 2 | BE1 | POST | `/guest-sessions` | 게스트 생성/새로 시작 | 공통·타 담당 / 내부 | [p.8](#pdf-page-8) |
| 3 | BE1 | GET | `/home` | 홈 통합 요약(민감 내용 제외) | 공통·타 담당 / 내부 | [p.9](#pdf-page-9) |
| 4 | BE1 | GET | `/settings` | 설정·알림 상태 조회 | 공통·타 담당 / 내부 | [p.11](#pdf-page-11) |
| 5 | BE1 | PATCH | `/settings` | 기본 공개 시각·시간대·공개 동의 수정 | 공통·타 담당 / 내부 | [p.12](#pdf-page-12) |
| 6 | BE1 | POST | `/worry-submissions` | 걱정 접수·비동기 분석 | 공통·타 담당 / 내부 | [p.14](#pdf-page-14) |
| 7 | BE1 | GET | `/analysis-requests/{requestId}` | 분석·성공·실패·위기 상태 확인 | 공통·타 담당 / 내부 | [p.15](#pdf-page-15) |
| 8 | BE1 | POST | `/analysis-requests/{requestId}/retry` | 최종 실패 재시도(원문 재전송 검증) | 공통·타 담당 / 내부 | [p.17](#pdf-page-17) |
| 9 | BE1 | PATCH | `/analysis-requests/{requestId}/dismiss` | 실패 카드 닫기 | 공통·타 담당 / 내부 | [p.18](#pdf-page-18) |
| 10 | BE1 | GET | `/vault/worries` | 잠김/공개 목록 분리 | 직접 연동 | [p.22](#pdf-page-22) |
| 11 | BE1 | GET | `/worries/{worryId}/lock` | 잠긴 메타정보 조회 | 직접 연동 | [p.23](#pdf-page-23) |
| 12 | BE1 | PATCH | `/worries/{worryId}/release` | 공개 전 시각 변경 | 직접 연동 | [p.24](#pdf-page-24) |
| 13 | BE1 | GET | `/worries/{worryId}` | 공개 상세·최초 열람 기록 | 직접 연동 | [p.26](#pdf-page-26) |
| 14 | BE2 | DELETE | `/worries/{worryId}` | 개별 삭제·파쇄(동일 실제 삭제) | 직접 연동 | [p.61](#pdf-page-61) |
| 15 | BE1 | GET | `/worries/{worryId}/empathy` | 기존 생성 공감 메시지 조회 | 직접 연동 | [p.27](#pdf-page-27) |
| 16 | BE1 | POST | `/push-subscriptions` | 푸시 구독 연결·갱신 | 공통·타 담당 / 내부 | [p.29](#pdf-page-29) |
| 17 | BE1 | DELETE | `/push-subscriptions/current` | 현재 브라우저 구독 해제 | 공통·타 담당 / 내부 | [p.30](#pdf-page-30) |
| 18 | BE1 | GET | `/notifications/status` | 동의·권한·구독·예약 구분 조회 | 공통·타 담당 / 내부 | [p.31](#pdf-page-31) |
| 19 | BE1 | PUT | `/reminders/current` | 사용자당 1개 재알림 생성/교체 | 공통·타 담당 / 내부 | [p.32](#pdf-page-32) |
| 20 | BE1 | DELETE | `/reminders/current` | 재알림 취소 | 공통·타 담당 / 내부 | [p.33](#pdf-page-33) |
| 21 | BE1 | POST | `/notifications/disable-all` | 공개 동의 해제·재알림 취소 | 공통·타 담당 / 내부 | [p.34](#pdf-page-34) |
| 22 | BE1 | GET | `/crisis-guidance/{requestId}` | 현재 세션의 일회성 위기 안내 | 공통·타 담당 / 내부 | [p.35](#pdf-page-35) |
| 23 | BE2 | PATCH | `/worries/{worryId}/summary` | 수정 요약 저장(재분석 없음) | 직접 연동 | [p.37](#pdf-page-37) |
| 24 | BE2 | PUT | `/worries/{worryId}/post-distress` | 공개 후 불안도 입력/덮어쓰기 | 직접 연동 | [p.38](#pdf-page-38) |
| 25 | BE2 | POST | `/worries/{worryId}/help-selections` | 선택/변경·중단 확인 | 직접 연동 | [p.40](#pdf-page-40) |
| 26 | BE2 | POST | `/worries/{worryId}/activities` | 활동 시작(휴식은 명시적 시작) | 직접 연동 | [p.41](#pdf-page-41) |
| 27 | BE2 | GET | `/activities/{activityId}` | 활동 상태·시간 복원 | 직접 연동 | [p.43](#pdf-page-43) |
| 28 | BE2 | PATCH | `/activities/{activityId}/steps/{stepNumber}` | 액션 체크·체크 취소 | 직접 연동 | [p.44](#pdf-page-44) |
| 29 | BE2 | POST | `/activities/{activityId}/pause` | 액션 중단/휴식 일시정지 | 직접 연동 | [p.46](#pdf-page-46) |
| 30 | BE2 | POST | `/activities/{activityId}/resume` | 활동 재개 | 직접 연동 | [p.47](#pdf-page-47) |
| 31 | BE2 | POST | `/activities/{activityId}/stop` | 도움 변경·휴식 그만두기 | 직접 연동 | [p.48](#pdf-page-48) |
| 32 | BE2 | POST | `/activities/{activityId}/complete` | 명시적 완료 및 S-13 데이터 | 직접 연동 | [p.49](#pdf-page-49) |
| 33 | BE2 | PUT | `/activities/{activityId}/rating` | 선택형 도움 평가 | 직접 연동 | [p.51](#pdf-page-51) |
| 34 | BE2 | GET | `/records` | 공개·미삭제 기록 목록 | 직접 연동 | [p.53](#pdf-page-53) |
| 35 | BE2 | GET | `/records/{worryId}` | 기록 상세·최초 열람 처리 | 직접 연동 | [p.54](#pdf-page-54) |
| 36 | BE2 | GET | `/reflections/candidate` | 24h 경과 회고 대상 최대 1개 | 직접 연동 | [p.55](#pdf-page-55) |
| 37 | BE2 | PUT | `/reflections/{worryId}` | 회고 응답 저장 | 직접 연동 | [p.56](#pdf-page-56) |
| 38 | BE2 | POST | `/reflections/skip-today` | 현지 날짜 회고 제안 건너뛰기 | 직접 연동 | [p.58](#pdf-page-58) |
| 39 | BE2 | GET | `/worries/{worryId}/similar-experience` | 관련 과거 경험 최대 1개 | 직접 연동 | [p.59](#pdf-page-59) |
| 40 | BE2 | GET | `/deletion-jobs/{jobId}` | 삭제 완료 확인 | 직접 연동 | [p.62](#pdf-page-62) |
| 41 | BE2 | DELETE | `/guest-vault` | 전체 삭제·인증 종료 연동 | 공통·타 담당 / 내부 | [p.63](#pdf-page-63) |
| 42 | BE2 | GET | `/demo/scenarios` | 격리 시연 프리셋 조회 | 직접 연동 | [p.64](#pdf-page-64) |
| 43 | BE2 | POST | `/demo/sessions` | 격리 시연 세션 생성 | 직접 연동 | [p.65](#pdf-page-65) |
| 44 | BE2 | POST | `/demo/sessions/{demoId}/advance` | 시연 시간만 이동 | 직접 연동 | [p.67](#pdf-page-67) |
| 45 | BE2 | DELETE | `/demo/sessions/{demoId}` | 시연 데이터만 초기화 | 직접 연동 | [p.68](#pdf-page-68) |
| 46 | BE1 | POST | `/inputs/ocr` | 이미지 OCR(동의 후) | 공통·타 담당 / 내부 | [p.20](#pdf-page-20) |
| 47 | AI | POST | `/internal/ai/v1/analyze` | 분석·안전 관련 구조화 출력 | 공통·타 담당 / 내부 | [p.70](#pdf-page-70) |
| 48 | AI | POST | `/internal/ai/v1/similarity` | 과거 경험 의미 유사도 | 공통·타 담당 / 내부 | [p.71](#pdf-page-71) |
| 49 | AI | POST | `/internal/ai/v1/ocr` | OCR 어댑터 | 공통·타 담당 / 내부 | [p.73](#pdf-page-73) |
| 50 | AI | GET | `/internal/ai/v1/health` | AI 프로바이더 상태(외부 비공개) | 공통·타 담당 / 내부 | [p.73](#pdf-page-73) |

## 전체 schema 색인

필드·필수 여부·제약은 원문 페이지의 표를 확인한다. 페이지를 넘는 schema는 다음 페이지에도 이어진다.

| # | Schema | 원문 시작 |
| ---: | --- | --- |
| 1 | ResponseMeta | [p.76](#pdf-page-76) |
| 2 | ErrorDetail | [p.76](#pdf-page-76) |
| 3 | ErrorEnvelope | [p.76](#pdf-page-76) |
| 4 | GuestData | [p.76](#pdf-page-76) |
| 5 | Settings | [p.77](#pdf-page-77) |
| 6 | VaultCounts | [p.77](#pdf-page-77) |
| 7 | AnalysisCard | [p.77](#pdf-page-77) |
| 8 | LatestActivity | [p.77](#pdf-page-77) |
| 9 | Reminder | [p.77](#pdf-page-77) |
| 10 | HomeData | [p.78](#pdf-page-78) |
| 11 | WorrySubmissionInput | [p.78](#pdf-page-78) |
| 12 | SubmissionAccepted | [p.78](#pdf-page-78) |
| 13 | AnalysisRequestStatus | [p.79](#pdf-page-79) |
| 14 | WorryLockedCard | [p.79](#pdf-page-79) |
| 15 | WorryAvailableCard | [p.79](#pdf-page-79) |
| 16 | VaultList | [p.80](#pdf-page-80) |
| 17 | LockedMeta | [p.80](#pdf-page-80) |
| 18 | ReleaseChanged | [p.80](#pdf-page-80) |
| 19 | ActionStep | [p.80](#pdf-page-80) |
| 20 | AiDisplayedContent | [p.80](#pdf-page-80) |
| 21 | WorryDetail | [p.81](#pdf-page-81) |
| 22 | PushKeys | [p.81](#pdf-page-81) |
| 23 | PushSubscriptionInput | [p.81](#pdf-page-81) |
| 24 | NotificationStatus | [p.82](#pdf-page-82) |
| 25 | HelpSelectionInput | [p.82](#pdf-page-82) |
| 26 | HelpSelectionData | [p.82](#pdf-page-82) |
| 27 | ActivityData | [p.82](#pdf-page-82) |
| 28 | RecordCard | [p.83](#pdf-page-83) |
| 29 | RecordList | [p.83](#pdf-page-83) |
| 30 | ReflectionCandidate | [p.83](#pdf-page-83) |
| 31 | SimilarExperience | [p.84](#pdf-page-84) |
| 32 | DeletionJob | [p.84](#pdf-page-84) |
| 33 | CrisisGuidance | [p.84](#pdf-page-84) |
| 34 | DemoSession | [p.84](#pdf-page-84) |
| 35 | AIInput | [p.85](#pdf-page-85) |
| 36 | AIPolicy | [p.85](#pdf-page-85) |
| 37 | AIAnalyzeRequest | [p.85](#pdf-page-85) |
| 38 | AISafety | [p.85](#pdf-page-85) |
| 39 | AIContent | [p.85](#pdf-page-85) |
| 40 | AIModelInfo | [p.86](#pdf-page-86) |
| 41 | AIAnalyzeResult | [p.86](#pdf-page-86) |
| 42 | SimilarityRequest | [p.86](#pdf-page-86) |
| 43 | SimilarityResult | [p.86](#pdf-page-86) |
| 44 | OCRResult | [p.87](#pdf-page-87) |
| 45 | AIHealth | [p.87](#pdf-page-87) |
| 46 | AIRuntimeError | [p.87](#pdf-page-87) |
| 47 | DismissData | [p.87](#pdf-page-87) |
| 48 | EmpathyData | [p.87](#pdf-page-87) |
| 49 | PushSubscriptionData | [p.88](#pdf-page-88) |
| 50 | DisableNotifications | [p.88](#pdf-page-88) |
| 51 | SummaryData | [p.88](#pdf-page-88) |
| 52 | DistressData | [p.88](#pdf-page-88) |
| 53 | RatingData | [p.89](#pdf-page-89) |
| 54 | RecordDetail | [p.89](#pdf-page-89) |
| 55 | ReflectionSaved | [p.89](#pdf-page-89) |
| 56 | ReflectionSkip | [p.89](#pdf-page-89) |
| 57 | DemoScenarios | [p.89](#pdf-page-89) |

## 원문 전 페이지 보존

요청·응답 JSON 예시, 필드 표, 인증, 상태 코드, 공통 오류, schema 57개와 변경 관리 메모를 포함한 전체 원문이다. 표·코드의 원래 줄바꿈을 보존하기 위해 페이지별 텍스트 블록으로 담았다. 페이지를 넘는 JSON은 한 페이지 블록만으로 유효한 JSON이 아닐 수 있다. 식별자 줄바꿈과 PDF 인쇄 형식의 한계를 고려하고, 실제 코드 생성에는 최신 YAML 원본을 사용한다.

<a id="pdf-page-1"></a>

## 원문 p.1 / 90

```text

W O O LY VA U L T · E N G I N E E R I N G D O C U M E N TA T I O N




Swagger API
명세서
BE1 · BE2 · AI 통합 OpenAPI 문서

프론트엔드 · 백엔드 · AI · 기획/디자인 공통 협업용




50                                     8                             57
API operations                         API groups                    schema definitions




OpenAPI 3.0.3 · v1.0.0-draft · 2026.11.09 기준

원본: Wooly Vault Swagger YAML

개발 전 팀 합의용 초안 · 실제 서버 구현/검증 완료 문서 아님
```

<a id="pdf-page-2"></a>

## 원문 p.2 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                    BE1 · BE2 · AI




 01. 문서 읽는 방법
 이 PDF는 앞서 작성한 Swagger OpenAPI 정의를 읽기 쉬운 인쇄용 형식으로 옮긴 것입니다. HTTP 경로, 요청·응답 형식, 공통 오류, 인
 증, 스키마 정의를 모두 포함합니다. 각 API의 기능 ID 및 연관 화면 ID를 확인해 FE/기획팀도 화면 정책과 연결할 수 있습니다.


 담당 영역과 문서 구성

   API 그룹                                    개수                                 역할


   BE1 · 세션/설정                               5                                  FE1 중심 | S-01, S-02, S-15

   BE1 · 접수/분석                               5                                  FE1 중심 | S-03~06, 위기 S-16

   BE1 · 금고/공개                               5                                  FE2 연동 | S-07, S-08, S-12

   BE1 · 알림/위기                               7                                  FE1 및 기획 | 알림, 위기 대응

   BE2 · 도움/활동                               11                                 FE2 중심 | S-08, S-10~13

   BE2 · 기록/회고                               6                                  FE2 중심 | S-08, S-14

   BE2 · 삭제/시연                               7                                  FE2 및 기획 | S-09, S-15, S-18

   AI · 내부 API                               4                                  BE1/BE2 서버 전용 | Upstage Solar 또는 Self-
                                                                                hosted adapter



 API 표기법
   GET   조회       POST      생성·실행   PUT   교체·저장   PATCH   일부 변경   DELETE   삭제

 요청·응답 예시: 실제 데이터가 아닌 문서용 JSON 샘플입니다. 필수 표기는 Schema의 required 조건을 의미합니다. API별 일반 오류 코
 드는 공통 오류 스키마를 참고하세요.


 기준 정책 6가지

     공개 전 비노출
     서버 시각 release_at 전에는 원문, 메모, AI 결과를 응답하지 않습니다. 클라이언트 단독 잠금 금지.



     비동기 분석
     접수 후 화면을 이탈해도 서버 분석은 계속됩니다. 30초 경과는 최종 실패가 아닙니다.



     파쇄·삭제
     DELETE 202는 삭제 작업 접수입니다. 완료 연출은 삭제 job의 COMPLETED 확인 후만 허용합니다.



     게스트 격리
     서버 발급 세션을 기반으로 모든 조회·변경 API에서 소유권을 검증합니다.



     도움 선택
     SHRED / ACTION / REST / EMPATHY 중 사용자가 직접 선택하며 AI 추천은 강제되지 않습니다.



     AI 독립성
     내부 AI API 스키마 고정: Upstage Solar 또는 자체 fine-tuned 모델을 어댑터에서 교체합니다.




v1.0.0-draft | 2026.11.09                                                                                             2 / 90
```

<a id="pdf-page-3"></a>

## 원문 p.3 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                 BE1 · BE2 · AI



 보안 방식

   인증 ID                         방식                            내용


   guestSession                  cookie                        서버 발급 HttpOnly Secure SameSite=Lax 쿠키
                                                               (이름은 구현 확정 전 예시)

   csrfToken                     header                        GET /session 에서 발급. 변경 요청에서 사용


   internalBearer                bearer                        내부 네트워크 전용 서비스 토큰 (또는 mTLS 대
                                                               체)

   demoOperator                  bearer                        DEMO_OPERATOR 권한 서버 검증, 일반 사용자
                                                               에게 발급하지 않음




     실제 서버 주소·인증·CORS·CSRF 연결 전 Swagger의 Try it out은 정상 실행되지 않습니다. 특히 내부 AI API는 브라우저 직접 호출
     대상이 아닙니다.




v1.0.0-draft | 2026.11.09                                                                          3 / 90
```

<a id="pdf-page-4"></a>

## 원문 p.4 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                    BE1 · BE2 · AI




 02. API 전체 색인

 BE1 · 세션/설정 5개

   #         METHOD           PATH                                     기능


   01          GET            /session                                 세션 복원·상태·CSRF


   02          POST           /guest-sessions                          게스트 생성/새로 시작


   03          GET            /home                                    홈 통합 요약(민감 내용 제외)


   04          GET            /settings                                설정·알림 상태 조회


   05          PATCH          /settings                                기본 공개 시각·시간대·공개 동의 수정




 BE1 · 접수/분석 5개

   #         METHOD           PATH                                     기능


   06          POST           /worry-submissions                       걱정 접수·비동기 분석


   07          GET            /analysis-requests/{requestId}           분석·성공·실패·위기 상태 확인


   08          POST           /analysis-requests/{requestId}/retry     최종 실패 재시도(원문 재전송 검증)


   09          PATCH          /analysis-requests/{requestId}/dismiss   실패 카드 닫기


   46          POST           /inputs/ocr                              이미지 OCR(동의 후)




 BE1 · 금고/공개 5개

   #         METHOD           PATH                                     기능


   10          GET            /vault/worries                           잠김/공개 목록 분리


   11          GET            /worries/{worryId}/lock                  잠긴 메타정보 조회


   12          PATCH          /worries/{worryId}/release               공개 전 시각 변경


   13          GET            /worries/{worryId}                       공개 상세·최초 열람 기록


   15          GET            /worries/{worryId}/empathy               기존 생성 공감 메시지 조회




 BE1 · 알림/위기 7개

   #         METHOD           PATH                                     기능


   16          POST           /push-subscriptions                      푸시 구독 연결·갱신


   17          DELETE         /push-subscriptions/current              현재 브라우저 구독 해제


   18          GET            /notifications/status                    동의·권한·구독·예약 구분 조회


   19          PUT            /reminders/current                       사용자당 1개 재알림 생성/교체




v1.0.0-draft | 2026.11.09                                                                             4 / 90
```

<a id="pdf-page-5"></a>

## 원문 p.5 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                      BE1 · BE2 · AI




   #         METHOD           PATH                                          기능


   20          DELETE         /reminders/current                            재알림 취소


   21          POST           /notifications/disable-all                    공개 동의 해제·재알림 취소


   22          GET            /crisis-guidance/{requestId}                  현재 세션의 일회성 위기 안내




 BE2 · 도움/활동 11개

   #         METHOD           PATH                                          기능


   23          PATCH          /worries/{worryId}/summary                    수정 요약 저장(재분석 없음)


   24          PUT            /worries/{worryId}/post-distress              공개 후 불안도 입력/덮어쓰기


   25          POST           /worries/{worryId}/help-selections            선택/변경·중단 확인


   26          POST           /worries/{worryId}/activities                 활동 시작(휴식은 명시적 시작)


   27          GET            /activities/{activityId}                      활동 상태·시간 복원


   28          PATCH          /activities/{activityId}/steps/{stepNumber}   액션 체크·체크 취소


   29          POST           /activities/{activityId}/pause                액션 중단/휴식 일시정지


   30          POST           /activities/{activityId}/resume               활동 재개


   31          POST           /activities/{activityId}/stop                 도움 변경·휴식 그만두기


   32          POST           /activities/{activityId}/complete             명시적 완료 및 S-13 데이터


   33          PUT            /activities/{activityId}/rating               선택형 도움 평가




 BE2 · 기록/회고 6개

   #         METHOD           PATH                                          기능


   34          GET            /records                                      공개·미삭제 기록 목록


   35          GET            /records/{worryId}                            기록 상세·최초 열람 처리


   36          GET            /reflections/candidate                        24h 경과 회고 대상 최대 1개


   37          PUT            /reflections/{worryId}                        회고 응답 저장


   38          POST           /reflections/skip-today                       현지 날짜 회고 제안 건너뛰기


   39          GET            /worries/{worryId}/similar-experience         관련 과거 경험 최대 1개




 BE2 · 삭제/시연 7개

   #         METHOD           PATH                                          기능


   14          DELETE         /worries/{worryId}                            개별 삭제·파쇄(동일 실제 삭제)


   40          GET            /deletion-jobs/{jobId}                        삭제 완료 확인




v1.0.0-draft | 2026.11.09                                                                               5 / 90
```

<a id="pdf-page-6"></a>

## 원문 p.6 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                           BE1 · BE2 · AI




   #         METHOD           PATH                              기능


   41          DELETE         /guest-vault                      전체 삭제·인증 종료 연동


   42          GET            /demo/scenarios                   격리 시연 프리셋 조회


   43          POST           /demo/sessions                    격리 시연 세션 생성


   44          POST           /demo/sessions/{demoId}/advance   시연 시간만 이동


   45          DELETE         /demo/sessions/{demoId}           시연 데이터만 초기화




 AI · 내부 API 4개

   #         METHOD           PATH                              기능


   47          POST           /internal/ai/v1/analyze           분석·안전 관련 구조화 출력


   48          POST           /internal/ai/v1/similarity        과거 경험 의미 유사도


   49          POST           /internal/ai/v1/ocr               OCR 어댑터


   50          GET            /internal/ai/v1/health            AI 프로바이더 상태(외부 비공개)




v1.0.0-draft | 2026.11.09                                                                    6 / 90
```

<a id="pdf-page-7"></a>

## 원문 p.7 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                   BE1 · BE2 · AI




 03. 엔드포인트 상세 명세

 그룹 및 엔드포인트 번호는 전체 색인의 번호와 같습니다. 각 섹션의 Schema 링크를 통해 부록의 상세 필드 정의로 이동할 수 있습니다.


 01       BE1 · 세션/설정

 FE1 중심 | S-01, S-02, S-15



 #01      BE1

   GET     /session

 세션 복원·상태·CSRF

    화면 S-01, S-02     기능 ID A-01, A-04, A-05    우선순위 P0



     담당: BE1 | 화면: S-01/02 | 기능 ID: A-01/04/05 | 우선순위: P0


     동작·UX 정책: 쿠키 없는 최초 방문은 authenticated=false / NO_SESSION; 기존 쿠키가 무효면 401. 서버에서 인증 유지 30일 갱신. CSRF
     token 반환.

 인증: 인증 없음 (공개 요청)

 Request Body 없음


 Responses

   상태                                            설명                            유형


   401                                           게스트 인증 무효                     공통 오류 구조

   403                                           권한/CSRF 오류                    공통 오류 구조

   404                                           리소스 없음 또는 접근 불가               공통 오류 구조

   409                                           상태 충돌 또는 잠금                   공통 오류 구조

   422                                           입력 검증 실패                      공통 오류 구조

   429                                           호출 제한                         공통 오류 구조

   503                                           AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                           요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                          타입                    설명 · 제약


   data    필수                                  GuestData             —


   meta    필수                                  ResponseMeta          —


 응답 JSON 예시




v1.0.0-draft | 2026.11.09                                                                            7 / 90
```

<a id="pdf-page-8"></a>

## 원문 p.8 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                BE1 · BE2 · AI




     {
         "data": {
            "authenticated": true,
            "guest_id": "g_02e",
            "csrf_token": "csrf_masked",
            "expires_at": "2026-12-09T14:00:00Z",
            "timezone": "Asia/Seoul"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }



 첫 방문, 쿠키 없음 · 추가 응답 예시


     {
         "data": {
            "authenticated": false,
            "reason": "NO_SESSION",
            "csrf_token": "anonymous_csrf"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #02     BE1

   POST     /guest-sessions

 게스트 생성/새로 시작

    화면 S-01      기능 ID A-03      우선순위 P0



     담당: BE1 | 화면: S-01 | 기능 ID: A-03 | 우선순위: P0


     동작·UX 정책: 게스트 생성/새로 시작

 인증: csrfToken


 Request Body
 필수 요청 본문

 application/json · object


   필드                                               타입        설명 · 제약


   start_over     필수                                boolean   기본값: False


 요청 JSON 예시


     {
         "start_over": false
     }




v1.0.0-draft | 2026.11.09                                                         8 / 90
```

<a id="pdf-page-9"></a>

## 원문 p.9 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                         BE1 · BE2 · AI



 Responses

   상태                                                 설명                                 유형


   401                                                게스트 인증 무효                          공통 오류 구조

   403                                                권한/CSRF 오류                         공통 오류 구조

   404                                                리소스 없음 또는 접근 불가                    공통 오류 구조

   409                                                상태 충돌 또는 잠금                        공통 오류 구조

   422                                                입력 검증 실패                           공통 오류 구조

   429                                                호출 제한                              공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가                  공통 오류 구조

   201                                                게스트 생성 · HttpOnly 쿠키 Set-Cookie    정상 응답


 HTTP 201 · 성공 응답

 스키마: object


   필드                                               타입                         설명 · 제약


   data    필수                                       GuestData                  —


   meta    필수                                       ResponseMeta               —


 응답 JSON 예시


     {
         "data": {
            "authenticated": true,
            "guest_id": "g_02e",
            "csrf_token": "csrf_masked",
            "expires_at": "2026-12-09T14:00:00Z",
            "timezone": "Asia/Seoul"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #03      BE1

   GET     /home

 홈 통합 요약(민감 내용 제외)

    화면 S-02      기능 ID HOME-01, HOME-03, HOME-04, HOME-07            우선순위 P0



     담당: BE1 | 화면: S-02 | 기능 ID: HOME-01/03/04/07 | 우선순위: P0


     동작·UX 정책: 홈 통합 요약(민감 내용 제외)

 인증: guestSession




v1.0.0-draft | 2026.11.09                                                                                  9 / 90
```

<a id="pdf-page-10"></a>

## 원문 p.10 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                   BE1 · BE2 · AI



 Request Body 없음


 Responses

   상태                                                설명                            유형


   401                                               게스트 인증 무효                     공통 오류 구조

   403                                               권한/CSRF 오류                    공통 오류 구조

   404                                               리소스 없음 또는 접근 불가               공통 오류 구조

   409                                               상태 충돌 또는 잠금                   공통 오류 구조

   422                                               입력 검증 실패                      공통 오류 구조

   429                                               호출 제한                         공통 오류 구조

   503                                               AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                               요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                            타입                      설명 · 제약


   data    필수                                    HomeData                —


   meta    필수                                    ResponseMeta            —


 응답 JSON 예시


     {
         "data": {
            "vault": {
              "locked_count": 2,
              "available_count": 1,
              "next_release_at": "2026-11-10T23:00:00Z"
            },
            "requests": [
              {
                "request_id": "ar_101",
                "status": "PROCESSING",
                "created_at": "2026-11-09T14:00:00Z",
                "dismissible": false
              }
            ],
            "latest_activity": null,
            "reminder": null,
            "has_any_record": true
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                          10 / 90
```

<a id="pdf-page-11"></a>

## 원문 p.11 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                   BE1 · BE2 · AI




 #04      BE1

   GET     /settings

 설정·알림 상태 조회

    화면 S-15      기능 ID SET-01, SET-02      우선순위 P0



     담당: BE1 | 화면: S-15 | 기능 ID: SET-01/02 | 우선순위: P0


     동작·UX 정책: 설정·알림 상태 조회

 인증: guestSession

 Request Body 없음


 Responses

   상태                                                설명                            유형


   401                                               게스트 인증 무효                     공통 오류 구조

   403                                               권한/CSRF 오류                    공통 오류 구조

   404                                               리소스 없음 또는 접근 불가               공통 오류 구조

   409                                               상태 충돌 또는 잠금                   공통 오류 구조

   422                                               입력 검증 실패                      공통 오류 구조

   429                                               호출 제한                         공통 오류 구조

   503                                               AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                               요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                            타입                      설명 · 제약


   data    필수                                    Settings                —


   meta    필수                                    ResponseMeta            —


 응답 JSON 예시


     {
         "data": {
            "timezone": "Asia/Seoul",
            "default_release_local_time": "08:00",
            "public_notifications_opt_in": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                          11 / 90
```

<a id="pdf-page-12"></a>

## 원문 p.12 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                                BE1 · BE2 · AI




 #05      BE1

   PATCH     /settings

 기본 공개 시각·시간대·공개 동의 수정

    화면 S-15      기능 ID SET-01, SET-02     우선순위 P0



     담당: BE1 | 화면: S-15 | 기능 ID: SET-01/02 | 우선순위: P0


     동작·UX 정책: 기본 공개 시각·시간대·공개 동의 수정

 인증: guestSession+csrfToken


 Request Body
 필수 요청 본문

 application/json · Settings


   필드                                             타입                     설명 · 제약


   timezone     필수                                string                 예: "Asia/Seoul"


   default_release_local_time      필수             string                 pattern: ^([01]\d|2[0-3]):[0-5]\d$ · 예: "08:00"


   public_notifications_opt_in      필수            boolean                기본값: False


 요청 JSON 예시


     {
         "timezone": "Asia/Seoul",
         "default_release_local_time": "08:00",
         "public_notifications_opt_in": false
     }



 Responses

   상태                                                설명                                    유형


   401                                               게스트 인증 무효                             공통 오류 구조

   403                                               권한/CSRF 오류                            공통 오류 구조

   404                                               리소스 없음 또는 접근 불가                       공통 오류 구조

   409                                               상태 충돌 또는 잠금                           공통 오류 구조

   422                                               입력 검증 실패                              공통 오류 구조

   429                                               호출 제한                                 공통 오류 구조

   503                                               AI·안전 검증·푸시 사용 불가                     공통 오류 구조

   200                                               요청 처리 성공                              정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                             타입                     설명 · 제약


   data    필수                                     Settings               —




v1.0.0-draft | 2026.11.09                                                                                                       12 / 90
```

<a id="pdf-page-13"></a>

## 원문 p.13 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                               BE1 · BE2 · AI




   필드                                            타입             설명 · 제약


   meta    필수                                    ResponseMeta   —


 응답 JSON 예시


     {
         "data": {
            "timezone": "Asia/Seoul",
            "default_release_local_time": "09:00",
            "public_notifications_opt_in": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                      13 / 90
```

<a id="pdf-page-14"></a>

## 원문 p.14 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                               BE1 · BE2 · AI




 02       BE1 · 접수/분석

 FE1 중심 | S-03~06, 위기 S-16



 #06     BE1

   POST    /worry-submissions

 걱정 접수·비동기 분석

    화면 S-04, S-05     기능 ID AI-01, AI-04   우선순위 P0



     담당: BE1 | 화면: S-04/05 | 기능 ID: AI-01/04 | 우선순위: P0


     동작·UX 정책: S-03 입력 단계에는 서버 저장 없음. 입력/위기 규칙→AI 구조화·검증→원자적 저장. 같은 Idempotency-Key+본문은 한 요청
     으로 처리. 접수 ACK 전에는 백그라운드 처리 확정 안내 금지.

 인증: guestSession+csrfToken


 파라미터

   이름                                위치                            타입                                   설명


   Idempotency-Key    필수             header                        string                               요청 중복 접수 방지; 동일 키+다른
                                                                                                        본문 409
                                                                                                        최소 8자 · 예:
                                                                                                        "85dbea43-58df-40bb-84a5-
                                                                                                        d95debfca401"



 Request Body
 필수 요청 본문

 application/json · WorrySubmissionInput


   필드                                         타입                            설명 · 제약


   worry_text   필수                            string                        최소 1자 · 최대 500자 · 예: "내일 발표에서 실수할까 봐 걱정돼요."


   distress_level    필수                       integer                       min 1 · max 5 · 예: 4


   tomorrow_note                              string                        최대 100자 · 예: "첫 장만 다시 확인하기"


   release_at   필수                            string (date-time)            예: "2026-11-10T23:00:00Z"


   public_notify                              boolean                       기본값: False


   client_started_at                          string (date-time)            예: "2026-11-10T23:00:00Z"


 요청 JSON 예시


     {
         "worry_text": "내일 발표에서 실수할까 봐 걱정돼요.",
         "distress_level": 4,
         "tomorrow_note": "첫 장만 다시 확인하기",
         "release_at": "2026-11-10T23:00:00Z",
         "public_notify": false,
         "client_started_at": "2026-11-09T13:58:00Z"
     }




v1.0.0-draft | 2026.11.09                                                                                                      14 / 90
```

<a id="pdf-page-15"></a>

## 원문 p.15 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                   BE1 · BE2 · AI



 Responses

   상태                                                설명                            유형


   401                                               게스트 인증 무효                     공통 오류 구조

   403                                               권한/CSRF 오류                    공통 오류 구조

   404                                               리소스 없음 또는 접근 불가               공통 오류 구조

   409                                               상태 충돌 또는 잠금                   공통 오류 구조

   422                                               입력 검증 실패                      공통 오류 구조

   429                                               호출 제한                         공통 오류 구조

   503                                               AI·안전 검증·푸시 사용 불가             공통 오류 구조

   202                                               서버가 분석 요청 접수; 저장·봉인은 아직 아님    정상 응답


 HTTP 202 · 성공 응답

 스키마: object


   필드                                            타입                      설명 · 제약


   data    필수                                    SubmissionAccepted      —


   meta    필수                                    ResponseMeta            —


 응답 JSON 예시


     {
         "data": {
            "request_id": "ar_101",
            "status": "ACCEPTED",
            "accepted_at": "2026-11-09T14:00:00Z",
            "status_url": "/api/v1/analysis-requests/ar_101"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #07      BE1

   GET     /analysis-requests/{requestId}

 분석·성공·실패·위기 상태 확인

    화면 S-05, S-02      기능 ID AI-03, AI-06     우선순위 P0



     담당: BE1 | 화면: S-05/02 | 기능 ID: AI-03/06 | 우선순위: P0


     동작·UX 정책: 15초/30초는 FE 안내 시점이지 서버의 실패 상태가 아님. 화면 이탈 뒤에도 처리; 현재 S-05에서만 완료 화면 이동.

 인증: guestSession




v1.0.0-draft | 2026.11.09                                                                          15 / 90
```

<a id="pdf-page-16"></a>

## 원문 p.16 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                             BE1 · BE2 · AI



 파라미터

   이름                                    위치                                 타입                         설명


   requestId    필수                       path                               string                     requestId 식별자; 다른 게스트/만
                                                                                                       료/삭제는 안전한 404 처리
                                                                                                       예: "ar_101"


 Request Body 없음


 Responses

   상태                                                  설명                                      유형


   401                                                 게스트 인증 무효                               공통 오류 구조

   403                                                 권한/CSRF 오류                              공통 오류 구조

   404                                                 리소스 없음 또는 접근 불가                         공통 오류 구조

   409                                                 상태 충돌 또는 잠금                             공통 오류 구조

   422                                                 입력 검증 실패                                공통 오류 구조

   429                                                 호출 제한                                   공통 오류 구조

   503                                                 AI·안전 검증·푸시 사용 불가                       공통 오류 구조

   200                                                 요청 처리 성공                                정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                               타입                               설명 · 제약


   data    필수                                       AnalysisRequestStatus            —


   meta    필수                                       ResponseMeta                     —


 응답 JSON 예시


     {
         "data": {
            "request_id": "ar_101",
            "status": "SUCCEEDED",
            "worry_id": "w_101",
            "display_state": "LOCKED",
            "release_at": "2026-11-10T23:00:00Z",
            "retryable": false,
            "reason_code": null,
            "guidance_available": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                                                    16 / 90
```

<a id="pdf-page-17"></a>

## 원문 p.17 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                           BE1 · BE2 · AI




 #08     BE1

   POST    /analysis-requests/{requestId}/retry

 최종 실패 재시도(원문 재전송 검증)

    화면 S-05     기능 ID AI-06   우선순위 P0



     담당: BE1 | 화면: S-05 | 기능 ID: AI-06 | 우선순위: P0


     동작·UX 정책: 최종 실패 재시도(원문 재전송 검증)

 인증: guestSession+csrfToken


 파라미터

   이름                              위치                           타입                                   설명


   requestId    필수                 path                         string                               requestId 식별자; 다른 게스트/만
                                                                                                     료/삭제는 안전한 404 처리
                                                                                                     예: "ar_101"



 Request Body
 필수 요청 본문

 application/json · WorrySubmissionInput


   필드                                      타입                            설명 · 제약


   worry_text   필수                         string                        최소 1자 · 최대 500자 · 예: "내일 발표에서 실수할까 봐 걱정돼요."


   distress_level    필수                    integer                       min 1 · max 5 · 예: 4


   tomorrow_note                           string                        최대 100자 · 예: "첫 장만 다시 확인하기"


   release_at   필수                         string (date-time)            예: "2026-11-10T23:00:00Z"


   public_notify                           boolean                       기본값: False


   client_started_at                       string (date-time)            예: "2026-11-10T23:00:00Z"


 요청 JSON 예시


     {
         "worry_text": "내일 발표에서 실수할까 봐 걱정돼요.",
         "distress_level": 4,
         "tomorrow_note": "첫 장만 다시 확인하기",
         "release_at": "2026-11-10T23:00:00Z",
         "public_notify": false
     }



 Responses

   상태                                         설명                                         유형


   401                                        게스트 인증 무효                                  공통 오류 구조

   403                                        권한/CSRF 오류                                 공통 오류 구조

   404                                        리소스 없음 또는 접근 불가                            공통 오류 구조

   409                                        상태 충돌 또는 잠금                                공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                                  17 / 90
```

<a id="pdf-page-18"></a>

## 원문 p.18 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                      BE1 · BE2 · AI




   상태                                                  설명                             유형


   422                                                 입력 검증 실패                       공통 오류 구조

   429                                                 호출 제한                          공통 오류 구조

   503                                                 AI·안전 검증·푸시 사용 불가              공통 오류 구조

   202                                                 실패 확정 후 동일 원문/내용 재시도 접수        정상 응답

   200                                                 이미 처리 중/성공이면 재실행하지 않고 현재 상태    정상 응답
                                                       만 반환


 HTTP 202 · 성공 응답

 스키마: object


   필드                                               타입                      설명 · 제약


   data    필수                                       AnalysisRequestStatus   —


   meta    필수                                       ResponseMeta            —


 응답 JSON 예시


     {
         "data": {
            "request_id": "ar_101",
            "status": "PROCESSING",
            "worry_id": null,
            "display_state": null,
            "release_at": "2026-11-10T23:00:00Z",
            "retryable": false,
            "reason_code": null,
            "guidance_available": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }



 HTTP 200 · 성공 응답

 스키마: object


   필드                                               타입                      설명 · 제약


   data    필수                                       AnalysisRequestStatus   —


   meta    필수                                       ResponseMeta            —



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #09      BE1

   PATCH     /analysis-requests/{requestId}/dismiss

 실패 카드 닫기

    화면 S-02      기능 ID HOME-07        우선순위 P0




v1.0.0-draft | 2026.11.09                                                                             18 / 90
```

<a id="pdf-page-19"></a>

## 원문 p.19 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                             BE1 · BE2 · AI



     담당: BE1 | 화면: S-02 | 기능 ID: HOME-07 | 우선순위: P0


     동작·UX 정책: 실패 카드 닫기

 인증: guestSession+csrfToken


 파라미터

   이름                          위치                        타입                            설명


   requestId    필수             path                      string                        requestId 식별자; 다른 게스트/만
                                                                                       료/삭제는 안전한 404 처리
                                                                                       예: "ar_101"



 Request Body
 필수 요청 본문

 application/json · object


   필드                                 타입                          설명 · 제약


   dismissed    필수                    boolean                     enum: True


 요청 JSON 예시


     {
         "dismissed": true
     }



 Responses

   상태                                    설명                                    유형


   401                                   게스트 인증 무효                             공통 오류 구조

   403                                   권한/CSRF 오류                            공통 오류 구조

   404                                   리소스 없음 또는 접근 불가                       공통 오류 구조

   409                                   상태 충돌 또는 잠금                           공통 오류 구조

   422                                   입력 검증 실패                              공통 오류 구조

   429                                   호출 제한                                 공통 오류 구조

   503                                   AI·안전 검증·푸시 사용 불가                     공통 오류 구조

   200                                   요청 처리 성공                              정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                 타입                          설명 · 제약


   data    필수                         DismissData                 —


   meta    필수                         ResponseMeta                —


 응답 JSON 예시




v1.0.0-draft | 2026.11.09                                                                                    19 / 90
```

<a id="pdf-page-20"></a>

## 원문 p.20 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                    BE1 · BE2 · AI




     {
         "data": {
            "request_id": "ar_101",
            "dismissed": true
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #46      BE1

   POST     /inputs/ocr

 이미지 OCR(동의 후)

    화면 S-03      기능 ID OPTIONAL       우선순위 P1



     담당: BE1 | 화면: S-03 | 기능 ID: OPTIONAL | 우선순위: P1


     동작·UX 정책: 이미지 OCR(동의 후)




     P1: OCR 원본 이미지는 작업 완료 후 즉시 삭제. 업로드 파일 크기/MIME 상한은 보안 검토 후 확정.

 인증: guestSession+csrfToken


 Request Body
 필수 요청 본문

 multipart/form-data · object


   필드                                              타입                     설명 · 제약


   file    필수                                      string (binary)        —


   user_consent     필수                             boolean                캡처 개인정보 처리 동의



 Responses

   상태                                                 설명                            유형


   401                                                게스트 인증 무효                     공통 오류 구조

   403                                                권한/CSRF 오류                    공통 오류 구조

   404                                                리소스 없음 또는 접근 불가               공통 오류 구조

   409                                                상태 충돌 또는 잠금                   공통 오류 구조

   422                                                입력 검증 실패                      공통 오류 구조

   429                                                호출 제한                         공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가             공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                           20 / 90
```

<a id="pdf-page-21"></a>

## 원문 p.21 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                  BE1 · BE2 · AI




   상태                                         설명                     유형


   200                                        요청 처리 성공               정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                      타입              설명 · 제약


   data   필수                               OCRResult       —


   meta   필수                               ResponseMeta    —


 응답 JSON 예시


     {
         "data": {
            "extracted_text": "캡처에서 인식한 텍스트",
            "requires_user_review": true
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                         21 / 90
```

<a id="pdf-page-22"></a>

## 원문 p.22 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                     BE1 · BE2 · AI




 03        BE1 · 금고/공개

 FE2 연동 | S-07, S-08, S-12



 #10      BE1

   GET     /vault/worries

 잠김/공개 목록 분리

    화면 S-07     기능 ID M-01    우선순위 P0



     담당: BE1 | 화면: S-07 | 기능 ID: M-01 | 우선순위: P0


     동작·UX 정책: 잠긴 카드의 원문·메모·요약·불안도·AI 결과 직렬화 금지. 분석 중 요청은 잠긴 수에 포함하지 않음.

 인증: guestSession


 파라미터

   이름                             위치                         타입                          설명


   status                         query                      string                      금고 카드 필터
                                                                                         enum: all, locked, available · 기본
                                                                                         값: all

   cursor                         query                      string                      불투명 페이징 커서


   limit                          query                      integer                     조회 개수
                                                                                         기본값: 20 · min 1 · max 100


 Request Body 없음


 Responses

   상태                                        설명                                  유형


   401                                       게스트 인증 무효                           공통 오류 구조

   403                                       권한/CSRF 오류                          공통 오류 구조

   404                                       리소스 없음 또는 접근 불가                     공통 오류 구조

   409                                       상태 충돌 또는 잠금                         공통 오류 구조

   422                                       입력 검증 실패                            공통 오류 구조

   429                                       호출 제한                               공통 오류 구조

   503                                       AI·안전 검증·푸시 사용 불가                   공통 오류 구조

   200                                       요청 처리 성공                            정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                     타입                           설명 · 제약


   data    필수                             VaultList                    —




v1.0.0-draft | 2026.11.09                                                                                             22 / 90
```

<a id="pdf-page-23"></a>

## 원문 p.23 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                        BE1 · BE2 · AI




   필드                                            타입                      설명 · 제약


   meta    필수                                    ResponseMeta            —


 응답 JSON 예시


     {
         "data": {
            "locked": [
              {
                "id": "w_102",
                "created_at": "2026-11-09T14:00:00Z",
                "release_at": "2026-11-10T23:00:00Z",
                "status": "LOCKED"
              }
            ],
            "available": [
              {
                "id": "w_091",
                "created_at": "2026-11-07T15:00:00Z",
                "release_at": "2026-11-07T23:00:00Z",
                "display_summary": "시험 준비에 대한 걱정",
                "distress_before": 3,
                "is_unviewed": true,
                "first_available_at": "2026-11-07T23:00:00Z",
                "status": "AVAILABLE"
              }
            ],
            "next_cursor": null
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #11      BE1

   GET     /worries/{worryId}/lock

 잠긴 메타정보 조회

    화면 S-07      기능 ID LOCK-01, LOCK-03         우선순위 P0



     담당: BE1 | 화면: S-07 | 기능 ID: LOCK-01/03 | 우선순위: P0


     동작·UX 정책: 잠긴 상태의 공개 시각/작성 시각 메타만 반환. 조기 열기 API 제공하지 않음.

 인증: guestSession


 파라미터

   이름                                    위치                     타입                 설명


   worryId      필수                       path                   string             worryId 식별자; 다른 게스트/만료/
                                                                                   삭제는 안전한 404 처리
                                                                                   예: "w_091"


 Request Body 없음




v1.0.0-draft | 2026.11.09                                                                               23 / 90
```

<a id="pdf-page-24"></a>

## 원문 p.24 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                    BE1 · BE2 · AI



 Responses

   상태                                                 설명                            유형


   401                                                게스트 인증 무효                     공통 오류 구조

   403                                                권한/CSRF 오류                    공통 오류 구조

   404                                                리소스 없음 또는 접근 불가               공통 오류 구조

   409                                                상태 충돌 또는 잠금                   공통 오류 구조

   422                                                입력 검증 실패                      공통 오류 구조

   429                                                호출 제한                         공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                                요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                               타입                    설명 · 제약


   data    필수                                       LockedMeta            —


   meta    필수                                       ResponseMeta          —


 응답 JSON 예시


     {
         "data": {
            "id": "w_102",
            "status": "LOCKED",
            "created_at": "2026-11-09T14:00:00Z",
            "release_at": "2026-11-10T23:00:00Z",
            "can_change_release": true,
            "can_delete": true
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #12      BE1

   PATCH     /worries/{worryId}/release

 공개 전 시각 변경

    화면 S-07      기능 ID TIME-03      우선순위 P0



     담당: BE1 | 화면: S-07 | 기능 ID: TIME-03 | 우선순위: P0


     동작·UX 정책: 소유자·잠김·미래·만료 이전 확인 후 공개 시각 변경. 이미 공개되면 ALREADY_AVAILABLE, 재잠금 불가.

 인증: guestSession+csrfToken



v1.0.0-draft | 2026.11.09                                                                           24 / 90
```

<a id="pdf-page-25"></a>

## 원문 p.25 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                                   BE1 · BE2 · AI



 파라미터

   이름                                    위치                              타입                                   설명


   worryId      필수                       path                            string                               worryId 식별자; 다른 게스트/만료/
                                                                                                              삭제는 안전한 404 처리
                                                                                                              예: "w_091"



 Request Body
 필수 요청 본문

 application/json · object


   필드                                               타입                            설명 · 제약


   release_at        필수                             string (date-time)            예: "2026-11-10T23:00:00Z"


 요청 JSON 예시


     {
         "release_at": "2026-11-11T00:00:00Z"
     }



 Responses

   상태                                                  설명                                       유형


   401                                                 게스트 인증 무효                                공통 오류 구조

   403                                                 권한/CSRF 오류                               공통 오류 구조

   404                                                 리소스 없음 또는 접근 불가                          공통 오류 구조

   409                                                 상태 충돌 또는 잠금                              공통 오류 구조

   422                                                 입력 검증 실패                                 공통 오류 구조

   429                                                 호출 제한                                    공통 오류 구조

   503                                                 AI·안전 검증·푸시 사용 불가                        공통 오류 구조

   200                                                 요청 처리 성공                                 정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                               타입                            설명 · 제약


   data    필수                                       ReleaseChanged                —


   meta    필수                                       ResponseMeta                  —


 응답 JSON 예시


     {
         "data": {
            "id": "w_102",
            "release_at": "2026-11-11T00:00:00Z",
            "version": 2
         },
         "meta": {
            "request_id": "req_example",




v1.0.0-draft | 2026.11.09                                                                                                          25 / 90
```

<a id="pdf-page-26"></a>

## 원문 p.26 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                       BE1 · BE2 · AI



             "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #13      BE1

   GET       /worries/{worryId}

 공개 상세·최초 열람 기록

    화면 S-08        기능 ID M-02      우선순위 P0



     담당: BE1 | 화면: S-08 | 기능 ID: M-02 | 우선순위: P0


     동작·UX 정책: 서버 공개 이후에만 민감 상세 허용. GET 최초 열람 first_viewed_at을 idempotent 기록. 삭제/만료도 검사.

 인증: guestSession


 파라미터

   이름                                     위치                           타입                         설명


   worryId        필수                      path                         string                     worryId 식별자; 다른 게스트/만료/
                                                                                                  삭제는 안전한 404 처리
                                                                                                  예: "w_091"


 Request Body 없음


 Responses

   상태                                                  설명                                 유형


   401                                                 게스트 인증 무효                          공통 오류 구조

   403                                                 권한/CSRF 오류                         공통 오류 구조

   404                                                 리소스 없음 또는 접근 불가                    공통 오류 구조

   409                                                 상태 충돌 또는 잠금                        공통 오류 구조

   422                                                 입력 검증 실패                           공통 오류 구조

   429                                                 호출 제한                              공통 오류 구조

   503                                                 AI·안전 검증·푸시 사용 불가                  공통 오류 구조

   200                                                 요청 처리 성공                           정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                               타입                          설명 · 제약


   data      필수                                     WorryDetail                 —


   meta      필수                                     ResponseMeta                —




v1.0.0-draft | 2026.11.09                                                                                              26 / 90
```

<a id="pdf-page-27"></a>

## 원문 p.27 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                      BE1 · BE2 · AI



 응답 JSON 예시


     {
         "data": {
            "id": "w_091",
            "status": "AVAILABLE",
            "created_at": "2026-11-07T15:00:00Z",
            "release_at": "2026-11-07T23:00:00Z",
            "first_available_at": "2026-11-07T23:00:00Z",
            "first_viewed_at": "2026-11-09T14:01:00Z",
            "worry_text": "내일 시험 준비가 부족한 것 같아.",
            "tomorrow_note": "목차 확인",
            "distress_before": 3,
            "distress_after": null,
            "ai_content": {
              "original_summary": "시험 준비에 대한 걱정",
              "display_summary": "시험 준비에 대한 걱정",
              "recommended_help": "ACTION",
              "recommendation_reason": "작은 준비 행동을 선택할 수 있어요.",
              "action_steps": [
                 {
                    "step_number": 1,
                    "title": "시험 범위 확인",
                    "checked": false
                 },
                 {
                    "step_number": 2,
                    "title": "우선할 1쪽 정리",
                    "checked": false
                 },
                 {
                    "step_number": 3,
                    "title": "짧게 복습",
                    "checked": false
                 }
              ],
              "rest_guidance": "잠시 쉬어가도 괜찮아요.",
              "empathy_message": "걱정을 적어두고 다시 확인하러 오셨군요."
            },
            "allowed_help": [
              "SHRED",
              "ACTION",
              "REST",
              "EMPATHY"
            ]
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #15     BE1

   GET    /worries/{worryId}/empathy

 기존 생성 공감 메시지 조회

    화면 S-12     기능 ID EMP-01   우선순위 P0



     담당: BE1 | 화면: S-12 | 기능 ID: EMP-01 | 우선순위: P0


     동작·UX 정책: 봉인 시 생성한 메시지를 조회만 함. 모델 재호출/실시간 채팅 없음.




v1.0.0-draft | 2026.11.09                                             27 / 90
```

<a id="pdf-page-28"></a>

## 원문 p.28 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                           BE1 · BE2 · AI



 인증: guestSession


 파라미터

   이름                           위치                         타입                         설명


   worryId     필수               path                       string                     worryId 식별자; 다른 게스트/만료/
                                                                                      삭제는 안전한 404 처리
                                                                                      예: "w_091"


 Request Body 없음


 Responses

   상태                                    설명                                   유형


   401                                   게스트 인증 무효                            공통 오류 구조

   403                                   권한/CSRF 오류                           공통 오류 구조

   404                                   리소스 없음 또는 접근 불가                      공통 오류 구조

   409                                   상태 충돌 또는 잠금                          공통 오류 구조

   422                                   입력 검증 실패                             공통 오류 구조

   429                                   호출 제한                                공통 오류 구조

   503                                   AI·안전 검증·푸시 사용 불가                    공통 오류 구조

   200                                   요청 처리 성공                             정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                  타입                           설명 · 제약


   data   필수                           EmpathyData                  —


   meta   필수                           ResponseMeta                 —


 응답 JSON 예시


     {
         "data": {
            "worry_id": "w_091",
            "empathy_message": "걱정을 적어두고 다시 확인하러 오셨군요."
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                                  28 / 90
```

<a id="pdf-page-29"></a>

## 원문 p.29 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                              BE1 · BE2 · AI




 04       BE1 · 알림/위기

 FE1 및 기획 | 알림, 위기 대응



 #16      BE1

   POST     /push-subscriptions

 푸시 구독 연결·갱신

    화면 S-04, S-15      기능 ID AL-02     우선순위 P0



     담당: BE1 | 화면: S-04/15 | 기능 ID: AL-02 | 우선순위: P0


     동작·UX 정책: 푸시 구독 연결·갱신

 인증: guestSession+csrfToken


 Request Body
 필수 요청 본문

 application/json · PushSubscriptionInput


   필드                                           타입                      설명 · 제약


   endpoint     필수                              string (uri)            예: "https://push.example/sub"


   keys    필수                                   PushKeys                —


   client_permission        필수                  string                  enum: granted, denied, default


 요청 JSON 예시


     {
         "endpoint": "https://push.example.com/subscription",
         "keys": {
            "p256dh": "example_p256dh",
            "auth": "example_auth"
         },
         "client_permission": "granted"
     }



 Responses

   상태                                               설명                                  유형


   401                                              게스트 인증 무효                           공통 오류 구조

   403                                              권한/CSRF 오류                          공통 오류 구조

   404                                              리소스 없음 또는 접근 불가                     공통 오류 구조

   409                                              상태 충돌 또는 잠금                         공통 오류 구조

   422                                              입력 검증 실패                            공통 오류 구조

   429                                              호출 제한                               공통 오류 구조

   503                                              AI·안전 검증·푸시 사용 불가                   공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                     29 / 90
```

<a id="pdf-page-30"></a>

## 원문 p.30 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                 BE1 · BE2 · AI




   상태                                                 설명                            유형


   201                                                신규 구독 등록                      정상 응답

   200                                                기존 구독 갱신                      정상 응답


 HTTP 201 · 성공 응답

 스키마: object


   필드                                              타입                     설명 · 제약


   data    필수                                      PushSubscriptionData   —


   meta    필수                                      ResponseMeta           —


 응답 JSON 예시


     {
         "data": {
            "subscription_id": "push_01",
            "subscribed": true,
            "created_at": "2026-11-09T14:00:00Z"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }



 HTTP 200 · 성공 응답

 스키마: object


   필드                                              타입                     설명 · 제약


   data    필수                                      PushSubscriptionData   —


   meta    필수                                      ResponseMeta           —



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #17      BE1

   DELETE       /push-subscriptions/current

 현재 브라우저 구독 해제

    화면 S-15       기능 ID AL-02, SET-03     우선순위 P0



     담당: BE1 | 화면: S-15 | 기능 ID: AL-02/SET-03 | 우선순위: P0


     동작·UX 정책: 현재 브라우저 구독 해제

 인증: guestSession+csrfToken

 Request Body 없음




v1.0.0-draft | 2026.11.09                                                                        30 / 90
```

<a id="pdf-page-31"></a>

## 원문 p.31 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                  BE1 · BE2 · AI



 Responses

   상태                                         설명                  유형


   401                                        게스트 인증 무효           공통 오류 구조

   403                                        권한/CSRF 오류          공통 오류 구조

   404                                        리소스 없음 또는 접근 불가     공통 오류 구조

   409                                        상태 충돌 또는 잠금         공통 오류 구조

   422                                        입력 검증 실패            공통 오류 구조

   429                                        호출 제한               공통 오류 구조

   503                                        AI·안전 검증·푸시 사용 불가   공통 오류 구조

   204                                        현재 브라우저 구독 해제       정상 응답


 HTTP 204 · 성공 응답



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #18     BE1

   GET    /notifications/status

 동의·권한·구독·예약 구분 조회

    화면 S-06, S-15     기능 ID AL-02, AL-06   우선순위 P0



     담당: BE1 | 화면: S-06/15 | 기능 ID: AL-02/06 | 우선순위: P0


     동작·UX 정책: 동의·권한·구독·예약 구분 조회

 인증: guestSession

 Request Body 없음


 Responses

   상태                                         설명                  유형


   401                                        게스트 인증 무효           공통 오류 구조

   403                                        권한/CSRF 오류          공통 오류 구조

   404                                        리소스 없음 또는 접근 불가     공통 오류 구조

   409                                        상태 충돌 또는 잠금         공통 오류 구조

   422                                        입력 검증 실패            공통 오류 구조

   429                                        호출 제한               공통 오류 구조

   503                                        AI·안전 검증·푸시 사용 불가   공통 오류 구조

   200                                        요청 처리 성공            정상 응답


 HTTP 200 · 성공 응답



v1.0.0-draft | 2026.11.09                                                         31 / 90
```

<a id="pdf-page-32"></a>

## 원문 p.32 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                          BE1 · BE2 · AI



 스키마: object


   필드                                            타입                   설명 · 제약


   data    필수                                    NotificationStatus   —


   meta    필수                                    ResponseMeta         —


 응답 JSON 예시


     {
         "data": {
            "opt_in": false,
            "browser_permission_reported": "default",
            "subscribed": false,
            "public_jobs_pending": 0,
            "active_reminder": null
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #19      BE1

   PUT     /reminders/current

 사용자당 1개 재알림 생성/교체

    화면 S-06      기능 ID AL-05      우선순위 P0



     담당: BE1 | 화면: S-06 | 기능 ID: AL-05 | 우선순위: P0


     동작·UX 정책: 사용자당 1개 재알림 생성/교체

 인증: guestSession+csrfToken


 Request Body
 필수 요청 본문

 application/json · object


   필드                                            타입                   설명 · 제약


   worry_id     필수                               string               예: "w_091"


   delay_minutes     필수                          integer              enum: 30, 60


 요청 JSON 예시


     {
         "worry_id": "w_101",
         "delay_minutes": 30
     }




v1.0.0-draft | 2026.11.09                                                                 32 / 90
```

<a id="pdf-page-33"></a>

## 원문 p.33 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                    BE1 · BE2 · AI



 Responses

   상태                                                 설명                            유형


   401                                                게스트 인증 무효                     공통 오류 구조

   403                                                권한/CSRF 오류                    공통 오류 구조

   404                                                리소스 없음 또는 접근 불가               공통 오류 구조

   409                                                상태 충돌 또는 잠금                   공통 오류 구조

   422                                                입력 검증 실패                      공통 오류 구조

   429                                                호출 제한                         공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                                요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                            타입                       설명 · 제약


   data    필수                                    Reminder                 —


   meta    필수                                    ResponseMeta             —


 응답 JSON 예시


     {
         "data": {
            "reminder_id": "rem_01",
            "worry_id": "w_101",
            "scheduled_at": "2026-11-09T14:30:00Z",
            "replaces_previous": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #20      BE1

   DELETE       /reminders/current

 재알림 취소

    화면 S-06, S-02, S-15      기능 ID AL-06      우선순위 P0



     담당: BE1 | 화면: S-06/02/15 | 기능 ID: AL-06 | 우선순위: P0


     동작·UX 정책: 재알림 취소

 인증: guestSession+csrfToken

 Request Body 없음



v1.0.0-draft | 2026.11.09                                                                           33 / 90
```

<a id="pdf-page-34"></a>

## 원문 p.34 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                          BE1 · BE2 · AI



 Responses

   상태                                     설명                              유형


   401                                    게스트 인증 무효                       공통 오류 구조

   403                                    권한/CSRF 오류                      공통 오류 구조

   404                                    리소스 없음 또는 접근 불가                 공통 오류 구조

   409                                    상태 충돌 또는 잠금                     공통 오류 구조

   422                                    입력 검증 실패                        공통 오류 구조

   429                                    호출 제한                           공통 오류 구조

   503                                    AI·안전 검증·푸시 사용 불가               공통 오류 구조

   204                                    재알림 없음도 204 성공                  정상 응답


 HTTP 204 · 성공 응답



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #21     BE1

   POST    /notifications/disable-all

 공개 동의 해제·재알림 취소

    화면 S-15     기능 ID SET-03   우선순위 P0



     담당: BE1 | 화면: S-15 | 기능 ID: SET-03 | 우선순위: P0


     동작·UX 정책: 공개 동의 해제·재알림 취소

 인증: guestSession+csrfToken

 Request Body 없음


 Responses

   상태                                     설명                              유형


   401                                    게스트 인증 무효                       공통 오류 구조

   403                                    권한/CSRF 오류                      공통 오류 구조

   404                                    리소스 없음 또는 접근 불가                 공통 오류 구조

   409                                    상태 충돌 또는 잠금                     공통 오류 구조

   422                                    입력 검증 실패                        공통 오류 구조

   429                                    호출 제한                           공통 오류 구조

   503                                    AI·안전 검증·푸시 사용 불가               공통 오류 구조

   200                                    전체 성공 또는 일부 실패 표시; 부분 실패 HTTP   정상 응답
                                          처리 팀 확정 필요




v1.0.0-draft | 2026.11.09                                                                 34 / 90
```

<a id="pdf-page-35"></a>

## 원문 p.35 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                          BE1 · BE2 · AI



 HTTP 200 · 성공 응답

 스키마: object


   필드                                              타입                              설명 · 제약


   data    필수                                      DisableNotifications            —


   meta    필수                                      ResponseMeta                    —


 응답 JSON 예시


     {
         "data": {
            "public_opt_in": false,
            "reminder_canceled": true,
            "partial_failure": false,
            "failed_parts": []
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #22      BE1

   GET     /crisis-guidance/{requestId}

 현재 세션의 일회성 위기 안내

    화면 S-16      기능 ID C-02, C-03      우선순위 P0



     담당: BE1 | 화면: S-16 | 기능 ID: C-02/03 | 우선순위: P0


     동작·UX 정책: 현재 세션의 일회성 위기 안내




     미확정: 위기 판단 임계값, 상담 연락처, 최종 문구는 원본에 별도 승인 자료 없음. 빈 예시 연락처를 운영에 그대로 적용하지 말 것.

 인증: guestSession


 파라미터

   이름                                    위치                               타입                        설명


   requestId    필수                       path                             string                    requestId 식별자; 다른 게스트/만
                                                                                                    료/삭제는 안전한 404 처리
                                                                                                    예: "ar_101"


 Request Body 없음


 Responses

   상태                                                 설명                                     유형


   401                                                게스트 인증 무효                              공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                                 35 / 90
```

<a id="pdf-page-36"></a>

## 원문 p.36 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                       BE1 · BE2 · AI




   상태                                    설명                            유형


   403                                   권한/CSRF 오류                    공통 오류 구조

   404                                   리소스 없음 또는 접근 불가               공통 오류 구조

   409                                   상태 충돌 또는 잠금                   공통 오류 구조

   422                                   입력 검증 실패                      공통 오류 구조

   429                                   호출 제한                         공통 오류 구조

   503                                   AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                   요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                 타입                     설명 · 제약


   data   필수                          CrisisGuidance         —


   meta   필수                          ResponseMeta           —


 응답 JSON 예시


     {
         "data": {
            "guidance_version": "crisis-v1",
            "message": "[기획·안전 정책 확정 후 안내 문구 제공]",
            "resources": [],
            "can_copy_phone": true
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                              36 / 90
```

<a id="pdf-page-37"></a>

## 원문 p.37 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                              BE1 · BE2 · AI




 05       BE2 · 도움/활동

 FE2 중심 | S-08, S-10~13



 #23     BE2

   PATCH     /worries/{worryId}/summary

 수정 요약 저장(재분석 없음)

    화면 S-08     기능 ID M-04    우선순위 P0



     담당: BE2 | 화면: S-08 | 기능 ID: M-04 | 우선순위: P0


     동작·UX 정책: 수정 요약 저장(재분석 없음)

 인증: guestSession+csrfToken


 파라미터

   이름                             위치                         타입                          설명


   worryId     필수                 path                       string                      worryId 식별자; 다른 게스트/만료/
                                                                                         삭제는 안전한 404 처리
                                                                                         예: "w_091"



 Request Body
 필수 요청 본문

 application/json · object


   필드                                    타입                           설명 · 제약


   display_summary    필수                 string                       최소 1자 · 최대 500자


 요청 JSON 예시


     {
         "display_summary": "발표 준비에 대한 걱정"
     }



 Responses

   상태                                        설명                                   유형


   401                                       게스트 인증 무효                            공통 오류 구조

   403                                       권한/CSRF 오류                           공통 오류 구조

   404                                       리소스 없음 또는 접근 불가                      공통 오류 구조

   409                                       상태 충돌 또는 잠금                          공통 오류 구조

   422                                       입력 검증 실패                             공통 오류 구조

   429                                       호출 제한                                공통 오류 구조

   503                                       AI·안전 검증·푸시 사용 불가                    공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                     37 / 90
```

<a id="pdf-page-38"></a>

## 원문 p.38 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                           BE1 · BE2 · AI




   상태                                         설명                              유형


   200                                        요청 처리 성공                        정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                      타입                       설명 · 제약


   data    필수                              SummaryData              —


   meta    필수                              ResponseMeta             —


 응답 JSON 예시


     {
         "data": {
            "worry_id": "w_091",
            "display_summary": "발표 준비에 대한 걱정",
            "version": 2
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #24      BE2

   PUT    /worries/{worryId}/post-distress

 공개 후 불안도 입력/덮어쓰기

    화면 S-08      기능 ID M-03   우선순위 P0



     담당: BE2 | 화면: S-08 | 기능 ID: M-03 | 우선순위: P0


     동작·UX 정책: 공개 후 불안도 입력/덮어쓰기

 인증: guestSession+csrfToken


 파라미터

   이름                               위치                     타입                         설명


   worryId      필수                  path                   string                     worryId 식별자; 다른 게스트/만료/
                                                                                      삭제는 안전한 404 처리
                                                                                      예: "w_091"



 Request Body
 필수 요청 본문

 application/json · object




v1.0.0-draft | 2026.11.09                                                                                  38 / 90
```

<a id="pdf-page-39"></a>

## 원문 p.39 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                          BE1 · BE2 · AI




   필드                                              타입                     설명 · 제약


   distress_after     필수                           integer                min 1 · max 5


 요청 JSON 예시


     {
         "distress_after": 2
     }



 Responses

   상태                                                 설명                                  유형


   401                                                게스트 인증 무효                           공통 오류 구조

   403                                                권한/CSRF 오류                          공통 오류 구조

   404                                                리소스 없음 또는 접근 불가                     공통 오류 구조

   409                                                상태 충돌 또는 잠금                         공통 오류 구조

   422                                                입력 검증 실패                            공통 오류 구조

   429                                                호출 제한                               공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가                   공통 오류 구조

   200                                                요청 처리 성공                            정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                              타입                     설명 · 제약


   data    필수                                      DistressData           —


   meta    필수                                      ResponseMeta           —


 응답 JSON 예시


     {
         "data": {
            "worry_id": "w_091",
            "distress_before": 4,
            "distress_after": 2,
            "distress_delta": -2
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                                 39 / 90
```

<a id="pdf-page-40"></a>

## 원문 p.40 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                     BE1 · BE2 · AI




 #25     BE2

   POST     /worries/{worryId}/help-selections

 선택/변경·중단 확인

    화면 S-08      기능 ID M-05      우선순위 P0



     담당: BE2 | 화면: S-08 | 기능 ID: M-05 | 우선순위: P0


     동작·UX 정책: 진행/일시정지 활동이 있으면 부작용 없이 ACTIVITY_SWITCH_CONFIRM_REQUIRED. SHRED는 선택 후 추가 삭제 확인이
     필요.

 인증: guestSession+csrfToken


 파라미터

   이름                                   위치                       타입                             설명


   worryId     필수                       path                     string                         worryId 식별자; 다른 게스트/만료/
                                                                                                삭제는 안전한 404 처리
                                                                                                예: "w_091"



 Request Body
 필수 요청 본문

 application/json · HelpSelectionInput


   필드                                          타입                         설명 · 제약


   help_type    필수                             string                     걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                                          enum: SHRED, ACTION, REST, EMPATHY

   confirm_switch                              boolean                    기본값: False


   expected_active_activity_id                 string                     —


 요청 JSON 예시


     {
         "help_type": "ACTION",
         "confirm_switch": false,
         "expected_active_activity_id": null
     }



 Responses

   상태                                             설명                                   유형


   401                                            게스트 인증 무효                            공통 오류 구조

   403                                            권한/CSRF 오류                           공통 오류 구조

   404                                            리소스 없음 또는 접근 불가                      공통 오류 구조

   409                                            진행 중 도움 전환 확인 필요 / 기존 동작 유지          공통 오류 구조

   422                                            입력 검증 실패                             공통 오류 구조

   429                                            호출 제한                                공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                            40 / 90
```

<a id="pdf-page-41"></a>

## 원문 p.41 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                          BE1 · BE2 · AI




   상태                                                설명                                   유형


   503                                               AI·안전 검증·푸시 사용 불가                    공통 오류 구조

   200                                               요청 처리 성공                             정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                             타입                            설명 · 제약


   data    필수                                     HelpSelectionData             —


   meta    필수                                     ResponseMeta                  —


 응답 JSON 예시


     {
         "data": {
            "worry_id": "w_091",
            "help_type": "ACTION",
            "selected_at": "2026-11-09T14:00:00Z",
            "stopped_previous_activity": false,
            "requires_delete_confirmation": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #26      BE2

   POST     /worries/{worryId}/activities

 활동 시작(휴식은 명시적 시작)

    화면 S-10, S-11, S-12      기능 ID ACT-01, REST-01, EMP-02       우선순위 P0



     담당: BE2 | 화면: S-10/11/12 | 기능 ID: ACT-01/REST-01/EMP-02 | 우선순위: P0


     동작·UX 정책: ACTION은 S-10 진입, REST는 사용자가 시작 버튼, EMPATHY는 S-12 진입 후 생성. SHRED는 activity 생성 안 함.

 인증: guestSession+csrfToken


 파라미터

   이름                                    위치                            타입                         설명


   worryId      필수                       path                          string                     worryId 식별자; 다른 게스트/만료/
                                                                                                  삭제는 안전한 404 처리
                                                                                                  예: "w_091"

   Idempotency-Key     필수                header                        string                     화면 재진입 활동 중복 방지
                                                                                                  예: "activity-1050901"




v1.0.0-draft | 2026.11.09                                                                                                 41 / 90
```

<a id="pdf-page-42"></a>

## 원문 p.42 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                             BE1 · BE2 · AI



 Request Body
 필수 요청 본문

 application/json · object


   필드                                              타입                     설명 · 제약


   type    필수                                      string                 enum: ACTION, REST, EMPATHY


 요청 JSON 예시


     {
         "type": "REST"
     }



 Responses

   상태                                                 설명                                유형


   401                                                게스트 인증 무효                         공통 오류 구조

   403                                                권한/CSRF 오류                        공통 오류 구조

   404                                                리소스 없음 또는 접근 불가                   공통 오류 구조

   409                                                상태 충돌 또는 잠금                       공통 오류 구조

   422                                                입력 검증 실패                          공통 오류 구조

   429                                                호출 제한                             공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가                 공통 오류 구조

   201                                                활동 생성                             정상 응답


 HTTP 201 · 성공 응답

 스키마: object


   필드                                              타입                     설명 · 제약


   data    필수                                      ActivityData           —


   meta    필수                                      ResponseMeta           —


 응답 JSON 예시


     {
         "data": {
            "activity_id": "a_rest",
            "worry_id": "w_091",
            "type": "REST",
            "status": "IN_PROGRESS",
            "duration_seconds": 180,
            "remaining_seconds": 180,
            "can_complete": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




v1.0.0-draft | 2026.11.09                                                                                    42 / 90
```

<a id="pdf-page-43"></a>

## 원문 p.43 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                   BE1 · BE2 · AI




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #27      BE2

   GET     /activities/{activityId}

 활동 상태·시간 복원

    화면 S-10, S-11, S-12      기능 ID ACT-03, REST-03   우선순위 P0



     담당: BE2 | 화면: S-10/11/12 | 기능 ID: ACT-03/REST-03 | 우선순위: P0


     동작·UX 정책: 활동 상태·시간 복원

 인증: guestSession


 파라미터

   이름                                 위치                         타입                         설명


   activityId    필수                   path                       string                     activityId 식별자; 다른 게스트/만
                                                                                            료/삭제는 안전한 404 처리
                                                                                            예: "a_rest"


 Request Body 없음


 Responses

   상태                                            설명                                 유형


   401                                           게스트 인증 무효                          공통 오류 구조

   403                                           권한/CSRF 오류                         공통 오류 구조

   404                                           리소스 없음 또는 접근 불가                    공통 오류 구조

   409                                           상태 충돌 또는 잠금                        공통 오류 구조

   422                                           입력 검증 실패                           공통 오류 구조

   429                                           호출 제한                              공통 오류 구조

   503                                           AI·안전 검증·푸시 사용 불가                  공통 오류 구조

   200                                           요청 처리 성공                           정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                         타입                          설명 · 제약


   data    필수                                 ActivityData                —


   meta    필수                                 ResponseMeta                —


 응답 JSON 예시


     {
         "data": {
           "activity_id": "a_rest",



v1.0.0-draft | 2026.11.09                                                                                          43 / 90
```

<a id="pdf-page-44"></a>

## 원문 p.44 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                        BE1 · BE2 · AI



           "worry_id": "w_091",
           "type": "REST",
           "status": "IN_PROGRESS",
           "duration_seconds": 180,
           "remaining_seconds": 72,
           "ends_at": "2026-11-09T14:03:00Z",
           "can_complete": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #28     BE2

   PATCH     /activities/{activityId}/steps/{stepNumber}

 액션 체크·체크 취소

    화면 S-10      기능 ID ACT-02       우선순위 P0



     담당: BE2 | 화면: S-10 | 기능 ID: ACT-02 | 우선순위: P0


     동작·UX 정책: 액션 체크·체크 취소

 인증: guestSession+csrfToken


 파라미터

   이름                                    위치                  타입                  설명


   activityId     필수                     path                string              activityId 식별자; 다른 게스트/만
                                                                                 료/삭제는 안전한 404 처리
                                                                                 예: "a_rest"

   stepNumber     필수                     path                integer             3단계 중 하나; 순서 자유, 취소 가능
                                                                                 min 1 · max 3



 Request Body
 필수 요청 본문

 application/json · object


   필드                                              타입                  설명 · 제약


   completed    필수                                 boolean             —


 요청 JSON 예시


     {
         "completed": true
     }




v1.0.0-draft | 2026.11.09                                                                               44 / 90
```

<a id="pdf-page-45"></a>

## 원문 p.45 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                    BE1 · BE2 · AI



 Responses

   상태                                                 설명                            유형


   401                                                게스트 인증 무효                     공통 오류 구조

   403                                                권한/CSRF 오류                    공통 오류 구조

   404                                                리소스 없음 또는 접근 불가               공통 오류 구조

   409                                                상태 충돌 또는 잠금                   공통 오류 구조

   422                                                입력 검증 실패                      공통 오류 구조

   429                                                호출 제한                         공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                                요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                              타입                     설명 · 제약


   data    필수                                      ActivityData           —


   meta    필수                                      ResponseMeta           —


 응답 JSON 예시


     {
         "data": {
            "activity_id": "a_action",
            "worry_id": "w_091",
            "type": "ACTION",
            "status": "IN_PROGRESS",
            "steps": [
              {
                 "step_number": 1,
                 "title": "첫 문장 적기",
                 "checked": true
              },
              {
                 "step_number": 2,
                 "title": "읽어보기",
                 "checked": false
              },
              {
                 "step_number": 3,
                 "title": "질문 생각하기",
                 "checked": false
              }
            ],
            "can_complete": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                           45 / 90
```

<a id="pdf-page-46"></a>

## 원문 p.46 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                    BE1 · BE2 · AI




 #29      BE2

   POST     /activities/{activityId}/pause

 액션 중단/휴식 일시정지

    화면 S-10, S-11      기능 ID ACT-03, REST-02    우선순위 P0



     담당: BE2 | 화면: S-10/11 | 기능 ID: ACT-03/REST-02 | 우선순위: P0


     동작·UX 정책: ACTION: STOPPED(체크 유지), REST: PAUSED(잔여 시간 고정). 유형별 처리 다름.

 인증: guestSession+csrfToken


 파라미터

   이름                                 위치                          타입                         설명


   activityId    필수                   path                        string                     activityId 식별자; 다른 게스트/만
                                                                                             료/삭제는 안전한 404 처리
                                                                                             예: "a_rest"


 Request Body 없음


 Responses

   상태                                             설명                                 유형


   401                                            게스트 인증 무효                          공통 오류 구조

   403                                            권한/CSRF 오류                         공통 오류 구조

   404                                            리소스 없음 또는 접근 불가                    공통 오류 구조

   409                                            상태 충돌 또는 잠금                        공통 오류 구조

   422                                            입력 검증 실패                           공통 오류 구조

   429                                            호출 제한                              공통 오류 구조

   503                                            AI·안전 검증·푸시 사용 불가                  공통 오류 구조

   200                                            요청 처리 성공                           정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                          타입                          설명 · 제약


   data    필수                                  ActivityData                —


   meta    필수                                  ResponseMeta                —


 응답 JSON 예시


     {
         "data": {
           "activity_id": "a_rest",
           "worry_id": "w_091",
           "type": "REST",
           "status": "PAUSED",
           "duration_seconds": 180,




v1.0.0-draft | 2026.11.09                                                                                           46 / 90
```

<a id="pdf-page-47"></a>

## 원문 p.47 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                            BE1 · BE2 · AI



           "remaining_seconds": 70,
           "can_complete": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #30     BE2

   POST     /activities/{activityId}/resume

 활동 재개

    화면 S-10, S-11      기능 ID ACT-03, REST-02       우선순위 P0



     담당: BE2 | 화면: S-10/11 | 기능 ID: ACT-03/REST-02 | 우선순위: P0


     동작·UX 정책: 활동 재개

 인증: guestSession+csrfToken


 파라미터

   이름                                    위치                         타입               설명


   activityId     필수                     path                       string           activityId 식별자; 다른 게스트/만
                                                                                     료/삭제는 안전한 404 처리
                                                                                     예: "a_rest"


 Request Body 없음


 Responses

   상태                                               설명                       유형


   401                                              게스트 인증 무효                공통 오류 구조

   403                                              권한/CSRF 오류               공통 오류 구조

   404                                              리소스 없음 또는 접근 불가          공통 오류 구조

   409                                              상태 충돌 또는 잠금              공통 오류 구조

   422                                              입력 검증 실패                 공통 오류 구조

   429                                              호출 제한                    공통 오류 구조

   503                                              AI·안전 검증·푸시 사용 불가        공통 오류 구조

   200                                              요청 처리 성공                 정상 응답


 HTTP 200 · 성공 응답

 스키마: object




v1.0.0-draft | 2026.11.09                                                                                   47 / 90
```

<a id="pdf-page-48"></a>

## 원문 p.48 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                          BE1 · BE2 · AI




   필드                                              타입                      설명 · 제약


   data    필수                                      ActivityData            —


   meta    필수                                      ResponseMeta            —


 응답 JSON 예시


     {
         "data": {
            "activity_id": "a_rest",
            "worry_id": "w_091",
            "type": "REST",
            "status": "IN_PROGRESS",
            "duration_seconds": 180,
            "remaining_seconds": 70,
            "can_complete": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #31      BE2

   POST     /activities/{activityId}/stop

 도움 변경·휴식 그만두기

    화면 S-08, S-11      기능 ID M-05, REST-04         우선순위 P0



     담당: BE2 | 화면: S-08/11 | 기능 ID: M-05/REST-04 | 우선순위: P0


     동작·UX 정책: 도움 변경·휴식 그만두기

 인증: guestSession+csrfToken


 파라미터

   이름                                    위치                       타입                               설명


   activityId     필수                     path                     string                           activityId 식별자; 다른 게스트/만
                                                                                                   료/삭제는 안전한 404 처리
                                                                                                   예: "a_rest"



 Request Body
 필수 요청 본문

 application/json · object


   필드                                              타입                      설명 · 제약


   reason    필수                                    string                  enum: USER_QUIT, HELP_SWITCH


 요청 JSON 예시




v1.0.0-draft | 2026.11.09                                                                                                 48 / 90
```

<a id="pdf-page-49"></a>

## 원문 p.49 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                      BE1 · BE2 · AI




     {
         "reason": "USER_QUIT"
     }



 Responses

   상태                                                 설명                              유형


   401                                                게스트 인증 무효                       공통 오류 구조

   403                                                권한/CSRF 오류                      공통 오류 구조

   404                                                리소스 없음 또는 접근 불가                 공통 오류 구조

   409                                                상태 충돌 또는 잠금                     공통 오류 구조

   422                                                입력 검증 실패                        공통 오류 구조

   429                                                호출 제한                           공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가               공통 오류 구조

   200                                                요청 처리 성공                        정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                              타입                       설명 · 제약


   data    필수                                      ActivityData             —


   meta    필수                                      ResponseMeta             —


 응답 JSON 예시


     {
         "data": {
            "activity_id": "a_rest",
            "worry_id": "w_091",
            "type": "REST",
            "status": "STOPPED",
            "remaining_seconds": 72,
            "can_complete": false
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #32      BE2

   POST     /activities/{activityId}/complete

 명시적 완료 및 S-13 데이터

    화면 S-10, S-11, S-12      기능 ID ACT-04, REST-04, EMP-02        우선순위 P0




v1.0.0-draft | 2026.11.09                                                                             49 / 90
```

<a id="pdf-page-50"></a>

## 원문 p.50 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                       BE1 · BE2 · AI



     담당: BE2 | 화면: S-10/11/12 | 기능 ID: ACT-04/REST-04/EMP-02 | 우선순위: P0


     동작·UX 정책: ACTION은 3단계 완료, REST는 서버 잔여 시간 0초 뒤 버튼, EMPATHY는 읽었어요 선택으로 명시적 완료.

 인증: guestSession+csrfToken


 파라미터

   이름                                위치                            타입                         설명


   activityId    필수                  path                          string                     activityId 식별자; 다른 게스트/만
                                                                                              료/삭제는 안전한 404 처리
                                                                                              예: "a_rest"

   Idempotency-Key    필수             header                        string                     완료 중복 저장 방지
                                                                                              예: "completion-1050901"


 Request Body 없음


 Responses

   상태                                              설명                                 유형


   401                                             게스트 인증 무효                          공통 오류 구조

   403                                             권한/CSRF 오류                         공통 오류 구조

   404                                             리소스 없음 또는 접근 불가                    공통 오류 구조

   409                                             상태 충돌 또는 잠금                        공통 오류 구조

   422                                             입력 검증 실패                           공통 오류 구조

   429                                             호출 제한                              공통 오류 구조

   503                                             AI·안전 검증·푸시 사용 불가                  공통 오류 구조

   200                                             요청 처리 성공                           정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                         타입                            설명 · 제약


   data   필수                                  ActivityData                  —


   meta   필수                                  ResponseMeta                  —


 응답 JSON 예시


     {
         "data": {
            "activity_id": "a_rest",
            "worry_id": "w_091",
            "type": "REST",
            "status": "COMPLETED",
            "remaining_seconds": 0,
            "completion_message": "활동을 마쳤어요.",
            "can_complete": true,
            "can_go_next": true
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"




v1.0.0-draft | 2026.11.09                                                                                               50 / 90
```

<a id="pdf-page-51"></a>

## 원문 p.51 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                       BE1 · BE2 · AI



         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #33     BE2

   PUT       /activities/{activityId}/rating

 선택형 도움 평가

    화면 S-13      기능 ID RESULT-02    우선순위 P0



     담당: BE2 | 화면: S-13 | 기능 ID: RESULT-02 | 우선순위: P0


     동작·UX 정책: 선택형 도움 평가

 인증: guestSession+csrfToken


 파라미터

   이름                                위치                        타입                               설명


   activityId    필수                  path                      string                           activityId 식별자; 다른 게스트/만
                                                                                                료/삭제는 안전한 404 처리
                                                                                                예: "a_rest"



 Request Body
 필수 요청 본문

 application/json · object


   필드                                       타입                          설명 · 제약


   helpfulness    필수                        string                      enum: HELPFUL, UNSURE, NOT_HELPFUL


 요청 JSON 예시


     {
         "helpfulness": "HELPFUL"
     }



 Responses

   상태                                          설명                                     유형


   401                                         게스트 인증 무효                              공통 오류 구조

   403                                         권한/CSRF 오류                             공통 오류 구조

   404                                         리소스 없음 또는 접근 불가                        공통 오류 구조

   409                                         상태 충돌 또는 잠금                            공통 오류 구조

   422                                         입력 검증 실패                               공통 오류 구조

   429                                         호출 제한                                  공통 오류 구조

   503                                         AI·안전 검증·푸시 사용 불가                      공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                              51 / 90
```

<a id="pdf-page-52"></a>

## 원문 p.52 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                          BE1 · BE2 · AI




   상태                                                  설명                    유형


   200                                                 요청 처리 성공              정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                               타입             설명 · 제약


   data    필수                                       RatingData     —


   meta    필수                                       ResponseMeta   —


 응답 JSON 예시


     {
         "data": {
            "activity_id": "a_rest",
            "helpfulness": "HELPFUL",
            "answered_at": "2026-11-09T14:10:00Z"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                 52 / 90
```

<a id="pdf-page-53"></a>

## 원문 p.53 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                    BE1 · BE2 · AI




 06        BE2 · 기록/회고

 FE2 중심 | S-08, S-14



 #34      BE2

   GET     /records

 공개·미삭제 기록 목록

    화면 S-14     기능 ID R-01    우선순위 P0



     담당: BE2 | 화면: S-14 | 기능 ID: R-01 | 우선순위: P0


     동작·UX 정책: 공개·미삭제 기록 목록

 인증: guestSession


 파라미터

   이름                              위치                         타입                          설명


   cursor                          query                      string                      페이지네이션 커서


   limit                           query                      integer                     페이지 크기
                                                                                          기본값: 20 · min 1 · max 100


 Request Body 없음


 Responses

   상태                                         설명                                  유형


   401                                        게스트 인증 무효                           공통 오류 구조

   403                                        권한/CSRF 오류                          공통 오류 구조

   404                                        리소스 없음 또는 접근 불가                     공통 오류 구조

   409                                        상태 충돌 또는 잠금                         공통 오류 구조

   422                                        입력 검증 실패                            공통 오류 구조

   429                                        호출 제한                               공통 오류 구조

   503                                        AI·안전 검증·푸시 사용 불가                   공통 오류 구조

   200                                        요청 처리 성공                            정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                      타입                           설명 · 제약


   data    필수                              RecordList                   —


   meta    필수                              ResponseMeta                 —




v1.0.0-draft | 2026.11.09                                                                                             53 / 90
```

<a id="pdf-page-54"></a>

## 원문 p.54 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                  BE1 · BE2 · AI



 응답 JSON 예시


     {
         "data": {
            "items": [
              {
                "id": "w_091",
                "created_at": "2026-11-07T15:00:00Z",
                "display_summary": "시험 준비에 대한 걱정",
                "distress_before": 3,
                "distress_after": 2,
                "latest_help_type": "ACTION",
                "has_completed_activity": true
              }
            ],
            "next_cursor": null
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #35     BE2

   GET    /records/{worryId}

 기록 상세·최초 열람 처리

    화면 S-14     기능 ID R-02, R-03   우선순위 P0



     담당: BE2 | 화면: S-14 | 기능 ID: R-02/03 | 우선순위: P0


     동작·UX 정책: 기록 상세·최초 열람 처리

 인증: guestSession


 파라미터

   이름                                위치                      타입              설명


   worryId     필수                    path                    string          worryId 식별자; 다른 게스트/만료/
                                                                             삭제는 안전한 404 처리
                                                                             예: "w_091"


 Request Body 없음


 Responses

   상태                                          설명                     유형


   401                                         게스트 인증 무효              공통 오류 구조

   403                                         권한/CSRF 오류             공통 오류 구조

   404                                         리소스 없음 또는 접근 불가        공통 오류 구조

   409                                         상태 충돌 또는 잠금            공통 오류 구조

   422                                         입력 검증 실패               공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                         54 / 90
```

<a id="pdf-page-55"></a>

## 원문 p.55 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                            BE1 · BE2 · AI




   상태                                        설명                                 유형


   429                                       호출 제한                              공통 오류 구조

   503                                       AI·안전 검증·푸시 사용 불가                  공통 오류 구조

   200                                       요청 처리 성공                           정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                     타입                          설명 · 제약


   data    필수                             RecordDetail                —


   meta    필수                             ResponseMeta                —



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #36      BE2

   GET     /reflections/candidate

 24h 경과 회고 대상 최대 1개

    화면 S-08     기능 ID REVIEW-01   우선순위 P0



     담당: BE2 | 화면: S-08 | 기능 ID: REVIEW-01 | 우선순위: P0


     동작·UX 정책: 공개 24시간 경과 + 최초 상세 열람 + 회고 미응답. 후보 최대 1개, 당일 건너뛰기 있으면 null.

 인증: guestSession


 파라미터

   이름                             위치                         타입                         설명


   current_worry_id    필수         query                      string                     현재 걱정 ID. 이 기록은 후보에서 제
                                                                                        외
                                                                                        예: "w_091"


 Request Body 없음


 Responses

   상태                                        설명                                 유형


   401                                       게스트 인증 무효                          공통 오류 구조

   403                                       권한/CSRF 오류                         공통 오류 구조

   404                                       리소스 없음 또는 접근 불가                    공통 오류 구조

   409                                       상태 충돌 또는 잠금                        공통 오류 구조

   422                                       입력 검증 실패                           공통 오류 구조

   429                                       호출 제한                              공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                   55 / 90
```

<a id="pdf-page-56"></a>

## 원문 p.56 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                          BE1 · BE2 · AI




   상태                                                설명                                   유형


   503                                               AI·안전 검증·푸시 사용 불가                    공통 오류 구조

   200                                               후보 없으면 data:null                     정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                             타입                            설명 · 제약


   data    필수                                     allOf [ReflectionCandidate]   —


   meta    필수                                     ResponseMeta                  —


 응답 JSON 예시


     {
         "data": null,
         "meta": {
           "request_id": "req_example",
           "server_now": "2026-11-09T14:01:48Z"
         }
     }



 후보 1개 · 추가 응답 예시


     {
         "data": {
            "worry_id": "w_020",
            "first_available_at": "2026-11-07T23:00:00Z",
            "display_summary": "지난주 걱정"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #37      BE2

   PUT     /reflections/{worryId}

 회고 응답 저장

    화면 S-08      기능 ID REVIEW-02       우선순위 P0



     담당: BE2 | 화면: S-08 | 기능 ID: REVIEW-02 | 우선순위: P0


     동작·UX 정책: 회고 응답 저장

 인증: guestSession+csrfToken




v1.0.0-draft | 2026.11.09                                                                                 56 / 90
```

<a id="pdf-page-57"></a>

## 원문 p.57 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                            BE1 · BE2 · AI



 파라미터

   이름                                    위치                            타입                              설명


   worryId      필수                       path                          string                          worryId 식별자; 다른 게스트/만료/
                                                                                                       삭제는 안전한 404 처리
                                                                                                       예: "w_091"



 Request Body
 필수 요청 본문

 application/json · object


   필드                                               타입                          설명 · 제약


   outcome      필수                                  string                      enum: BETTER, ONGOING, HAPPENED


 요청 JSON 예시


     {
         "outcome": "BETTER"
     }



 Responses

   상태                                                  설명                                    유형


   401                                                 게스트 인증 무효                             공통 오류 구조

   403                                                 권한/CSRF 오류                            공통 오류 구조

   404                                                 리소스 없음 또는 접근 불가                       공통 오류 구조

   409                                                 상태 충돌 또는 잠금                           공통 오류 구조

   422                                                 입력 검증 실패                              공통 오류 구조

   429                                                 호출 제한                                 공통 오류 구조

   503                                                 AI·안전 검증·푸시 사용 불가                     공통 오류 구조

   200                                                 요청 처리 성공                              정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                               타입                          설명 · 제약


   data    필수                                       ReflectionSaved             —


   meta    필수                                       ResponseMeta                —


 응답 JSON 예시


     {
         "data": {
            "worry_id": "w_020",
            "outcome": "BETTER",
            "answered_at": "2026-11-09T14:00:00Z"
         },
         "meta": {
            "request_id": "req_example",




v1.0.0-draft | 2026.11.09                                                                                                   57 / 90
```

<a id="pdf-page-58"></a>

## 원문 p.58 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                             BE1 · BE2 · AI



             "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #38     BE2

   POST       /reflections/skip-today

 현지 날짜 회고 제안 건너뛰기

    화면 S-08        기능 ID REVIEW-03       우선순위 P0



     담당: BE2 | 화면: S-08 | 기능 ID: REVIEW-03 | 우선순위: P0


     동작·UX 정책: 현지 날짜 회고 제안 건너뛰기

 인증: guestSession+csrfToken


 Request Body
 필수 요청 본문

 application/json · object


   필드                                               타입                     설명 · 제약


   timezone      필수                                 string                 예: "Asia/Seoul"


 요청 JSON 예시


     {
         "timezone": "Asia/Seoul"
     }



 Responses

   상태                                                  설명                                    유형


   401                                                 게스트 인증 무효                             공통 오류 구조

   403                                                 권한/CSRF 오류                            공통 오류 구조

   404                                                 리소스 없음 또는 접근 불가                       공통 오류 구조

   409                                                 상태 충돌 또는 잠금                           공통 오류 구조

   422                                                 입력 검증 실패                              공통 오류 구조

   429                                                 호출 제한                                 공통 오류 구조

   503                                                 AI·안전 검증·푸시 사용 불가                     공통 오류 구조

   200                                                 요청 처리 성공                              정상 응답


 HTTP 200 · 성공 응답

 스키마: object




v1.0.0-draft | 2026.11.09                                                                                    58 / 90
```

<a id="pdf-page-59"></a>

## 원문 p.59 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                   BE1 · BE2 · AI




   필드                                              타입                        설명 · 제약


   data    필수                                      ReflectionSkip            —


   meta    필수                                      ResponseMeta              —


 응답 JSON 예시


     {
         "data": {
            "local_date": "2026-11-09",
            "skipped": true
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #39      BE2

   GET     /worries/{worryId}/similar-experience

 관련 과거 경험 최대 1개

    화면 S-08      기능 ID PAST-01, PAST-02         우선순위 P0



     담당: BE2 | 화면: S-08 | 기능 ID: PAST-01/02 | 우선순위: P0


     동작·UX 정책: 같은 게스트의 공개·미삭제·미만료 과거 기록만 후보. 최대 1개. 실제 HELPFUL 평가 시에만 도움이 되었던 표현.

 인증: guestSession


 파라미터

   이름                                    위치                         타입                        설명


   worryId      필수                       path                       string                    worryId 식별자; 다른 게스트/만료/
                                                                                              삭제는 안전한 404 처리
                                                                                              예: "w_091"


 Request Body 없음


 Responses

   상태                                                 설명                               유형


   401                                                게스트 인증 무효                        공통 오류 구조

   403                                                권한/CSRF 오류                       공통 오류 구조

   404                                                리소스 없음 또는 접근 불가                  공통 오류 구조

   409                                                상태 충돌 또는 잠금                      공통 오류 구조

   422                                                입력 검증 실패                         공통 오류 구조

   429                                                호출 제한                            공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                          59 / 90
```

<a id="pdf-page-60"></a>

## 원문 p.60 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                        BE1 · BE2 · AI




   상태                                                설명                                 유형


   503                                               AI·안전 검증·푸시 사용 불가                  공통 오류 구조

   200                                               유사 경험 없으면 data:null                정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                             타입                          설명 · 제약


   data    필수                                     allOf [SimilarExperience]   —


   meta    필수                                     ResponseMeta                —


 응답 JSON 예시


     {
         "data": {
            "record_id": "w_002",
            "display_summary": "지난번 발표 걱정",
            "previous_help_type": "ACTION",
            "helpfulness": "HELPFUL",
            "label": "도움이 되었던 경험"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }



 유사 경험 없음 · 추가 응답 예시


     {
         "data": null,
         "meta": {
           "request_id": "req_example",
           "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                               60 / 90
```

<a id="pdf-page-61"></a>

## 원문 p.61 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                         BE1 · BE2 · AI




 07      BE2 · 삭제/시연

 FE2 및 기획 | S-09, S-15, S-18



 #14     BE2

   DELETE      /worries/{worryId}

 개별 삭제·파쇄(동일 실제 삭제)

    화면 S-07, S-09, S-14     기능 ID H-02, LOCK-02, R-04   우선순위 P0



     담당: BE2 | 화면: S-07/09/14 | 기능 ID: H-02/LOCK-02/R-04 | 우선순위: P0


     동작·UX 정책: 202는 삭제 작업 접수만 의미, COMPLETED 이전에 파쇄 성공 연출 금지. 시작 즉시 조회/추천 차단. SHRED/STANDARD 삭
     제 범위 동일.

 인증: guestSession+csrfToken


 파라미터

   이름                                 위치                          타입                설명


   worryId     필수                     path                        string            worryId 식별자; 다른 게스트/만료/
                                                                                    삭제는 안전한 404 처리
                                                                                    예: "w_091"

   X-Deletion-Intent                  header                      string            분석용 UI 선택값. 삭제 범위는 동일
                                                                                    enum: SHRED, STANDARD


 Request Body 없음


 Responses

   상태                                           설명                          유형


   401                                          게스트 인증 무효                   공통 오류 구조

   403                                          권한/CSRF 오류                  공통 오류 구조

   404                                          리소스 없음 또는 접근 불가             공통 오류 구조

   409                                          상태 충돌 또는 잠금                 공통 오류 구조

   422                                          입력 검증 실패                    공통 오류 구조

   429                                          호출 제한                       공통 오류 구조

   503                                          AI·안전 검증·푸시 사용 불가           공통 오류 구조

   202                                          비동기 삭제 시작; 아직 완료 아님         정상 응답

   204                                          필수 삭제가 모두 끝나 삭제 완료. 내용 없음   정상 응답


 HTTP 202 · 성공 응답

 스키마: object




v1.0.0-draft | 2026.11.09                                                                                61 / 90
```

<a id="pdf-page-62"></a>

## 원문 p.62 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                   BE1 · BE2 · AI




   필드                                              타입                        설명 · 제약


   data    필수                                      DeletionJob               —


   meta    필수                                      ResponseMeta              —


 응답 JSON 예시


     {
         "data": {
            "deletion_job_id": "del_012",
            "status": "RUNNING"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }



 HTTP 204 · 성공 응답



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #40      BE2

   GET     /deletion-jobs/{jobId}

 삭제 완료 확인

    화면 S-09, S-14, S-15      기능 ID D-01      우선순위 P0



     담당: BE2 | 화면: S-09/14/15 | 기능 ID: D-01 | 우선순위: P0


     동작·UX 정책: 삭제 완료 확인

 인증: guestSession


 파라미터

   이름                                    위치                         타입                        설명


   jobId    필수                           path                       string                    jobId 식별자; 다른 게스트/만료/삭
                                                                                              제는 안전한 404 처리
                                                                                              예: "del_012"


 Request Body 없음


 Responses

   상태                                                 설명                               유형


   401                                                게스트 인증 무효                        공통 오류 구조

   403                                                권한/CSRF 오류                       공통 오류 구조

   404                                                리소스 없음 또는 접근 불가                  공통 오류 구조

   409                                                상태 충돌 또는 잠금                      공통 오류 구조

   422                                                입력 검증 실패                         공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                          62 / 90
```

<a id="pdf-page-63"></a>

## 원문 p.63 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                    BE1 · BE2 · AI




   상태                                                 설명                            유형


   429                                                호출 제한                         공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                                요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                              타입                     설명 · 제약


   data    필수                                      DeletionJob            —


   meta    필수                                      ResponseMeta           —


 응답 JSON 예시


     {
         "data": {
            "deletion_job_id": "del_012",
            "status": "COMPLETED"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #41      BE2

   DELETE       /guest-vault

 전체 삭제·인증 종료 연동

    화면 S-15       기능 ID SET-05     우선순위 P0



     담당: BE2 | 화면: S-15 | 기능 ID: SET-05 | 우선순위: P0


     동작·UX 정책: 전체 데이터와 세션 소멸. 삭제 완료 후 BE1이 쿠키 폐기, 실패 시 새 게스트 자동 생성 금지.

 인증: guestSession+csrfToken

 Request Body 없음


 Responses

   상태                                                 설명                            유형


   401                                                게스트 인증 무효                     공통 오류 구조

   403                                                권한/CSRF 오류                    공통 오류 구조

   404                                                리소스 없음 또는 접근 불가               공통 오류 구조

   409                                                상태 충돌 또는 잠금                   공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                           63 / 90
```

<a id="pdf-page-64"></a>

## 원문 p.64 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                     BE1 · BE2 · AI




   상태                                                 설명                             유형


   422                                                입력 검증 실패                       공통 오류 구조

   429                                                호출 제한                          공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가              공통 오류 구조

   202                                                전체 금고 삭제 작업 시작, 즉시 읽기 차단       정상 응답

   204                                                필수 데이터 및 세션 삭제 완료. BE1 쿠키 폐기   정상 응답


 HTTP 202 · 성공 응답

 스키마: object


   필드                                              타입                     설명 · 제약


   data    필수                                      DeletionJob            —


   meta    필수                                      ResponseMeta           —


 응답 JSON 예시


     {
         "data": {
            "deletion_job_id": "del_vault",
            "status": "RUNNING"
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }



 HTTP 204 · 성공 응답



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #42      BE2

   GET     /demo/scenarios

 격리 시연 프리셋 조회

    화면 S-18      기능 ID DEMO-01, DEMO-03            우선순위 P0



     담당: BE2 | 화면: S-18 | 기능 ID: DEMO-01/03 | 우선순위: P0


     동작·UX 정책: 격리 시연 프리셋 조회

 인증: guestSession+demoOperator

 Request Body 없음


 Responses

   상태                                                 설명                             유형


   401                                                게스트 인증 무효                      공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                            64 / 90
```

<a id="pdf-page-65"></a>

## 원문 p.65 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                   BE1 · BE2 · AI




   상태                                                설명                            유형


   403                                               권한/CSRF 오류                    공통 오류 구조

   404                                               리소스 없음 또는 접근 불가               공통 오류 구조

   409                                               상태 충돌 또는 잠금                   공통 오류 구조

   422                                               입력 검증 실패                      공통 오류 구조

   429                                               호출 제한                         공통 오류 구조

   503                                               AI·안전 검증·푸시 사용 불가             공통 오류 구조

   200                                               요청 처리 성공                      정상 응답


 HTTP 200 · 성공 응답

 스키마: object


   필드                                              타입                    설명 · 제약


   data    필수                                      DemoScenarios         —


   meta    필수                                      ResponseMeta          —


 응답 JSON 예시


     {
         "data": {
            "scenarios": [
              {
                "scenario_id": "presentation",
                "title": "발표가 걱정돼요",
                "mode": "DEMO_PRESET"
              }
            ]
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #43      BE2

   POST     /demo/sessions

 격리 시연 세션 생성

    화면 S-18      기능 ID DEMO-01, DEMO-03            우선순위 P0



     담당: BE2 | 화면: S-18 | 기능 ID: DEMO-01/03 | 우선순위: P0


     동작·UX 정책: 격리 시연 세션 생성

 인증: guestSession+csrfToken+demoOperator




v1.0.0-draft | 2026.11.09                                                                          65 / 90
```

<a id="pdf-page-66"></a>

## 원문 p.66 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                           BE1 · BE2 · AI



 Request Body
 필수 요청 본문

 application/json · object


   필드                                            타입                        설명 · 제약


   scenario_id     필수                            string                    예: "presentation"


 요청 JSON 예시


     {
         "scenario_id": "presentation"
     }



 Responses

   상태                                                  설명                                  유형


   401                                                 게스트 인증 무효                           공통 오류 구조

   403                                                 권한/CSRF 오류                          공통 오류 구조

   404                                                 리소스 없음 또는 접근 불가                     공통 오류 구조

   409                                                 상태 충돌 또는 잠금                         공통 오류 구조

   422                                                 입력 검증 실패                            공통 오류 구조

   429                                                 호출 제한                               공통 오류 구조

   503                                                 AI·안전 검증·푸시 사용 불가                   공통 오류 구조

   201                                                 시연 격리 세션 생성                         정상 응답


 HTTP 201 · 성공 응답

 스키마: object


   필드                                            타입                        설명 · 제약


   data    필수                                    DemoSession               —


   meta    필수                                    ResponseMeta              —


 응답 JSON 예시


     {
         "data": {
            "demo_id": "d_1",
            "simulated_now": "2026-11-09T14:00:00Z",
            "unlocked_demo_worry_ids": [],
            "mode": "DEMO_PRESET",
            "notice": "시연용 가상 데이터입니다."
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                                  66 / 90
```

<a id="pdf-page-67"></a>

## 원문 p.67 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                                  BE1 · BE2 · AI




 #44     BE2

   POST     /demo/sessions/{demoId}/advance

 시연 시간만 이동

    화면 S-18       기능 ID DEMO-02      우선순위 P0



     담당: BE2 | 화면: S-18 | 기능 ID: DEMO-02 | 우선순위: P0


     동작·UX 정책: 시연 시간만 이동

 인증: guestSession+csrfToken+demoOperator


 파라미터

   이름                                   위치                              타입                                   설명


   demoId    필수                         path                            string                               demoId 식별자; 다른 게스트/만료/
                                                                                                             삭제는 안전한 404 처리
                                                                                                             예: "d_1"



 Request Body
 필수 요청 본문

 application/json · object


   필드                                              타입                            설명 · 제약


   simulated_now     필수                            string (date-time)            예: "2026-11-10T23:00:00Z"


 요청 JSON 예시


     {
         "simulated_now": "2026-11-10T23:00:00Z"
     }



 Responses

   상태                                                 설명                                       유형


   401                                                게스트 인증 무효                                공통 오류 구조

   403                                                권한/CSRF 오류                               공통 오류 구조

   404                                                리소스 없음 또는 접근 불가                          공통 오류 구조

   409                                                상태 충돌 또는 잠금                              공통 오류 구조

   422                                                입력 검증 실패                                 공통 오류 구조

   429                                                호출 제한                                    공통 오류 구조

   503                                                AI·안전 검증·푸시 사용 불가                        공통 오류 구조

   200                                                요청 처리 성공                                 정상 응답


 HTTP 200 · 성공 응답

 스키마: object




v1.0.0-draft | 2026.11.09                                                                                                         67 / 90
```

<a id="pdf-page-68"></a>

## 원문 p.68 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                    BE1 · BE2 · AI




   필드                                            타입                           설명 · 제약


   data    필수                                    DemoSession                  —


   meta    필수                                    ResponseMeta                 —


 응답 JSON 예시


     {
         "data": {
            "demo_id": "d_1",
            "simulated_now": "2026-11-10T23:00:00Z",
            "unlocked_demo_worry_ids": [
              "demo_w_1"
            ],
            "mode": "DEMO_PRESET",
            "notice": "시연용 가상 데이터입니다."
         },
         "meta": {
            "request_id": "req_example",
            "server_now": "2026-11-09T14:01:48Z"
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #45      BE2

   DELETE       /demo/sessions/{demoId}

 시연 데이터만 초기화

    화면 S-18       기능 ID DEMO-03       우선순위 P0



     담당: BE2 | 화면: S-18 | 기능 ID: DEMO-03 | 우선순위: P0


     동작·UX 정책: 시연 데이터만 초기화

 인증: guestSession+csrfToken+demoOperator


 파라미터

   이름                                    위치                          타입                        설명


   demoId    필수                          path                        string                    demoId 식별자; 다른 게스트/만료/
                                                                                               삭제는 안전한 404 처리
                                                                                               예: "d_1"


 Request Body 없음


 Responses

   상태                                                  설명                               유형


   401                                                 게스트 인증 무효                        공통 오류 구조

   403                                                 권한/CSRF 오류                       공통 오류 구조

   404                                                 리소스 없음 또는 접근 불가                  공통 오류 구조

   409                                                 상태 충돌 또는 잠금                      공통 오류 구조




v1.0.0-draft | 2026.11.09                                                                                           68 / 90
```

<a id="pdf-page-69"></a>

## 원문 p.69 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                   BE1 · BE2 · AI




   상태                                   설명                         유형


   422                                  입력 검증 실패                   공통 오류 구조

   429                                  호출 제한                      공통 오류 구조

   503                                  AI·안전 검증·푸시 사용 불가          공통 오류 구조

   204                                  격리 시연 세션 삭제; 실제 금고 영향 없음   정상 응답


 HTTP 204 · 성공 응답



 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                          69 / 90
```

<a id="pdf-page-70"></a>

## 원문 p.70 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                   BE1 · BE2 · AI




 08        AI · 내부 API

 BE1/BE2 서버 전용 | Upstage Solar 또는 Self-hosted adapter



 #47     AI

   POST       /internal/ai/v1/analyze

 분석·안전 관련 구조화 출력

    화면 서버          기능 ID AI-02, C-01   우선순위 P0



     담당: AI | 화면: 서버 | 기능 ID: AI-02/C-01 | 우선순위: P0


     동작·UX 정책: BE1 워커 내부 호출. 외부 Solar / 자체 LoRA·QLoRA 모델 모두 동일한 AIAnalyzeResult. 구조/안전 검증 실패 시 정상 봉인
     금지. 모델 비밀키 FE 노출 금지.

 인증: internalBearer


 Request Body
 필수 요청 본문

 application/json · AIAnalyzeRequest


   필드                                        타입           설명 · 제약


   analysis_request_id      필수               string       예: "ar_101"


   input      필수                             AIInput      —


   policy     필수                             AIPolicy     —


   context                                   object       —


 요청 JSON 예시


     {
         "analysis_request_id": "ar_101",
         "input": {
            "worry_text": "내일 발표에서 실수할까 봐 걱정돼요.",
            "tomorrow_note": "첫 장 확인",
            "language": "ko"
         },
         "policy": {
            "max_action_steps": 3,
            "allowed_helps": [
              "SHRED",
              "ACTION",
              "REST",
              "EMPATHY"
            ],
            "prompt_version": "wv-2026-11-v1",
            "schema_version": "1.0"
         },
         "context": {
            "past_worries": []
         }
     }




v1.0.0-draft | 2026.11.09                                                                          70 / 90
```

<a id="pdf-page-71"></a>

## 원문 p.71 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                           BE1 · BE2 · AI



 Responses

   상태                                      설명                              유형


   200                                     서버용 정규화 결과. SAFE 이외에는 콘텐츠 무시    정상 응답
                                           하고 위기/안전 실패로 분기

   401                                     내부 인증 실패                        공통 오류 구조

   422                                     입력/스키마 검증 오류                    공통 오류 구조

   429                                     모델 호출 제한                        공통 오류 구조

   503                                     모델 장애·위기 검증 실패 (정상 결과로 대체 금지)   공통 오류 구조


 HTTP 200 · 성공 응답

 스키마: AIAnalyzeResult

 응답 JSON 예시


     {
         "schema_version": "1.0",
         "safety": {
            "decision": "SAFE",
            "reason_code": "NONE"
         },
         "content": {
            "summary": "발표에서 실수할 수 있다는 걱정",
            "recommended_help": "ACTION",
            "recommendation_reason": "작게 준비를 시작할 수 있는 부분이 있어요.",
            "action_steps": [
              "발표 첫 장 키워드 3개 적기",
              "첫 문장 1번 읽기",
              "질문 하나 예상해보기"
            ],
            "rest_guidance": "잠시 자리에서 쉬어가도 괜찮아요.",
            "empathy_message": "발표가 중요한 만큼 여러 생각이 떠오를 수 있겠어요."
         },
         "model_info": {
            "provider": "upstage",
            "model": "solar-mini4",
            "prompt_version": "wv-2026-11-v1",
            "latency_ms": 1684
         }
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #48     AI

   POST       /internal/ai/v1/similarity

 과거 경험 의미 유사도

    화면 서버        기능 ID PAST-01   우선순위 P0



     담당: AI | 화면: 서버 | 기능 ID: PAST-01 | 우선순위: P0


     동작·UX 정책: BE2에서 공개·본인·미삭제 후보를 먼저 거른 후 AI에 전송; 임계값 실측 확정. 후보 최대 1개.

 인증: internalBearer




v1.0.0-draft | 2026.11.09                                                                  71 / 90
```

<a id="pdf-page-72"></a>

## 원문 p.72 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                   BE1 · BE2 · AI



 Request Body
 필수 요청 본문

 application/json · SimilarityRequest


   필드                                        타입                     설명 · 제약


   query    필수                               object                 —


   candidates    필수                          array<object>          —


   top_k    필수                               integer                기본값: 1 · min 1 · max 1


 요청 JSON 예시


     {
         "query": {
            "worry_id": "w_101",
            "text": "발표에서 실수할까 봐 걱정"
         },
         "candidates": [
            {
              "worry_id": "w_002",
              "text": "지난번 발표가 걱정됐어",
              "helpfulness": "HELPFUL"
            },
            {
              "worry_id": "w_007",
              "text": "시험 준비가 부족한 것 같아",
              "helpfulness": "UNSURE"
            }
         ],
         "top_k": 1
     }



 Responses

   상태                                           설명                                 유형


   200                                          본인 공개 기록 후보 중 최대 1개 유사 경험          정상 응답

   401                                          내부 인증 실패                           공통 오류 구조

   422                                          검증 오류                              공통 오류 구조


 HTTP 200 · 성공 응답

 스키마: SimilarityResult

 응답 JSON 예시


     {
         "matches": [
            {
              "worry_id": "w_002",
              "score": 0.82
            }
         ],
         "strategy": "embedding_cosine_v1"
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                          72 / 90
```

<a id="pdf-page-73"></a>

## 원문 p.73 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                BE1 · BE2 · AI




 #49      AI

   POST        /internal/ai/v1/ocr

 OCR 어댑터

    화면 서버         기능 ID OPTIONAL    우선순위 P1



     담당: AI | 화면: 서버 | 기능 ID: OPTIONAL | 우선순위: P1


     동작·UX 정책: 선택(P1), 사용자 캡처에서 텍스트 추출 후 FE가 검토·수정. 자동 걱정 제출 금지.

 인증: internalBearer


 Request Body
 필수 요청 본문

 multipart/form-data · object


   필드                                         타입                    설명 · 제약


   file    필수                                 string (binary)       —



 Responses

   상태                                            설명                             유형


   200                                           추출 문자열. FE1 사용자가 검토하기 전까지 등록   정상 응답
                                                 금지

   401                                           내부 인증 실패                       공통 오류 구조

   422                                           이미지 제한 / 검증 실패                 공통 오류 구조

   503                                           OCR 공급자 장애                     공통 오류 구조


 HTTP 200 · 성공 응답

 스키마: OCRResult

 응답 JSON 예시


     {
         "extracted_text": "문자 인식 결과",
         "requires_user_review": true
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




 #50      AI

   GET     /internal/ai/v1/health

 AI 프로바이더 상태(외부 비공개)

    화면 서버         기능 ID COM-01     우선순위 P0




v1.0.0-draft | 2026.11.09                                                                       73 / 90
```

<a id="pdf-page-74"></a>

## 원문 p.74 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                          BE1 · BE2 · AI



     담당: AI | 화면: 서버 | 기능 ID: COM-01 | 우선순위: P0


     동작·UX 정책: AI 프로바이더 상태(외부 비공개)

 인증: internalBearer

 Request Body 없음


 Responses

   상태                                           설명                        유형


   200                                          모델 공급자 연결 상태. 외부/FE 비공개   정상 응답

   503                                          AI 서비스 사용 불가              공통 오류 구조


 HTTP 200 · 성공 응답

 스키마: AIHealth

 응답 JSON 예시


     {
         "status": "HEALTHY",
         "provider": "upstage",
         "model": "solar-mini4",
         "schema_version": "1.0",
         "checked_at": "2026-11-09T14:00:00Z"
     }




 공통 오류: 오류 코드 및 ErrorEnvelope · 데이터 모델: Schema 사전 · 색인으로




v1.0.0-draft | 2026.11.09                                                                 74 / 90
```

<a id="pdf-page-75"></a>

## 원문 p.75 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                        BE1 · BE2 · AI




 04. 공통 오류 · 상태 코드

   HTTP                            기본 의미                           응답 계약


   400                             잘못된 요청                          ErrorEnvelope

   401                             게스트 인증 무효                       ErrorEnvelope

   403                             권한/CSRF 오류                      ErrorEnvelope

   404                             리소스 없음 또는 접근 불가                 ErrorEnvelope

   409                             상태 충돌 또는 잠금                     ErrorEnvelope

   422                             입력 검증 실패                        ErrorEnvelope

   429                             호출 제한                           ErrorEnvelope

   503                             AI·안전 검증·푸시 사용 불가               ErrorEnvelope



 오류 응답도 가능하면 일관된 ErrorEnvelope 형태를 사용합니다. API별 실제 발생 가능한 코드는 각 엔드포인트 응답 목록을 우선으로 확
 인하세요.


 예시 스키마

   필드                           타입                     설명 · 제약


   error   필수                   ErrorDetail            —


   meta    필수                   ResponseMeta           —


 원본 Swagger의 공통 오류 Response 정의를 참고. 위기·삭제 등 도메인 오류 메시지는 별도 정책 승인 대상입니다.




v1.0.0-draft | 2026.11.09                                                               75 / 90
```

<a id="pdf-page-76"></a>

## 원문 p.76 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                        BE1 · BE2 · AI




 05. Schema 사전
 OpenAPI의 components.schemas 정의 57개를 나열합니다. 중첩 객체의 타입을 선택하면 참조 Schema로 이동할 수 있습니다. enum 및
 최대 길이 등의 제약은 원본 YAML에 정의된 범위를 그대로 반영합니다.


 01   ResponseMeta

 유형: object · 필수 필드 1개


   필드                          타입                   설명 · 제약


   request_id        필수        string               예: "req_101"


   server_now                  string (date-time)   예: "2026-11-10T23:00:00Z"



 02   ErrorDetail

 유형: object · 필수 필드 3개


   필드                          타입                   설명 · 제약


   code    필수                  string               예: "WORRY_LOCKED"


   message      필수             string               예: "아직 공개 시간이 되지 않았어요."


   retryable     필수            boolean              예: false


   details                     object               —


   field_errors                object               —



 03   ErrorEnvelope

 유형: object · 필수 필드 2개


   필드                          타입                   설명 · 제약


   error    필수                 ErrorDetail          —


   meta    필수                  ResponseMeta         —



 04   GuestData

 유형: object · 필수 필드 2개


   필드                          타입                   설명 · 제약


   authenticated          필수   boolean              예: true


   reason                      string               세션 상태, 신규 접속은 NO_SESSION
                                                    enum: NO_SESSION, ACTIVE

   guest_id                    string               예: "g_02e"


   csrf_token        필수        string               예: "csrf_masked"


   expires_at                  string (date-time)   예: "2026-11-10T23:00:00Z"


   timezone                    string               예: "Asia/Seoul"




v1.0.0-draft | 2026.11.09                                                               76 / 90
```

<a id="pdf-page-77"></a>

## 원문 p.77 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                                  BE1 · BE2 · AI



 05   Settings

 유형: object · 필수 필드 3개


   필드                                 타입                   설명 · 제약


   timezone    필수                     string               예: "Asia/Seoul"


   default_release_local_time    필수   string               pattern: ^([01]\d|2[0-3]):[0-5]\d$ · 예: "08:00"


   public_notifications_opt_in   필수   boolean              기본값: False



 06   VaultCounts

 유형: object · 필수 필드 3개


   필드                                 타입                   설명 · 제약


   locked_count     필수                integer              min 0 · 예: 2


   available_count       필수           integer              min 0 · 예: 1


   next_release_at       필수           string (date-time)   예: "2026-11-10T23:00:00Z"



 07   AnalysisCard

 유형: object · 필수 필드 2개


   필드                                 타입                   설명 · 제약


   request_id    필수                   string               예: "ar_101"


   status   필수                        string               enum: ACCEPTED, PROCESSING, SUCCEEDED, FAILED, CRISIS


   created_at                         string (date-time)   예: "2026-11-10T23:00:00Z"


   dismissible                        boolean              —



 08   LatestActivity

 유형: object · 필수 필드 4개


   필드                                 타입                   설명 · 제약


   activity_id      필수                string               예: "a_11"


   worry_id    필수                     string               예: "w_091"


   type   필수                          string               걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                           enum: SHRED, ACTION, REST, EMPATHY

   status   필수                        string               enum: IN_PROGRESS, PAUSED, STOPPED,
                                                           READY_TO_COMPLETE, COMPLETED

   progress_summary                   string               예: "1/3"



 09   Reminder

 유형: object · 필수 필드 1개




v1.0.0-draft | 2026.11.09                                                                                         77 / 90
```

<a id="pdf-page-78"></a>

## 원문 p.78 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                      BE1 · BE2 · AI




   필드                           타입                       설명 · 제약


   reminder_id                  string                   예: "r_01"


   worry_id                     string                   예: "w_091"


   scheduled_at       필수        string (date-time)       예: "2026-11-10T23:00:00Z"


   replaces_previous            boolean                  —



 10   HomeData

 민감 원문·메모·요약·불안도는 홈 응답 금지

 유형: object · 필수 필드 5개


   필드                           타입                       설명 · 제약


   vault    필수                  VaultCounts              —


   requests      필수             array<AnalysisCard>      —


   latest_activity         필수   allOf [LatestActivity]   —


   reminder      필수             allOf [Reminder]         —


   has_any_record          필수   boolean                  —



 11   WorrySubmissionInput

 유형: object · 필수 필드 3개


   필드                           타입                       설명 · 제약


   worry_text     필수            string                   최소 1자 · 최대 500자 · 예: "내일 발표에서 실수할까 봐 걱정돼요."


   distress_level          필수   integer                  min 1 · max 5 · 예: 4


   tomorrow_note                string                   최대 100자 · 예: "첫 장만 다시 확인하기"


   release_at     필수            string (date-time)       예: "2026-11-10T23:00:00Z"


   public_notify                boolean                  기본값: False


   client_started_at            string (date-time)       예: "2026-11-10T23:00:00Z"



 12   SubmissionAccepted

 유형: object · 필수 필드 4개


   필드                           타입                       설명 · 제약


   request_id     필수            string                   예: "ar_101"


   status   필수                  string                   enum: ACCEPTED, PROCESSING


   accepted_at        필수        string (date-time)       예: "2026-11-10T23:00:00Z"


   status_url     필수            string                   예: "/api/v1/analysis-requests/ar_101"




v1.0.0-draft | 2026.11.09                                                                             78 / 90
```

<a id="pdf-page-79"></a>

## 원문 p.79 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                       BE1 · BE2 · AI



 13     AnalysisRequestStatus

 유형: object · 필수 필드 2개


   필드                           타입                   설명 · 제약


   request_id     필수            string               예: "ar_101"


   status    필수                 string               enum: ACCEPTED, PROCESSING, SUCCEEDED, FAILED, CRISIS


   worry_id                     string               예: "w_091"


   display_state                string               enum: LOCKED, AVAILABLE


   release_at                   string (date-time)   예: "2026-11-10T23:00:00Z"


   retryable                    boolean              —


   reason_code                  string               —


   guidance_available           boolean              기본값: False



 14     WorryLockedCard

 잠김 카드: 원문/요약/불안도 필드 자체를 반환하지 않음

 유형: object · 필수 필드 4개


   필드                           타입                   설명 · 제약


   id   필수                      string               예: "w_091"


   created_at     필수            string (date-time)   예: "2026-11-10T23:00:00Z"


   release_at     필수            string (date-time)   예: "2026-11-10T23:00:00Z"


   status    필수                 string               enum: LOCKED



 15     WorryAvailableCard

 공개 가능 항목에서만 직렬화

 유형: object · 필수 필드 5개


   필드                           타입                   설명 · 제약


   id   필수                      string               예: "w_091"


   created_at     필수            string (date-time)   예: "2026-11-10T23:00:00Z"


   release_at     필수            string (date-time)   예: "2026-11-10T23:00:00Z"


   status    필수                 string               enum: AVAILABLE


   display_summary     필수       string               예: "시험 준비에 대한 걱정"


   distress_before              integer              min 1 · max 5


   is_unviewed                  boolean              —


   first_available_at           string (date-time)   예: "2026-11-10T23:00:00Z"




v1.0.0-draft | 2026.11.09                                                                              79 / 90
```

<a id="pdf-page-80"></a>

## 원문 p.80 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                           BE1 · BE2 · AI



 16     VaultList

 유형: object · 필수 필드 3개


   필드                         타입                          설명 · 제약


   locked    필수               array<WorryLockedCard>      —


   available      필수          array<WorryAvailableCard>   —


   next_cursor     필수         string                      —



 17     LockedMeta

 유형: object · 필수 필드 3개


   필드                         타입                          설명 · 제약


   id   필수                    string                      예: "w_091"


   status    필수               string                      enum: LOCKED


   created_at                 string (date-time)          예: "2026-11-10T23:00:00Z"


   release_at      필수         string (date-time)          예: "2026-11-10T23:00:00Z"


   can_change_release         boolean                     —


   can_delete                 boolean                     —



 18     ReleaseChanged

 유형: object · 필수 필드 3개


   필드                         타입                          설명 · 제약


   id   필수                    string                      예: "w_091"


   release_at      필수         string (date-time)          예: "2026-11-10T23:00:00Z"


   version    필수              integer                     min 1



 19     ActionStep

 유형: object · 필수 필드 2개


   필드                         타입                          설명 · 제약


   step_number     필수         integer                     min 1 · max 3


   title     필수               string                      예: "시험 범위 확인"


   checked                    boolean                     기본값: False



 20     AiDisplayedContent

 유형: object · 필수 필드 7개


   필드                         타입                          설명 · 제약


   original_summary     필수    string                      최대 500자




v1.0.0-draft | 2026.11.09                                                                  80 / 90
```

<a id="pdf-page-81"></a>

## 원문 p.81 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                     BE1 · BE2 · AI




   필드                                 타입                   설명 · 제약


   display_summary       필수           string               최대 500자


   recommended_help         필수        string               걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                           enum: SHRED, ACTION, REST, EMPATHY

   recommendation_reason         필수   string               —


   action_steps     필수                array<ActionStep>    —


   rest_guidance       필수             string               —


   empathy_message       필수           string               —



 21     WorryDetail

 유형: object · 필수 필드 6개


   필드                                 타입                   설명 · 제약


   id   필수                            string               예: "w_091"


   status    필수                       string               enum: AVAILABLE


   created_at                         string (date-time)   예: "2026-11-10T23:00:00Z"


   release_at                         string (date-time)   예: "2026-11-10T23:00:00Z"


   first_available_at                 string (date-time)   예: "2026-11-10T23:00:00Z"


   first_viewed_at                    string (date-time)   예: "2026-11-10T23:00:00Z"


   worry_text     필수                  string               최대 500자 · 예: "내일 시험 준비가 부족한 것 같아."


   tomorrow_note                      string               최대 100자


   distress_before       필수           integer              min 1 · max 5


   distress_after                     integer              min 1 · max 5


   ai_content     필수                  AiDisplayedContent   —


   allowed_help     필수                array<string>        —



 22     PushKeys

 유형: object · 필수 필드 2개


   필드                                 타입                   설명 · 제약


   p256dh    필수                       string               —


   auth   필수                          string               —



 23     PushSubscriptionInput

 유형: object · 필수 필드 3개


   필드                                 타입                   설명 · 제약


   endpoint    필수                     string (uri)         예: "https://push.example/sub"




v1.0.0-draft | 2026.11.09                                                                            81 / 90
```

<a id="pdf-page-82"></a>

## 원문 p.82 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                      BE1 · BE2 · AI




   필드                             타입                   설명 · 제약


   keys   필수                      PushKeys             —


   client_permission        필수    string               enum: granted, denied, default



 24   NotificationStatus

 유형: object · 필수 필드 2개


   필드                             타입                   설명 · 제약


   opt_in   필수                    boolean              —


   browser_permission_reported    string               enum: granted, denied, default, unknown


   subscribed    필수               boolean              —


   public_jobs_pending            integer              min 0


   active_reminder                allOf [Reminder]     —



 25   HelpSelectionInput

 유형: object · 필수 필드 1개


   필드                             타입                   설명 · 제약


   help_type     필수               string               걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                       enum: SHRED, ACTION, REST, EMPATHY

   confirm_switch                 boolean              기본값: False


   expected_active_activity_id    string               —



 26   HelpSelectionData

 유형: object · 필수 필드 2개


   필드                             타입                   설명 · 제약


   worry_id    필수                 string               예: "w_091"


   help_type     필수               string               걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                       enum: SHRED, ACTION, REST, EMPATHY

   selected_at                    string (date-time)   예: "2026-11-10T23:00:00Z"


   stopped_previous_activity      boolean              —


   requires_delete_confirmation   boolean              —



 27   ActivityData

 유형: object · 필수 필드 4개


   필드                             타입                   설명 · 제약


   activity_id      필수            string               예: "a_rest"


   worry_id    필수                 string               예: "w_091"




v1.0.0-draft | 2026.11.09                                                                             82 / 90
```

<a id="pdf-page-83"></a>

## 원문 p.83 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                 BE1 · BE2 · AI




   필드                            타입                   설명 · 제약


   type    필수                    string               enum: ACTION, REST, EMPATHY


   status    필수                  string               enum: IN_PROGRESS, PAUSED, STOPPED,
                                                      READY_TO_COMPLETE, COMPLETED

   duration_seconds              integer              min 0 · 예: 180


   remaining_seconds             integer              min 0 · 예: 72


   ends_at                       string (date-time)   예: "2026-11-10T23:00:00Z"


   paused_at                     string (date-time)   예: "2026-11-10T23:00:00Z"


   steps                         array<ActionStep>    —


   can_complete                  boolean              —


   completion_message            string               —


   can_go_next                   boolean              기본값: False



 28     RecordCard

 유형: object · 필수 필드 4개


   필드                            타입                   설명 · 제약


   id   필수                       string               예: "w_091"


   created_at      필수            string (date-time)   예: "2026-11-10T23:00:00Z"


   display_summary          필수   string               —


   distress_before          필수   integer              min 1 · max 5


   distress_after                integer              min 1 · max 5


   latest_help_type              string               걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                      enum: SHRED, ACTION, REST, EMPATHY

   has_completed_activity        boolean              —



 29     RecordList

 유형: object · 필수 필드 2개


   필드                            타입                   설명 · 제약


   items     필수                  array<RecordCard>    —


   next_cursor         필수        string               —



 30     ReflectionCandidate

 유형: object · 필수 필드 3개


   필드                            타입                   설명 · 제약


   worry_id       필수             string               예: "w_091"




v1.0.0-draft | 2026.11.09                                                                        83 / 90
```

<a id="pdf-page-84"></a>

## 원문 p.84 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                       BE1 · BE2 · AI




   필드                             타입                   설명 · 제약


   first_available_at        필수   string (date-time)   예: "2026-11-10T23:00:00Z"


   display_summary      필수        string               —



 31   SimilarExperience

 유형: object · 필수 필드 2개


   필드                             타입                   설명 · 제약


   record_id      필수              string               예: "w_091"


   display_summary      필수        string               —


   previous_help_type             string               걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                       enum: SHRED, ACTION, REST, EMPATHY

   helpfulness                    string               enum: HELPFUL, UNSURE, NOT_HELPFUL


   label                          string               예: "도움이 되었던 경험"



 32   DeletionJob

 유형: object · 필수 필드 2개


   필드                             타입                   설명 · 제약


   deletion_job_id      필수        string               예: "del_012"


   status    필수                   string               enum: PENDING, RUNNING, COMPLETED, FAILED_RETRYABLE



 33   CrisisGuidance

 유형: object · 필수 필드 3개


   필드                             타입                   설명 · 제약


   guidance_version         필수    string               예: "crisis-v1"


   message      필수                string               위기 정책 승인 전 최종 문구 미정


   resources      필수              array<object>        —


   can_copy_phone                 boolean              —



 34   DemoSession

 유형: object · 필수 필드 4개


   필드                             타입                   설명 · 제약


   demo_id      필수                string               예: "d_1"


   simulated_now       필수         string (date-time)   예: "2026-11-10T23:00:00Z"


   unlocked_demo_worry_ids        array<string>        —


   mode    필수                     string               enum: DEMO_PRESET




v1.0.0-draft | 2026.11.09                                                                              84 / 90
```

<a id="pdf-page-85"></a>

## 원문 p.85 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                         BE1 · BE2 · AI




   필드                                 타입              설명 · 제약


   notice    필수                       string          예: "시연용 가상 데이터입니다."



 35   AIInput

 유형: object · 필수 필드 2개


   필드                                 타입              설명 · 제약


   worry_text     필수                  string          최대 500자


   tomorrow_note                      string          최대 100자


   language      필수                   string          기본값: ko



 36   AIPolicy

 유형: object · 필수 필드 4개


   필드                                 타입              설명 · 제약


   max_action_steps         필수        integer         enum: 3 · 예: 3


   allowed_helps       필수             array<string>   —


   prompt_version          필수         string          예: "wv-2026-11-v1"


   schema_version          필수         string          예: "1.0"



 37   AIAnalyzeRequest

 유형: object · 필수 필드 3개


   필드                                 타입              설명 · 제약


   analysis_request_id           필수   string          예: "ar_101"


   input    필수                        AIInput         —


   policy    필수                       AIPolicy        —


   context                            object          —



 38   AISafety

 유형: object · 필수 필드 2개


   필드                                 타입              설명 · 제약


   decision      필수                   string          enum: SAFE, CRISIS, UNKNOWN


   reason_code        필수              string          예: "NONE"



 39   AIContent

 유형: object · 필수 필드 6개




v1.0.0-draft | 2026.11.09                                                                85 / 90
```

<a id="pdf-page-86"></a>

## 원문 p.86 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                  BE1 · BE2 · AI




   필드                                  타입               설명 · 제약


   summary    필수                       string           최대 500자 · 예: "발표에서 실수할 수 있다는 걱정"


   recommended_help          필수        string           걱정 파쇄 / 10분 액션 / 짧은 휴식 / 그냥 들어줘
                                                        enum: SHRED, ACTION, REST, EMPATHY

   recommendation_reason          필수   string           —


   action_steps       필수               array<string>    —


   rest_guidance        필수             string           —


   empathy_message         필수          string           —



 40   AIModelInfo

 유형: object · 필수 필드 3개


   필드                                  타입               설명 · 제약


   provider      필수                    string           enum: upstage, self_hosted, mock


   model    필수                         string           예: "solar-mini4"


   prompt_version       필수             string           예: "wv-2026-11-v1"


   latency_ms                          integer          min 0



 41   AIAnalyzeResult

 Upstage/API 또는 self-hosted 모델 응답을 정규화하는 공통 내부 DTO. safety != SAFE이면 content 무시

 유형: object · 필수 필드 4개


   필드                                  타입               설명 · 제약


   schema_version       필수             string           예: "1.0"


   safety    필수                        AISafety         —


   content    필수                       AIContent        —


   model_info      필수                  AIModelInfo      —



 42   SimilarityRequest

 유형: object · 필수 필드 3개


   필드                                  타입               설명 · 제약


   query    필수                         object           —


   candidates      필수                  array<object>    —


   top_k    필수                         integer          기본값: 1 · min 1 · max 1



 43   SimilarityResult

 유형: object · 필수 필드 2개




v1.0.0-draft | 2026.11.09                                                                         86 / 90
```

<a id="pdf-page-87"></a>

## 원문 p.87 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                      BE1 · BE2 · AI




   필드                             타입                   설명 · 제약


   matches    필수                  array<object>        —


   strategy    필수                 string               예: "embedding_cosine_v1"



 44   OCRResult

 유형: object · 필수 필드 2개


   필드                             타입                   설명 · 제약


   extracted_text       필수        string               —


   requires_user_review      필수   boolean              기본값: True



 45   AIHealth

 유형: object · 필수 필드 3개


   필드                             타입                   설명 · 제약


   status    필수                   string               enum: HEALTHY, DEGRADED, UNAVAILABLE


   provider    필수                 string               enum: upstage, self_hosted, mock


   model                          string               —


   schema_version                 string               —


   checked_at      필수             string (date-time)   예: "2026-11-10T23:00:00Z"



 46   AIRuntimeError

 유형: object · 필수 필드 2개


   필드                             타입                   설명 · 제약


   error_code      필수             string               enum: PROVIDER_TIMEOUT, SCHEMA_INVALID,
                                                       SAFETY_UNAVAILABLE, MODEL_RATE_LIMITED

   retryable      필수              boolean              —



 47   DismissData

 유형: object · 필수 필드 2개


   필드                             타입                   설명 · 제약


   request_id      필수             string               예: "ar_101"


   dismissed      필수              boolean              예: true



 48   EmpathyData

 유형: object · 필수 필드 2개




v1.0.0-draft | 2026.11.09                                                                             87 / 90
```

<a id="pdf-page-88"></a>

## 원문 p.88 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                       BE1 · BE2 · AI




   필드                            타입                   설명 · 제약


   worry_id   필수                 string               예: "w_091"


   empathy_message    필수         string               —



 49   PushSubscriptionData

 유형: object · 필수 필드 2개


   필드                            타입                   설명 · 제약


   subscription_id    필수         string               예: "push_01"


   subscribed   필수               boolean              —


   created_at                    string (date-time)   예: "2026-11-10T23:00:00Z"



 50   DisableNotifications

 유형: object · 필수 필드 3개


   필드                            타입                   설명 · 제약


   public_opt_in     필수          boolean              —


   reminder_canceled        필수   boolean              —


   partial_failure    필수         boolean              —


   failed_parts                  array<string>        —



 51   SummaryData

 유형: object · 필수 필드 2개


   필드                            타입                   설명 · 제약


   worry_id   필수                 string               예: "w_091"


   display_summary    필수         string               최대 500자


   version                       integer              min 1



 52   DistressData

 유형: object · 필수 필드 3개


   필드                            타입                   설명 · 제약


   worry_id   필수                 string               예: "w_091"


   distress_before    필수         integer              min 1 · max 5


   distress_after    필수          integer              min 1 · max 5


   distress_delta                integer              min -4 · max 4




v1.0.0-draft | 2026.11.09                                                              88 / 90
```

<a id="pdf-page-89"></a>

## 원문 p.89 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                              BE1 · BE2 · AI



 53   RatingData

 유형: object · 필수 필드 2개


   필드                         타입                    설명 · 제약


   activity_id       필수       string                예: "a_rest"


   helpfulness       필수       string                enum: HELPFUL, UNSURE, NOT_HELPFUL


   answered_at                string (date-time)    예: "2026-11-10T23:00:00Z"



 54   RecordDetail

 유형: object · 필수 필드 3개


   필드                         타입                    설명 · 제약


   worry   필수                 WorryDetail           —


   activities      필수         array<ActivityData>   —


   reflection                 object                —


   ratings    필수              array<RatingData>     —



 55   ReflectionSaved

 유형: object · 필수 필드 2개


   필드                         타입                    설명 · 제약


   worry_id     필수            string                예: "w_091"


   outcome    필수              string                enum: BETTER, ONGOING, HAPPENED


   answered_at                string (date-time)    예: "2026-11-10T23:00:00Z"



 56   ReflectionSkip

 유형: object · 필수 필드 2개


   필드                         타입                    설명 · 제약


   local_date      필수         string (date)         예: "2026-11-09"


   skipped    필수              boolean               —



 57   DemoScenarios

 유형: object · 필수 필드 1개


   필드                         타입                    설명 · 제약


   scenarios    필수            array<object>         —




v1.0.0-draft | 2026.11.09                                                                     89 / 90
```

<a id="pdf-page-90"></a>

## 원문 p.90 / 90

```text

WOOLY VAULT / OPENAPI 3.0.3                                                                 BE1 · BE2 · AI




 06. 협업·변경 관리 메모
 BE1: 인증·접수·AI 비동기 상태·공개 제어·알림을 FE1과 우선 맞춥니다.

 BE2: 공개 이후 활동·기록·회고·파쇄·시연 API를 FE2와 합의하고, 공개/소유권 검사는 BE1과 동일한 서버 기준을 사용합니다.

 AI: /internal/ai/v1/analyze의 공통 DTO 계약을 유지하고 provider adapter에서 Upstage Solar/자체 모델을 교체합니다. 모델 출력은
 JSON schema 및 안전 정책으로 검증합니다.

 FE1·FE2: 각 Endpoint의 화면 ID·필수 값·상태별 오류·성공 시점에 따라 UI 상태를 구현합니다.

 기획·디자인: 위기 안내 문구, 노출/비노출 조건, 알림 동의, 삭제 확인 문구 등을 승인합니다.


 원본과 버전
 이 PDF는 저장된 wooly-vault-openapi.yaml에서 생성한 읽기용 문서입니다. 최신 API 계약은 YAML 원본을 기준으로 관리하고 PDF는 배
 포 시 함께 재생성하세요.

 민감 정보는 이 문서의 예시 문자열 이외에 추가하지 않았습니다. 실제 API 주소, 인증 키, 운영 환경은 포함되지 않았습니다.




v1.0.0-draft | 2026.11.09                                                                        90 / 90
```

