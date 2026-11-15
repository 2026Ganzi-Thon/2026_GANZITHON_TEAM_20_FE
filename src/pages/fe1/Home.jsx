
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  KeyRound,
  Circle,
  ChevronRight,
  Settings,
} from "lucide-react";

import { getVaultSummary } from "../../api/vault";
import "./Home.css";
import { subscribeFe2Changes } from "../../features/fe2/integration.js";

// 공개 예정 시각 표시
const formatPublishAt = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const targetDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const dayDiff = Math.round(
    (targetDay.getTime() - today.getTime()) / 86400000
  );

  let dayLabel;

  if (dayDiff === 0) {
    dayLabel = "오늘";
  } else if (dayDiff === 1) {
    dayLabel = "내일";
  } else {
    dayLabel = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");

  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;

  return `${dayLabel} ${period} ${displayHour}:${minute}`;
};

function Home() {
  const navigate = useNavigate();

  // 금고 요약 API 데이터
  const [vaultSummary, setVaultSummary] = useState(null);

  // API 상태
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchVaultSummary = async () => {
      try {
        setIsLoading(true);
        setApiError(null);

        const data = await getVaultSummary();

        if (cancelled) return;

        setVaultSummary(data);


      } catch (error) {
        if (cancelled) return;

        console.error(
          "금고 요약 API 오류:",
          error.response?.status,
          error.response?.data || error.message
        );

        setApiError("금고 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchVaultSummary();
    const unsubscribe = subscribeFe2Changes(fetchVaultSummary);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // 실제 API 데이터
  const lockedCount = vaultSummary?.lockedCount ?? 0;
  const publicCount = vaultSummary?.publicCount ?? 0;

  const analysisRequests = Array.isArray(
    vaultSummary?.analysisRequests
  )
    ? vaultSummary.analysisRequests
    : [];

  const nearestPublishAt = vaultSummary?.nearestPublishAt;

  // 화면 상태 판단
  const isEmpty =
    lockedCount === 0 &&
    publicCount === 0 &&
    analysisRequests.length === 0;

  const isPublic = publicCount > 0;

  const isLocked = !isEmpty && !isPublic;

  // 걱정 입력 페이지 이동
  const goToWorryInput = () => {
    navigate("/worry-input");
  };

  // 공통 헤더
  const renderHeader = () => (
    <header className="nv-home-header">
      <h1>심야 걱정 금고</h1>

      <button
        type="button"
        className="nv-home-settings"
        onClick={() => navigate("/settings")}
        aria-label="설정"
      >
        <Settings size={25} strokeWidth={1.7} />
      </button>
    </header>
  );

  // API 로딩
  if (isLoading) {
    return (
      <div className="nv-home">
        {renderHeader()}

        <main className="nv-home-empty">
          <div className="nv-home-empty-center">
            <p>금고 정보를 불러오는 중이에요...</p>
          </div>
        </main>
      </div>
    );
  }

  // API 오류
  if (apiError) {
    return (
      <div className="nv-home">
        {renderHeader()}

        <main className="nv-home-empty">
          <div className="nv-home-empty-center">
            <p>{apiError}</p>
          </div>

          <button
            type="button"
            className="nv-home-primary"
            onClick={() => window.location.reload()}
          >
            다시 시도하기
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="nv-home">
      {renderHeader()}

      {/* ① 기록이 없는 상태 */}
      {isEmpty && (
        <main className="nv-home-empty">
          <div className="nv-home-empty-center">
            <div className="nv-home-illustration">
              <svg
                viewBox="0 0 180 210"
                width="180"
                height="180"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M90 12C80 12 34 34 25 42C17 49 17 60 17 79V112C17 153 46 183 90 197C134 183 163 153 163 112V79C163 60 163 49 155 42C146 34 100 12 90 12Z"
                  stroke="#25243A"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />

                <circle
                  cx="90"
                  cy="92"
                  r="17"
                  stroke="#25243A"
                  strokeWidth="5"
                />

                <path
                  d="M90 109V136"
                  stroke="#25243A"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h2>아직 맡긴 걱정이 없어요</h2>

            <p>
              잠들기 전 떠오른 걱정을 짧게 맡겨두면
              <br />
              내일 정리된 내용을 확인할 수 있어요
            </p>
          </div>

          <button
            type="button"
            className="nv-home-primary"
            onClick={goToWorryInput}
          >
            걱정 맡기기
          </button>
        </main>
      )}

      {/* ② 공개 전 / ③ 공개 가능 */}
      {!isEmpty && (
        <main className="nv-home-content">
          {/* 공개 가능한 걱정이 있을 때 */}
          {isPublic && (
            <section className="nv-home-vault-card nv-home-vault-public">
              <div className="nv-home-vault-icon">
                <Shield size={39} strokeWidth={1.5} />
                <KeyRound size={15} />
              </div>

              <h2>
                열어볼 수 있는 걱정 {publicCount}개
              </h2>

              <p>공개된 걱정을 확인할 수 있어요</p>

              <button
                type="button"
                onClick={() => navigate("/vault")}
              >
                금고 열기
              </button>
            </section>
          )}

          {/* 정리 중인 걱정 */}
          {analysisRequests.length > 0 && (
            <button
              type="button"
              className="nv-home-info-card"
              onClick={() => navigate("/vault")}
            >
              <Circle size={23} />

              <div>
                <span>정리 중</span>

                <strong>
                  걱정 {analysisRequests.length}개를 정리하고 있어요
                </strong>
              </div>

              <ChevronRight size={22} />
            </button>
          )}

          {/* 잠긴 걱정 */}
          {lockedCount > 0 && (
            <section className="nv-home-vault-card">
              <div className="nv-home-vault-icon">
                <Shield size={39} strokeWidth={1.5} />
                <KeyRound size={15} />
              </div>

              <h2>걱정 {lockedCount}개가 잠겨 있어요</h2>

              <p>
                {nearestPublishAt
                  ? `${formatPublishAt(nearestPublishAt)}에 열려요`
                  : "공개 예정인 걱정이 있어요"}
              </p>

              <button
                type="button"
                onClick={() => navigate("/vault")}
              >
                잠긴 걱정 보기
              </button>
            </section>
          )}

          {/* 정리 중인 걱정만 있는 경우 */}
          {isLocked &&
            lockedCount === 0 &&
            analysisRequests.length > 0 && (
              <p className="nv-home-processing-message">
                걱정을 정리하고 있어요.
                <br />
                정리가 끝나면 금고에서 확인할 수 있어요.
              </p>
            )}

          {/* 걱정 추가 버튼 */}
          <button
            type="button"
            className="nv-home-primary"
            onClick={goToWorryInput}
          >
            걱정 더 맡기기
          </button>
        </main>
      )}
    </div>
  );
}

export default Home;
