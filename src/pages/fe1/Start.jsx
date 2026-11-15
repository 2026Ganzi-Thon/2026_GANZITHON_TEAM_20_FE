
import { useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  startGuest,
  restartGuest,
} from "../../api/guest";

import { errorCode } from "../../api/client";

import "./Start.css";

function Start() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 기존 게스트 세션이 만료되었는지 확인
  const isRestart = searchParams.get("mode") === "restart";

  // API 요청 상태
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 시작하기 버튼 클릭
  const handleStart = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      // 처음 방문: START
      // 기존 세션 만료: RESTART
      if (isRestart) {
        await restartGuest();
      } else {
        await startGuest();
      }

      // 게스트 세션 생성 성공 시 걱정 입력 화면으로 이동
      navigate("/worry-input", {
        replace: true,
      });
    } catch (error) {
      console.error("게스트 세션 생성 실패:", error);

      const code = errorCode(error);

      // 기존 쿠키가 무효인 경우 재시작 화면으로 전환
      if (code === "GUEST_SESSION_INVALID" && !isRestart) {
        navigate("/start?mode=restart", {
          replace: true,
        });
        return;
      }

      if (code === "CSRF_REJECTED") {
        setErrorMessage(
          "요청을 확인하지 못했어요. 다시 시도해 주세요."
        );
      } else if (code === "TEMPORARILY_UNAVAILABLE") {
        setErrorMessage(
          "서버를 잠시 이용할 수 없어요. 조금 뒤 다시 시도해 주세요."
        );
      } else {
        setErrorMessage(
          "금고를 만드는 중 문제가 발생했어요. 다시 시도해 주세요."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="start-page">
      <div className="start-container">

        {/* 로고 및 서비스 소개 */}
        <section className="start-intro">
          <div className="start-logo" aria-hidden="true">
            <svg
              viewBox="0 0 92 104"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M46 7L78 19C83 21 86 25 86 31V49C86 72 70 88 46 97C22 88 6 72 6 49V31C6 25 9 21 14 19L46 7Z"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <circle
                cx="46"
                cy="45"
                r="9"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                d="M46 54V70"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="start-title">
            심야 걱정 금고
          </h1>

          <p className="start-description">
            잠들기 전 걱정을 짧게 맡겨두고
            <br />
            다음 날 정리된 내용을 확인해요
          </p>
        </section>

        {/* 하단 안내 및 시작 버튼 */}
        <div className="start-bottom">

          {isRestart ? (
            <section
              className="start-guide"
              aria-labelledby="start-guide-title"
            >
              <h2
                id="start-guide-title"
                className="start-guide-title"
              >
                이용 정보를 확인할 수 없어요
              </h2>

              <ul className="start-guide-list">
                <li>
                  기존 금고의 이용 정보가 만료되었거나
                  유효하지 않아요
                </li>
                <li>
                  새로 시작하면 새로운 금고가 만들어져요
                </li>
                <li>
                  이전 금고의 기록은 복구되지 않을 수 있어요
                </li>
              </ul>
            </section>
          ) : (
            <section
              className="start-guide"
              aria-labelledby="start-guide-title"
            >
              <h2
                id="start-guide-title"
                className="start-guide-title"
              >
                이 브라우저에 금고를 만들어요
              </h2>

              <ul className="start-guide-list">
                <li>
                  로그인 없이 바로 시작할 수 있어요
                </li>
                <li>
                  브라우저 데이터를 지우거나 다른 기기에서
                  열면 기존 금고에 접근하기 어려워요
                </li>
                <li>
                  기록은 작성일로부터 30일 뒤 자동으로 삭제돼요
                </li>
              </ul>
            </section>
          )}

          {/* 게스트 세션 생성 버튼 */}
          <button
            type="button"
            className="start-button"
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoading
              ? "처리 중..."
              : isRestart
                ? "새로 시작"
                : "시작하기"}
          </button>

          {/* API 오류 메시지 */}
          {errorMessage && (
            <p
              className="start-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Start;
