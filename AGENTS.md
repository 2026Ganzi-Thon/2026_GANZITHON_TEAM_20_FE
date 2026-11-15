# Wooly Vault — FE2 개발 지침

- 시작 전에 docs/specs/WOOLY_VAULT_PLAN.md를 읽고 FE2 담당 범위를 확인한다.
- 화면 구현 전 docs/specs/WOOLY_VAULT_WIREFRAMES.md 및 WOOLY_VAULT_DESIGN.md의 해당 화면·상태·문구·지침·충돌을 확인한다. 최신 대조 결과는 docs/FE2_DESIGN_RECHECK.md다.
- 사용자 담당 FE2: 금고·잠금 안내·상세·도움 활동·회고·기록·시연. FE1 홈·입력·설정 범위를 임의로 확대 구현하지 않는다.
- Figma는 조회만 한다. 생성·수정·삭제·재배치 등 원본 변경을 하지 않는다.
- React/Vite/JavaScript/CSS/React Router/Axios 및 팀 공통 스타일을 사용한다. 원본에 있는 SUITE/Noto Sans KR 혼용과 개별 치수·SVG를 보존하고 일괄 재색칠·대체를 하지 않는다.
- 나이트는 기기 시각22:00~06:00이며 플로우와 독립이다. 개발용 비교 도구/상태바는 운영에 넣지 않는다.
- 기존 PDF API는 초안이다. docs/FE2_HANDOFF.md와 실제20팀 백엔드 코드·확정 계약을 확인한다. FE는 Spring만 호출한다.
- DELETE202를 완료로 표시하지 않는다. 현재 검토한 백엔드에는202 완료 조회 계약이 없으므로 추정·404만으로 성공 처리하지 않는다.
- 액션3체크·휴식0초·공감 조회는 자동 완료가 아니다. 명시적 완료를 유지하고 실패 시 초안을 보존한다.
- 검사는 npm run check:release로 실행한다. 테스트 통과를 실제 서버 E2E/기기 검증/모든 픽셀 일치로 확대하지 않는다.
- 원문 정책·추가 근거는 docs/specs/PROJECT_INSTRUCTIONS.md와 나머지 WOOLY_VAULT_*.md에 있다.
