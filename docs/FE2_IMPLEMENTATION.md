> 최신 디자인 수정·검증은 [FE2_DESIGN_RECHECK.md](FE2_DESIGN_RECHECK.md)를 우선한다. 이전 빈 상태 대체/전체 SUITE 설명은 이 문서로 정정했다.

# FE2 구현·실행 메모

main 698aebf 기반, 로컬 feat/fe2. FE2 범위는 금고·잠금·상세·회고·도움 활동·기록·시연이다.

최신 계약·팀 연결·배포와 출시 전 확인 목록은 [FE2_HANDOFF.md](FE2_HANDOFF.md), 시각/정책 검증은 [FE2_QA.md](FE2_QA.md)를 기준으로 한다.

## 실행

~~~sh
npm ci
npm run dev
npm run check:release
~~~

/vault에서 시작한다. .env.local의 VITE_FE2_MOCK=true는 로컬 예시 모드다. 운영 build에서는 무시되며 실제 Spring 어댑터를 쓴다. 실제 API 주소 설정과 FE1 통합은 인계 문서를 따른다.

## 화면 경로

| 화면 | 경로 |
| --- | --- |
| 금고·잠금·날짜·시간 변경 | /vault |
| 상세·회고·불안도·도움 선택 | /worries/:worryId |
| 정리 수정 | /worries/:worryId/edit |
| 액션·휴식·공감·파쇄 | /worries/:worryId/action, rest, empathy, shred |
| 활동 복귀·결과 | /activities/:activityId, /activities/:activityId/result |
| 기록 | /records, /records/:worryId |
| 시연 전용 패널 | /demo (일반 메뉴 진입 없음) |

라우트는 main에 없던 FE2를 구현하기 위한 로컬 정의이며 팀 통합 시 FE1과 합친다.

## 디자인

기존 공통 typography/colors와 SUITE를 사용한다. 아이콘은 제공 PDF/SVG 벡터에서 추출했다. 디자인팀 폰트 파일 버전은 미확인이다. 자체 제공 SUITE Regular/Bold 출처는 https://github.com/sun-typeface/SUITE 이며 public/fe2/fonts/LICENSE에 라이선스를 보존했다.

나이트는 기기 로컬22:00~06:00이며 플로우와 독립이다. 낮은 화이트 화면이다. 제공되지 않은 나이트 개별 화면은 MD 규칙으로 매핑했다. 실제 OS 상태바와 중복되는 가짜9:41을 그리지 않는다.

날짜 선택은 이제 기본 브라우저 달력 대신 제공 참고 화면의 월 헤더·7열 날짜·선택 표시 구조로 구현했다. 실제 요일·윤년·허용 날짜를 계산하고 월 이동/화살표 키/Enter/Escape를 지원한다. 기존 3열 시간 휠은 클릭·키보드 선택이며 원본의 관성 스크롤까지 복제한 것으로 주장하지 않는다. 빈 기록은 원본의 자리표시자 상태를 보존한다. 임의 금고 아이콘 대체를 취소했다.

저장 불가 버튼은 가이드에 따라 클릭 가능하며 오류를 드러낸다. S08은 PDF1181과 가이드1224의 차이를 보존해 예시 전체 높이1181을 확인했다. 데이터 길이에 따라 스크롤 높이는 변한다.
