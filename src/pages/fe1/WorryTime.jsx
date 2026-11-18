
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { submitWorry } from "../../api/worry";
import "./WorryTime.css";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const DEFAULT_TIME_STORAGE_KEY =
  "nightvault-default-publication-time";

const pad = (value) => String(value).padStart(2, "0");

// 설정 화면에서 저장한 기본 공개 시간 조회
const getSavedDefaultTime = () => {
  try {
    const saved = localStorage.getItem(
      DEFAULT_TIME_STORAGE_KEY
    );

    if (/^([01]\d|2[0-3]):00$/.test(saved ?? "")) {
      const [hour, minute] = saved.split(":").map(Number);

      return { hour, minute };
    }
  } catch {
    // 저장소에 접근할 수 없는 경우 기본값 사용
  }

  return { hour: 8, minute: 0 };
};

// 현재부터 9시간 이후의 첫 기본 공개 시각
const getDefaultPublishDate = () => {
  const minimum = new Date(Date.now() + 9 * HOUR);
  const result = new Date(minimum);

  const { hour, minute } = getSavedDefaultTime();

  result.setHours(hour, minute, 0, 0);

  if (result < minimum) {
    result.setDate(result.getDate() + 1);
  }

  return result;
};

// 날짜 표시
const formatDate = (date) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);

const toDateKey = (date) =>
  [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");

const sameDay = (a, b) => toDateKey(a) === toDateKey(b);

// 달력 날짜 생성
const getDays = (year, month) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const cells = Array(first.getDay()).fill(null);

  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(year, month, day));
  }

  return cells;
};

function WorryTime() {
  const navigate = useNavigate();
  const location = useLocation();

  // S-03에서 전달받은 입력값
  const inputData = location.state ?? {};

  // 공개 날짜 및 시간
  const [selectedDate, setSelectedDate] = useState(() => {
    if (inputData.publishAt) {
      const restored = new Date(inputData.publishAt);

      if (!Number.isNaN(restored.getTime())) {
        return restored;
      }
    }

    return getDefaultPublishDate();
  });

  // 달력 표시 여부
  const [calendarOpen, setCalendarOpen] = useState(false);

  // 달력에 표시할 월
  const [calendarMonth, setCalendarMonth] = useState(
    () =>
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      )
  );

  // 공개 알림 API 미연동: 항상 OFF
  const notificationEnabled = false;

  // 등록 진행 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // 같은 제출의 중복 등록 방지
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  // 분석 문맥 UUID (브라우저 메모리에만 유지)
  const analysisContextRef = useRef(crypto.randomUUID());

  // 빠른 중복 클릭 방지
  const submittingRef = useRef(false);

  // 현재 시각 갱신
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  // 공개 시간 범위
  const minDate = useMemo(
    () => new Date(now + 9 * HOUR),
    [now]
  );

  const maxDate = useMemo(
    () => new Date(now + 30 * DAY),
    [now]
  );

  const isWithinRange = (date) =>
    date >= minDate && date <= maxDate;

  // 현재 선택된 시간
  const period =
    selectedDate.getHours() < 12 ? "오전" : "오후";

  const displayHour =
    selectedDate.getHours() % 12 || 12;

  const minute = selectedDate.getMinutes();

  // 입력값이 실제로 변경되었을 때만 새 제출 키 사용
  const resetSubmission = () => {
    if (submitted || submittingRef.current) {
      return false;
    }

    idempotencyKeyRef.current = crypto.randomUUID();
    analysisContextRef.current = crypto.randomUUID();

    setSubmitError("");
    return true;
  };

  // 시간 변경
  const updateTime = (nextPeriod, nextHour, nextMinute) => {
    if (isSubmitting || submitted) return;

    const hour24 =
      (nextHour % 12) +
      (nextPeriod === "오후" ? 12 : 0);

    const nextDate = new Date(selectedDate);
    nextDate.setHours(hour24, nextMinute, 0, 0);

    if (
      nextDate.getTime() !== selectedDate.getTime() &&
      isWithinRange(nextDate)
    ) {
      resetSubmission();
      setSelectedDate(nextDate);
    }
  };

  // 날짜 변경
  const updateDate = (date) => {
    if (isSubmitting || submitted) return;

    const nextDate = new Date(date);

    nextDate.setHours(
      selectedDate.getHours(),
      selectedDate.getMinutes(),
      0,
      0
    );

    if (isWithinRange(nextDate)) {
      if (nextDate.getTime() !== selectedDate.getTime()) {
        resetSubmission();
        setSelectedDate(nextDate);
      }
    } else {
      // 기존 선택 시간이 허용 범위를 벗어나면
      // 설정 화면에서 저장한 기본 공개 시간 사용
      const defaultTime = new Date(date);
      const { hour, minute } = getSavedDefaultTime();

      defaultTime.setHours(hour, minute, 0, 0);

      if (isWithinRange(defaultTime)) {
        if (
          defaultTime.getTime() !== selectedDate.getTime()
        ) {
          resetSubmission();
          setSelectedDate(defaultTime);
        }
      }
    }

    setCalendarOpen(false);
  };

  // 달력 월 변경
  const changeMonth = (amount) => {
    setCalendarMonth((prev) => {
      return new Date(
        prev.getFullYear(),
        prev.getMonth() + amount,
        1
      );
    });
  };

  const calendarDays = getDays(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth()
  );

  const canSubmit =
    isWithinRange(selectedDate) &&
    !isSubmitting &&
    !submitted;

  // S-03으로 돌아가기
  const handleBack = () => {
    if (isSubmitting || submitted) return;

    navigate("/worry-input", {
      state: {
        ...inputData,
        publishAt: selectedDate.toISOString(),
        notificationEnabled,
      },
    });
  };

  // 걱정 접수 API
  const handleSubmit = async () => {
    if (!canSubmit || submittingRef.current) return;

    // S-03 입력값 검증
    if (
      !inputData.worry?.trim() ||
      !Number.isInteger(inputData.anxietyLevel) ||
      inputData.anxietyLevel < 1 ||
      inputData.anxietyLevel > 5
    ) {
      navigate("/worry-input", {
        replace: true,
        state: {
          ...inputData,
          publishAt: selectedDate.toISOString(),
          notificationEnabled,
        },
      });

      return;
    }

    // 선택 메모 검증
    if ((inputData.tomorrowCheck ?? "").length > 100) {
      setSubmitError(
        "내일 확인할 내용은 100자 이내로 입력해 주세요."
      );
      return;
    }

    // 제출 직전 시간 재검증
    const currentTime = Date.now();
    const selectedTime = selectedDate.getTime();

    if (
      selectedTime < currentTime + 9 * HOUR ||
      selectedTime > currentTime + 30 * DAY
    ) {
      setSubmitError(
        "선택한 공개 시간을 다시 확인해 주세요."
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    // 실제 openapi.yaml의 WorryInput 형식
    const payload = {
      text: inputData.worry.trim(),
      anxiety: inputData.anxietyLevel,
      ...(inputData.tomorrowCheck?.trim()
        ? { memo: inputData.tomorrowCheck.trim() }
        : {}),
      publishAt: selectedDate.toISOString(),
    };

    try {
      const result = await submitWorry(
        payload,
        idempotencyKeyRef.current,
        analysisContextRef.current
      );

      // 응답 구조
      const responseData = result?.data ?? result;

      const requestId = responseData?.requestId;

      if (!requestId) {
        throw new Error(
          "서버에서 요청 ID를 받지 못했어요."
        );
      }

      // 202: 신규 접수
      // 200: 동일 키로 이미 접수된 요청
      setSubmitted(true);

      // S-05 AI 분석 중 화면으로 이동
      navigate("/worry-analysis", {
        replace: true,
        state: {
          requestId,
          analysisContext: analysisContextRef.current,
          retryPayload: payload,
        },
      });
    } catch (error) {
      console.error("걱정 접수 실패:", {
        status: error.response?.status,
        code:
          error.response?.data?.error?.code ??
          error.response?.data?.code,
      });

      const serverMessage =
        error.response?.data?.error?.message ??
        error.response?.data?.message;

      setSubmitError(
        serverMessage ||
          error.message ||
          "걱정을 접수하지 못했어요. 다시 시도해 주세요."
      );

      // 응답 유실 가능성이 있으므로 실패해도
      // Idempotency-Key를 자동 변경하지 않음
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // 시간 선택기
  const renderPickerColumn = (type) => {
    let current;
    let previous;
    let next;

    // 오전 / 오후
    if (type === "period") {
      current = period;

      if (period === "오전") {
        previous = null;
        next = "오후";
      } else {
        previous = "오전";
        next = null;
      }
    }

    // 시
    else if (type === "hour") {
      current = displayHour;

      previous =
        displayHour === 1 ? 12 : displayHour - 1;

      next =
        displayHour === 12 ? 1 : displayHour + 1;
    }

    // 분
    else {
      current = pad(minute);
      previous = pad((minute + 50) % 60);
      next = pad((minute + 10) % 60);
    }

    const handleChange = (direction) => {
      if (type === "period") {
        const nextPeriod =
          period === "오전" ? "오후" : "오전";

        updateTime(
          nextPeriod,
          displayHour,
          minute
        );
      } else if (type === "hour") {
        const nextHour =
          direction === -1
            ? displayHour === 1
              ? 12
              : displayHour - 1
            : displayHour === 12
              ? 1
              : displayHour + 1;

        updateTime(
          period,
          nextHour,
          minute
        );
      } else {
        const nextMinute =
          (minute + direction * 10 + 60) % 60;

        updateTime(
          period,
          displayHour,
          nextMinute
        );
      }
    };

    return (
      <div
        className="wt-picker-column"
        key={type}
      >
        {previous !== null ? (
          <button
            type="button"
            className="wt-picker-adjacent"
            onClick={() => handleChange(-1)}
            disabled={isSubmitting || submitted}
          >
            {previous}
          </button>
        ) : (
          <div className="wt-picker-adjacent" />
        )}

        <div className="wt-picker-selected">
          {current}
        </div>

        {next !== null ? (
          <button
            type="button"
            className="wt-picker-adjacent"
            onClick={() => handleChange(1)}
            disabled={isSubmitting || submitted}
          >
            {next}
          </button>
        ) : (
          <div className="wt-picker-adjacent" />
        )}
      </div>
    );
  };

  return (
    <div className="wt-page">
      {/* 상단 헤더 */}
      <header className="wt-header">
        <button
          type="button"
          className="wt-back"
          onClick={handleBack}
          aria-label="뒤로가기"
          disabled={isSubmitting || submitted}
        >
          <ChevronLeft
            size={25}
            strokeWidth={2}
          />
        </button>

        <h1>시간 설정</h1>
      </header>

      <main className="wt-content">
        {/* 공개 시간 안내 */}
        <section className="wt-intro">
          <h2>언제 열어볼까요?</h2>
          <p>지금부터 약 9시간 후에 열려요</p>
        </section>

        {/* 날짜 선택 */}
        <section className="wt-date-section">
          <button
            type="button"
            className="wt-date-trigger"
            onClick={() =>
              setCalendarOpen((open) => !open)
            }
            aria-expanded={calendarOpen}
            disabled={isSubmitting || submitted}
          >
            {formatDate(selectedDate)}
            <ChevronDown size={18} />
          </button>

          {calendarOpen && (
            <div className="wt-calendar">
              <div className="wt-calendar-header">
                <strong>
                  {calendarMonth.getFullYear()}년{" "}
                  {calendarMonth.getMonth() + 1}월
                </strong>

                <div className="wt-calendar-arrows">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    aria-label="이전 달"
                  >
                    <ChevronLeft size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    aria-label="다음 달"
                  >
                    <ChevronRight size={19} />
                  </button>
                </div>
              </div>

              <div className="wt-calendar-grid">
                {[
                  "일",
                  "월",
                  "화",
                  "수",
                  "목",
                  "금",
                  "토",
                ].map((day) => (
                  <span
                    className="wt-weekday"
                    key={day}
                  >
                    {day}
                  </span>
                ))}

                {calendarDays.map((date, index) => {
                  if (!date) {
                    return (
                      <span
                        key={`blank-${index}`}
                      />
                    );
                  }

                  const startOfDay = new Date(date);
                  startOfDay.setHours(0, 0, 0, 0);

                  const endOfDay = new Date(date);
                  endOfDay.setHours(
                    23,
                    59,
                    59,
                    999
                  );

                  const available =
                    endOfDay >= minDate &&
                    startOfDay <= maxDate;

                  return (
                    <button
                      type="button"
                      key={toDateKey(date)}
                      disabled={
                        !available ||
                        isSubmitting ||
                        submitted
                      }
                      className={
                        sameDay(date, selectedDate)
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        updateDate(date)
                      }
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 시간 선택 */}
        <section className="wt-time-section">
          <div className="wt-time-picker">
            <div className="wt-picker-highlight" />

            {renderPickerColumn("period")}
            {renderPickerColumn("hour")}
            {renderPickerColumn("minute")}
          </div>

          <p className="wt-time-hint">
            공개 시각까지 잠겨 있다가 AI 정리와
            함께 열려요.
          </p>
        </section>

        {/* 공개 알림 - API 연동 전까지 비활성화 */}
        <section className="wt-notification">
          <div className="wt-notification-text">
            <h2>공개되면 알려드릴까요?</h2>

            <p>
              공개 알림 기능은 준비 중이에요.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={false}
            aria-label="공개 알림 (준비 중)"
            className="wt-switch"
            disabled
          >
            <span />
          </button>
        </section>
      </main>

      {/* 하단 버튼 */}
      <footer className="wt-footer">
        {submitError && (
          <p
            className="wt-submit-error"
            role="alert"
          >
            {submitError}
          </p>
        )}

        <button
          type="button"
          className="wt-submit"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitted
            ? "접수 완료"
            : isSubmitting
              ? "금고에 맡기는 중..."
              : "금고에 맡기기"}
        </button>
      </footer>
    </div>
  );
}

export default WorryTime;
