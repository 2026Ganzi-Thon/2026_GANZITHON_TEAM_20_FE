
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, ShieldCheck, BellOff } from "lucide-react";

import { subscribeToPush, isPushSupported } from "../../api/push";
import {
  getReminder,
  scheduleReminder,
  cancelReminder,
} from "../../api/settings";

import "./WorryComplete.css";

const REMINDER_OPTIONS = [
  { value: 30, label: "30분 뒤" },
  { value: 60, label: "1시간 뒤" },
  { value: null, label: "예약하지 않기" },
];

const ERROR_CONTENT = {
  denied: {
    description:
      "브라우저에서 알림이 차단되어 있어요. 브라우저 설정에서 허용으로 바꾸면 다시 켤 수 있어요.",
  },
  unsupported: {
    description:
      "이 브라우저는 알림을 지원하지 않아요. 다른 브라우저에서는 켤 수 있어요.",
  },
  failed: {
    description:
      "알림 예약을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  },
};

// 서버의 UTC 공개 시각을 한국 시간으로 표시
const formatPublishAt = (publishAt) => {
  if (!publishAt) {
    return "공개 예정 시간을 확인할 수 없어요";
  }

  const date = new Date(publishAt);

  if (Number.isNaN(date.getTime())) {
    return "공개 예정 시간을 확인할 수 없어요";
  }

  const formatted = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted}에 열려요`;
};

// 선택지에 표시할 예상 시각
// 실제 예약 시각은 서버 기준으로 결정됨
const formatReminderTime = (minutes, baseTime) => {
  if (minutes === null) return "";

  const date = new Date(baseTime + minutes * 60 * 1000);

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

// 서버의 예약 조회 결과를 확인
// 실제 응답 구조가 다르면 이 함수만 조정
const hasActiveReminder = (data) => {
  if (!data || typeof data !== "object") {
    return false;
  }

  if (data.active === false || data.enabled === false) {
    return false;
  }

  return Boolean(
    data.worryId ||
      data.reminderId ||
      data.scheduledAt ||
      data.remindAt
  );
};

function WorryComplete() {
  const navigate = useNavigate();
  const location = useLocation();

  // S-05에서 전달받은 서버 응답
  const { worryId, publishAt, status } = location.state ?? {};

  // AL-04 / AL-09 Bottom Sheet 상태
  const [sheetType, setSheetType] = useState(null);
  const [selectedMinutes, setSelectedMinutes] = useState(null);

  // 재알림 상태
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");
  const [existingReminder, setExistingReminder] = useState(false);

  // AL-09 오류 유형
  const [errorType, setErrorType] = useState("failed");

  // 선택창을 연 시각
  const [selectionBaseTime, setSelectionBaseTime] = useState(
    () => Date.now()
  );

  // 중복 예약 요청 방지
  const savingRef = useRef(false);

  // 팝업 버튼 포커스
  const sheetButtonRef = useRef(null);

  // Bottom Sheet 표시 중 스크롤 방지
  useEffect(() => {
    if (!sheetType) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    sheetButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !savingRef.current) {
        setSheetType(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sheetType]);

  // 오류 유형 판별
  const resolveErrorType = (error) => {
    const message = error?.message;

    if (message === "PUSH_UNSUPPORTED") {
      return "unsupported";
    }

    if (
      message === "PUSH_DENIED" ||
      (
        isPushSupported() &&
        Notification.permission === "denied"
      )
    ) {
      return "denied";
    }

    return "failed";
  };

  // AL-09 표시
  const openErrorSheet = (error) => {
    setErrorType(resolveErrorType(error));
    setSheetType("error");
  };

  // AL-04 열기
  const openReminderSheet = async () => {
    if (reminderLoading || savingRef.current) return;

    setSelectedMinutes(null);
    setSelectionBaseTime(Date.now());
    setSheetType("reminder");

    // 기존 예약 여부 조회
    setReminderLoading(true);

    try {
      const result = await getReminder();

      setExistingReminder(hasActiveReminder(result));
    } catch (error) {
      console.error("기존 재알림 조회 실패:", error);

      // 조회에 실패하면 기존 예약 여부를 확정하지 않음
      setExistingReminder(false);
      setReminderStatus(
        "기존 예약을 확인하지 못했어요."
      );
    } finally {
      setReminderLoading(false);
    }
  };

  // Bottom Sheet 닫기
  const closeSheet = () => {
    if (savingRef.current) return;
    setSheetType(null);
  };

  // 재알림 예약 또는 취소
  const handleSaveReminder = async () => {
    if (savingRef.current || reminderLoading) return;

    savingRef.current = true;
    setReminderLoading(true);
    setReminderStatus("");

    try {
      if (selectedMinutes === null) {
        // 예약하지 않기:
        // 기존 예약도 취소하여 활성 예약이 없도록 함
        await cancelReminder();

        setExistingReminder(false);
        setReminderStatus("재알림을 예약하지 않았어요.");
        setSheetType(null);
        return;
      }

      if (!isPushSupported()) {
        throw new Error("PUSH_UNSUPPORTED");
      }

      if (Notification.permission === "denied") {
        throw new Error("PUSH_DENIED");
      }

      // 권한 요청 및 푸시 구독
      const subscription = await subscribeToPush();

      if (!subscription?.endpoint) {
        throw new Error("PUSH_SUBSCRIPTION_MISSING");
      }

      // 서버에서 현재 시각을 기준으로 예약
      await scheduleReminder({
        worryId,
        endpoint: subscription.endpoint,
        minutes: selectedMinutes,
      });

      setExistingReminder(true);
      setReminderStatus(
        selectedMinutes === 30
          ? "30분 뒤 재알림을 예약했어요."
          : "1시간 뒤 재알림을 예약했어요."
      );

      // 성공 응답을 받은 뒤에만 완료 처리
      setSheetType(null);
    } catch (error) {
      console.error("재알림 예약 실패:", error);

      setReminderStatus("");
      openErrorSheet(error);
    } finally {
      savingRef.current = false;
      setReminderLoading(false);
    }
  };

  const handleHome = () => {
    navigate("/", { replace: true });
  };

  const handleNewWorry = () => {
    navigate("/worry-input", {
      replace: true,
    });
  };

  // 분석 성공이 확인되지 않으면 완료 화면 접근 제한
  if (status !== "SUCCEEDED" || !worryId) {
    return (
      <div className="wc-invalid">
        <p>봉인 완료 정보를 확인할 수 없어요.</p>

        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
        >
          홈으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="wc-page">
      <main className="wc-main">
        <div className="wc-center">
          <div className="wc-icon" aria-hidden="true">
            <ShieldCheck size={76} strokeWidth={1.25} />
          </div>

          <div className="wc-message">
            <h1>맡겨두었어요</h1>
            <p>이제 폰을 내려놓아도 돼요.</p>
          </div>

          <div className="wc-publish-pill">
            <Clock3 size={16} strokeWidth={2} />
            <span>{formatPublishAt(publishAt)}</span>
          </div>
        </div>
      </main>

      <footer className="wc-footer">
        {/* Figma 순서: 새 걱정 맡기기 → 홈으로 */}
        <button
          type="button"
          className="wc-new-button"
          onClick={handleNewWorry}
        >
          새 걱정 맡기기
        </button>

        <button
          type="button"
          className="wc-home-button"
          onClick={handleHome}
        >
          홈으로
        </button>

        <button
          type="button"
          className="wc-reminder-button"
          onClick={openReminderSheet}
          disabled={reminderLoading}
        >
          조금 뒤에 다시 알려주세요
        </button>

        {reminderStatus && (
          <p
            className="wc-reminder-status"
            role="status"
          >
            {reminderStatus}
          </p>
        )}
      </footer>

      {/* AL-04 재알림 시간 선택 */}
      {sheetType === "reminder" && (
        <div
          className="wc-sheet-overlay"
          onClick={closeSheet}
        >
          <section
            className="wc-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wc-reminder-title"
            aria-describedby="wc-reminder-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wc-sheet-handle" />

            <h2
              id="wc-reminder-title"
              className="wc-sheet-title"
            >
              언제 다시 알려드릴까요
            </h2>

            <p
              id="wc-reminder-description"
              className="wc-sheet-description"
            >
              기본은 예약 없음이에요
            </p>

            <div
              className="wc-reminder-options"
              role="radiogroup"
              aria-label="재알림 시간"
            >
              {REMINDER_OPTIONS.map((option) => {
                const selected =
                  selectedMinutes === option.value;

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className="wc-reminder-option"
                    disabled={reminderLoading}
                    onClick={() =>
                      setSelectedMinutes(option.value)
                    }
                  >
                    <span className="wc-reminder-option-label">
                      {option.label}
                    </span>

                    <span className="wc-reminder-option-right">
                      {option.value !== null && (
                        <span className="wc-reminder-option-time">
                          {formatReminderTime(
                            option.value,
                            selectionBaseTime
                          )}
                        </span>
                      )}

                      <span
                        className={`wc-reminder-radio ${
                          selected ? "selected" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="wc-reminder-help">
              재알림은 한 번에 하나만 예약돼요.
              이미 예약이 있으면 새 시각으로 바뀌어요.
              공개 알림 동의와는 별개예요.
            </p>

            {existingReminder && selectedMinutes !== null && (
              <p className="wc-reminder-replace">
                기존 재알림이 새 예약으로 교체돼요.
              </p>
            )}

            <button
              ref={sheetButtonRef}
              type="button"
              className="wc-sheet-submit"
              onClick={handleSaveReminder}
              disabled={reminderLoading}
            >
              {reminderLoading
                ? "처리 중..."
                : "예약하기"}
            </button>
          </section>
        </div>
      )}

      {/* AL-09 알림 오류 안내 */}
      {sheetType === "error" && (
        <div
          className="wc-sheet-overlay"
          onClick={closeSheet}
        >
          <section
            className="wc-sheet wc-error-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wc-error-title"
            aria-describedby="wc-error-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wc-sheet-handle" />

            <div className="wc-error-icon">
              <BellOff size={22} strokeWidth={1.8} />
            </div>

            <h2
              id="wc-error-title"
              className="wc-error-title"
            >
              알림을 켤 수 없어요
            </h2>

            <p
              id="wc-error-description"
              className="wc-error-description"
            >
              {ERROR_CONTENT[errorType].description}
            </p>

            <div className="wc-error-notice">
              알림 없이도 걱정 맡기기와 다음 날 확인은
              그대로 할 수 있어요. 켜지 않아도 핵심
              기능은 모두 이용 가능해요.
            </div>

            <button
              ref={sheetButtonRef}
              type="button"
              className="wc-sheet-submit"
              onClick={closeSheet}
            >
              알림 없이 계속하기
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default WorryComplete;
