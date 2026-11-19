# 심야 걱정 금고 · Wooly Vault

20팀 모바일 웹 프론트엔드. React / Vite / JavaScript / CSS / React Router / Axios를 사용합니다.

## 실행

~~~sh
npm ci
npm run dev
~~~

API 기본 경로는 /api/v1, 개발 프록시 기본 대상은 http://127.0.0.1:8080입니다. .env.example과 백엔드 프런트 연동 가이드를 참고하세요. 공개 서버 연동/운영 배포에서는 HTTPS·쿠키·CSRF와 동일 origin 구성을 확인해야 합니다.

## 검사·빌드

~~~sh
npm run check:release
~~~

린트·35개 테스트·운영 빌드·예시 fixture 제외 검사를 실행합니다. 배포 산출물은 dist입니다.

## 개발·검증 자료

- [최신 FE1·FE2 통합 검증 및 남은 작업](docs/FRONTEND_INTEGRATION_QA.md)
- [백엔드 계약 연결표](docs/FE2_HANDOFF.md)
- [제공 디자인 재검수 이력](docs/FE2_DESIGN_RECHECK.md)
- [기획·화면·디자인 기준](docs/specs/README.md)

시연 키는 코드·VITE 환경변수·URL에 넣지 않습니다. /demo에서 시연 전용 브라우저로 접속해 입력하세요. VITE_FE2_MOCK=true는 개발용 예시 모드이며 운영 빌드는 실제 API 어댑터를 사용합니다.
