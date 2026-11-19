import { logError } from '../../api/logError.js'

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Shield,
  KeyRound,
  Circle,
  ChevronRight,
  Settings,
  Bell,
} from "lucide-react";

import { getVaultSummary, getCurrentActivity } from "../../api/vault";

import {
  getReminder,
  cancelReminder,
} from "../../api/settings";

import "./Home.css";
import { subscribeFe2Changes } from "../../features/fe2/integration.js";

/* ========================================
   날짜 및 시간 표시
======================================== */

// 한국 시간 기준으로 날짜 표시
const formatDateTime = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return formatter.format(date);
};

// 오늘 / 내일 / 날짜 구분
const formatPublishAt = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();

  const getKoreanDateParts = (value) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(value);

    const getPart = (type) =>
      Number(parts.find((part) => part.type === type)?.value);

    return {
      year: getPart("year"),
      month: getPart("month"),
      day: getPart("day"),
    };
  };

  const todayParts = getKoreanDateParts(now);
  const targetParts = getKoreanDateParts(date);

  const todayUTC = Date.UTC(
    todayParts.year,
    todayParts.month - 1,
    todayParts.day
  );

  const targetUTC = Date.UTC(
    targetParts.year,
    targetParts.month - 1,
    targetParts.day
  );

  const dayDiff = Math.round(
    (targetUTC - todayUTC) / 86400000
  );

  let dayLabel;

  if (dayDiff === 0) {
    dayLabel = "오늘";
  } else if (dayDiff === 1) {
    dayLabel = "내일";
  } else {
    dayLabel =
      `${targetParts.month}월 ${targetParts.day}일`;
  }

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = Number(
    timeParts.find((part) => part.type === "hour")?.value
  );

  const minute =
    timeParts.find((part) => part.type === "minute")?.value ??
    "00";

  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;

  return `${dayLabel} ${period} ${displayHour}:${minute}`;
};

/* ========================================
   재알림 응답 처리
======================================== */

// 재알림 조회 API의 실제 응답 구조 확인 필요
// 확인되지 않은 응답은 예약이 있다고 표시하지 않음
const getReminderDate = (data) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const dateString =
    data.sendAt ?? null;

  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateString;
};

/* ========================================
   홈 화면
======================================== */

function Home() {
  const navigate = useNavigate();

  // 금고 요약 API 데이터
  const [vaultSummary, setVaultSummary] = useState(null);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [activityError, setActivityError] = useState('');
  const [dismissedRequests,setDismissedRequests] = useState([]);
  useEffect(() => {
    let active = true;
    const refresh = () => getCurrentActivity().then(data => { if (active) { setCurrentActivity(data); setActivityError(''); } }).catch(() => { if (active) setActivityError('진행 중인 활동을 확인하지 못했어요.'); });
    refresh();
    const unsubscribe = subscribeFe2Changes(refresh);
    window.addEventListener('focus', refresh);
    return () => { active = false; unsubscribe(); window.removeEventListener('focus', refresh); };
  }, []);

  // 금고 요약 API 상태
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // 재알림 API 상태
  const [reminder, setReminder] = useState(null);
  const [reminderError, setReminderError] = useState("");
  const [isReminderCancelling, setIsReminderCancelling] =
    useState(false);

  /* ========================================
     금고 요약 조회
  ======================================== */

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
          logError(error)
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
    window.addEventListener("focus", fetchVaultSummary);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("focus", fetchVaultSummary);
    };
  }, []);

  /* ========================================
     재알림 예약 조회
  ======================================== */

  useEffect(() => {
    let cancelled = false;

    const fetchReminder = async () => {
      try {
        setReminderError("");

        const data = await getReminder();

        if (cancelled) return;

        // 204 No Content → 예약 없음
        if (!data) {
          console.log("현재 예약된 재알림이 없습니다.");
          setReminder(null);
          return;
        }



        const reminderDate = getReminderDate(data);

        if (reminderDate) {
          setReminder(data);
        } else {
          setReminder(null);
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "재알림 조회 API 오류:",
          logError(error)
        );

        // API 문서에서 예약 없음 응답 형식을 확인해야 함
        // 조회 실패를 예약 없음으로 단정하지 않음
        setReminder(null);

        setReminderError(
          "재알림 예약 상태를 확인하지 못했어요."
        );
      }
    };

    fetchReminder();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ========================================
     재알림 예약 취소
  ======================================== */

  const handleCancelReminder = async () => {
    if (isReminderCancelling) return;

    setIsReminderCancelling(true);
    setReminderError("");

    try {
      await cancelReminder();

      // 서버에서 취소 성공한 뒤 카드 제거
      setReminder(null);

      console.log("재알림 예약 취소 완료");
    } catch (error) {
      console.error(
        "재알림 취소 API 오류:",
        logError(error)
      );

      setReminderError(
        "재알림을 취소하지 못했어요. 다시 시도해 주세요."
      );
    } finally {
      setIsReminderCancelling(false);
    }
  };

  /* ========================================
     서버 데이터
  ======================================== */

  const lockedCount = vaultSummary?.lockedCount ?? 0;
  const publicCount = vaultSummary?.publicCount ?? 0;

  const analysisRequests = Array.isArray(
    vaultSummary?.analysisRequests
  )
    ? vaultSummary.analysisRequests
    : [];

  const visibleRequests = analysisRequests.filter(request => !dismissedRequests.includes(request.requestId));
  const nearestPublishAt = vaultSummary?.nearestPublishAt;
  const hasPending = analysisRequests.some(request => request.status === 'PENDING');
  useEffect(() => {
    if (!hasPending) return;
    let active = true;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      getVaultSummary().then(data => { if (active) setVaultSummary(data); }).catch(() => {});
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [hasPending]);


  const reminderDate = getReminderDate(reminder);

  /* ========================================
     화면 상태 판단
  ======================================== */

  const isEmpty =
    lockedCount === 0 &&
    publicCount === 0 &&
    visibleRequests.length === 0 &&
    !reminderDate && !currentActivity?.activityId;

  const isPublic = publicCount > 0;

  const isLocked = !isEmpty && !isPublic;

  /* ========================================
     화면 이동
  ======================================== */

  const goToWorryInput = () => {
    navigate("/worry-input");
  };

  /* ========================================
     공통 헤더
  ======================================== */

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

  /* ========================================
     API 로딩 화면
  ======================================== */

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

  /* ========================================
     API 오류 화면
  ======================================== */

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

  /* ========================================
     홈 화면 렌더링
  ======================================== */

  return (
    <div className="nv-home">
      {renderHeader()}

      {activityError && <p className="nv-home-inline-error" role="alert">{activityError}</p>}
      {/* ====================================
          ① 기록이 없는 상태
      ==================================== */}

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

          {reminderError && (
            <p
              className="nv-home-inline-error"
              role="alert"
            >
              {reminderError}
            </p>
          )}

          <button
            type="button"
            className="nv-home-primary"
            onClick={goToWorryInput}
          >
            걱정 맡기기
          </button>
        </main>
      )}

      {/* ====================================
          ② 기록이 있는 홈 화면
      ==================================== */}

      {!isEmpty && (
        <main className="nv-home-content">

          {currentActivity?.activityId && <button type="button" className="nv-home-info-card" onClick={() => navigate('/activities/' + encodeURIComponent(currentActivity.activityId))}>
            <Circle size={23} /><div><span>진행 중인 활동</span><strong>{currentActivity.helpType === 'ACTION' ? '10분 액션 · ' + (currentActivity.progress?.doneCount ?? 0) + '/3 단계' : currentActivity.helpType === 'REST' ? '짧은 휴식 · ' + (currentActivity.progress?.timeOver ? '완료할 수 있어요' : currentActivity.state === 'PAUSED' ? '일시정지' : '진행 중') : '그냥 들어줘'}</strong></div><ChevronRight className="nv-home-info-arrow" size={22} />
          </button>}
          {/* 공개 가능한 걱정 */}
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
          {visibleRequests.map(request => <div key={request.requestId}><button type="button" className="nv-home-info-card" onClick={() => navigate('/worry-analysis', { state: { requestId: request.requestId } })}>
            <Circle size={23} /><div><span>{request.status === 'FAILED' ? '정리 실패' : '정리 중'}</span><strong>{request.status === 'FAILED' ? '정리하지 못했어요 · 다시 시도' : '걱정 1개를 정리하고 있어요'}</strong></div><ChevronRight className="nv-home-info-arrow" size={22} />
          </button>{request.status === 'FAILED' && <button type="button" className="nv-home-cancel" aria-label="정리 실패 안내 닫기" onClick={() => setDismissedRequests(ids => [...ids,request.requestId])}>닫기</button>}</div>)}

          {/* ====================================
              재알림 예약 카드
          ==================================== */}

          {reminderDate && (
            <section className="nv-home-info-card nv-home-reminder-card">
              <Bell size={23} strokeWidth={1.7} />

              <div>
                <span>재알림 예약됨</span>

                <strong>
                  {formatPublishAt(reminderDate) ??
                    formatDateTime(reminderDate)}
                  에 한 번 알려드려요
                </strong>
              </div>

              <button
                type="button"
                className="nv-home-cancel"
                onClick={handleCancelReminder}
                disabled={isReminderCancelling}
              >
                {isReminderCancelling
                  ? "취소 중"
                  : "취소"}
              </button>
            </section>
          )}

          {/* 재알림 API 오류 */}
          {reminderError && (
            <p
              className="nv-home-inline-error"
              role="alert"
            >
              {reminderError}
            </p>
          )}

          {/* ====================================
              잠긴 걱정 카드
          ==================================== */}

          {lockedCount > 0 && (
            <section className="nv-home-vault-card">
              <div className="nv-home-vault-icon">
                <Shield size={39} strokeWidth={1.5} />
                <KeyRound size={15} />
              </div>

              <h2>
                걱정 {lockedCount}개가 잠겨 있어요
              </h2>

              <p>
                {nearestPublishAt
                  ? `${
                      formatPublishAt(nearestPublishAt) ??
                      "공개 예정 시각"
                    }에 열려요`
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
            visibleRequests.some(request => request.status === 'PENDING') && (
              <p className="nv-home-processing-message">
                걱정을 정리하고 있어요.
                <br />
                정리가 끝나면 금고에서 확인할 수 있어요.
              </p>
            )}

          {/* ====================================
              걱정 추가 버튼
          ==================================== */}

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
