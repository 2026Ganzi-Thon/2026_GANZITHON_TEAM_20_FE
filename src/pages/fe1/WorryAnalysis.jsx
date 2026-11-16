
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, LoaderCircle } from "lucide-react";

import { getWorryRequest } from "../../api/worry";
import "./WorryAnalysis.css";

const POLLING_INTERVAL = 2000;
const DELAY_NOTICE_MS = 15000;
const HOME_TIMEOUT_MS = 30000;

function WorryAnalysis() {
  const navigate = useNavigate();
  const location = useLocation();

  // S-04에서 전달받은 값
  const requestId = location.state?.requestId;
  const analysisContext = location.state?.analysisContext;

  const [status, setStatus] = useState("PENDING");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const startTimeRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const checkingRef = useRef(false);

  // 화면 종료
  const handleClose = () => {
    finishedRef.current = true;

    // 화면을 나가더라도 서버 분석은 취소하지 않음
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (!requestId) {
      navigate("/", { replace: true });
      return;
    }

    let active = true;
    let pollTimer;
    let clockTimer;

    startTimeRef.current = Date.now();
    finishedRef.current = false;
    checkingRef.current = false;

    // 서버 분석 상태 조회
    const checkStatus = async () => {
      if (
        !active ||
        finishedRef.current ||
        checkingRef.current
      ) {
        return;
      }

      checkingRef.current = true;

      try {
        const response = await getWorryRequest(
          requestId,
          analysisContext
        );

        if (!active || finishedRef.current) {
          return;
        }

        const data = response?.data ?? response;
        const nextStatus = data?.status;

        // S-06 봉인 완료 화면으로 이동
        if (nextStatus === "SUCCEEDED") {
          finishedRef.current = true;
          setStatus("SUCCEEDED");

          navigate("/worry-complete", {
            replace: true,
            state: {
              status: "SUCCEEDED",
              worryId: data.worryId,
              sealedAt: data.sealedAt,
              publishAt: data.publishAt,
            },
          });

          return;
        }

        // S-16 도움 안내 분기
        if (nextStatus === "SUPPORT_GUIDANCE") {
          finishedRef.current = true;
          setStatus("SUPPORT_GUIDANCE");

          // S-16 화면 구현 후 경로 변경
          // navigate("/support-guidance", {
          //   replace: true,
          //   state: {
          //     guidanceCode: data.guidanceCode,
          //   },
          // });

          navigate("/", { replace: true });
          return;
        }

        // 서버에서 최종 실패를 반환한 경우
        if (nextStatus === "FAILED") {
          finishedRef.current = true;
          setStatus("FAILED");

          setErrorMessage(
            "걱정을 정리하지 못했어요. 다시 시도해 주세요."
          );

          return;
        }

        // 분석 진행 중
        if (nextStatus === "PENDING") {
          setStatus("PENDING");
          setErrorMessage("");
        }

        // 30초가 지나도 PENDING이면
        // 서버 상태를 확인한 뒤 홈으로 이동
        const elapsed =
          Date.now() - startTimeRef.current;

        if (
          nextStatus === "PENDING" &&
          elapsed >= HOME_TIMEOUT_MS
        ) {
          finishedRef.current = true;

          navigate("/", {
            replace: true,
            state: {
              analysisPending: true,
              requestId,
            },
          });

          return;
        }
      } catch (error) {
        if (!active || finishedRef.current) {
          return;
        }

        console.error("AI 분석 상태 조회 실패:", {
          status: error.response?.status,
        });

        // 네트워크 오류를 분석 실패로 처리하지 않음
        setErrorMessage(
          "상태를 확인하는 데 시간이 걸리고 있어요."
        );
      } finally {
        checkingRef.current = false;
      }
    };

    // 화면 진입 직후 최초 상태 조회
    checkStatus();

    // 2초마다 서버 상태 조회
    pollTimer = window.setInterval(
      checkStatus,
      POLLING_INTERVAL
    );

    // 경과 시간 갱신
    clockTimer = window.setInterval(() => {
      if (!active || finishedRef.current) {
        return;
      }

      const seconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );

      setElapsedSeconds(seconds);
    }, 1000);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      window.clearInterval(clockTimer);
    };
  }, [requestId, analysisContext, navigate]);

  // 서버에서 최종 실패가 확인된 경우
  // 재시도 API는 추후 연결
  const handleFailureHome = () => {
    navigate("/", {
      replace: true,
      state: {
        analysisFailed: true,
        requestId,
      },
    });
  };

  const isDelayed =
    elapsedSeconds * 1000 >= DELAY_NOTICE_MS;

  const isFailed = status === "FAILED";

  return (
    <div className="wa-page">
      {/* 상단 닫기 버튼 */}
      <header className="wa-header">
        <button
          type="button"
          className="wa-close"
          onClick={handleClose}
          aria-label="닫기"
        >
          <X size={25} strokeWidth={1.8} />
        </button>
      </header>

      <main className="wa-main">
        {/* 중앙 로딩 애니메이션 */}
        <div className="wa-loading-area">
          <div
            className={`wa-spinner ${
              isFailed ? "wa-spinner-stopped" : ""
            }`}
            role="status"
            aria-label={
              isFailed
                ? "분석 실패"
                : "AI가 걱정을 정리하고 있어요"
            }
          />
        </div>

        {/* 중앙 안내 문구 */}
        <section className="wa-message">
          <h1>
            {isFailed
              ? "걱정을 정리하지 못했어요"
              : "걱정을 정리하고 있어요"}
          </h1>

          <p>
            {isFailed
              ? "잠시 후 다시 확인해 주세요"
              : "잠시만 기다려 주세요"}
          </p>
        </section>

        {/* 분석 진행 안내 */}
        {!isFailed && (
          <div className="wa-status-pill">
            <LoaderCircle
              size={17}
              className="wa-small-spinner"
            />
            <span>나가도 정리는 계속돼요</span>
          </div>
        )}

        {/* 최종 실패 안내 */}
        {isFailed && (
          <button
            type="button"
            className="wa-retry-button"
            onClick={handleFailureHome}
          >
            홈으로 이동
          </button>
        )}
      </main>

      {/* 하단 안내 영역 */}
      <footer className="wa-footer">
        <div className="wa-notice">
          {isFailed ? (
            <>
              <p className="wa-notice-title">
                정리하지 못했어요
              </p>
              <p>
                {errorMessage ||
                  "홈에서 상태를 확인해 주세요."}
              </p>
            </>
          ) : isDelayed ? (
            <>
              <p className="wa-notice-title">
                조금만 더 기다려 주세요
              </p>
              <p>
                정리가 길어지고 있어요.
                나가더라도 서버에서 계속 진행돼요.
              </p>
            </>
          ) : (
            <>
              <p className="wa-notice-title">
                걱정을 안전하게 정리하고 있어요
              </p>
              <p>
                잠시 기다려 주세요.
                화면을 나가도 정리는 계속돼요.
              </p>
            </>
          )}

          {!isFailed && errorMessage && (
            <p className="wa-network-notice">
              {errorMessage}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

export default WorryAnalysis;
