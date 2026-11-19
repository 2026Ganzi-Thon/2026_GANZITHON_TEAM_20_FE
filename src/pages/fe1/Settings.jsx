import { logError } from '../../api/logError.js'

import { useCallback, useEffect, useState } from "react";

import {
  getNotificationSettings,
  updatePublicationNotification,
  getReminder,
  cancelReminder,
  disableAllNotifications,
  deleteVault,
} from "../../api/settings";

import {
  subscribeToPush,
  isPushSupported,
} from "../../api/push";

import "./Settings.css";

const DEFAULT_TIME = "08:00";
const TIMEZONE = "Asia/Seoul";
const TIME_STORAGE_KEY = "nightvault-default-publication-time";

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, "0")}:00`;

  return {
    value,
    label: `${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}:00`,
  };
});

function readSavedTime() {
  try {
    const saved = localStorage.getItem(TIME_STORAGE_KEY);

    if (
      saved &&
      TIME_OPTIONS.some((option) => option.value === saved)
    ) {
      return saved;
    }
  } catch {
    // 브라우저 저장소 접근 불가
  }

  return DEFAULT_TIME;
}

function formatTime(value) {
  const [hour, minute] = String(value || DEFAULT_TIME)
    .split(":")
    .map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "오전 8:00";
  }

  return `${hour < 12 ? "오전" : "오후"} ${
    hour % 12 || 12
  }:${String(minute).padStart(2, "0")}`;
}

function formatReminderTime(value) {
  if (!value) {
    return "예약된 재알림이 없어요.";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "예약 시간을 확인할 수 없어요.";
  }

  return date.toLocaleString("ko-KR", {
    timeZone: TIMEZONE,
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getErrorMessage(error) {
  const status = error?.response?.status;

  if (status === 401) {
    return "게스트 세션이 만료되었어요.";
  }

  if (status === 403) {
    return "요청 권한을 확인하지 못했어요.";
  }

  if (status === 404) {
    return "서버에서 해당 기능을 찾을 수 없어요.";
  }

  if (status === 409) {
    return "현재 요청을 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
  }

  return "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function getPushErrorMessage(error) {
  if (error?.message === "PUSH_DENIED") {
    return "알림 권한이 허용되지 않았어요. 브라우저 설정에서 알림 권한을 확인해 주세요.";
  }

  if (error?.message === "PUSH_UNSUPPORTED") {
    return "현재 브라우저에서는 푸시 알림을 사용할 수 없어요.";
  }

  if (error?.message === "VAPID_KEY_MISSING") {
    return "서버의 푸시 알림 공개키를 확인할 수 없어요.";
  }

  return getErrorMessage(error);
}

function Settings() {
  const [defaultTime, setDefaultTime] = useState(readSavedTime);
  const [selectedTime, setSelectedTime] = useState(readSavedTime);

  const [notificationSettings, setNotificationSettings] =
    useState(null);

  const [reminder, setReminder] = useState(null);
  const [reminderError, setReminderError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // 알림 설정 및 재알림 조회
  const refreshNotifications = useCallback(
    async (isActive = () => true) => {
      const [settingsResult, reminderResult] =
        await Promise.allSettled([
          getNotificationSettings(),
          getReminder(),
        ]);

      if (!isActive()) return null;

      const settings =
        settingsResult.status === "fulfilled"
          ? settingsResult.value
          : null;

      const reminderLoaded =
        reminderResult.status === "fulfilled";

      const currentReminder = reminderLoaded
        ? reminderResult.value
        : null;

      setNotificationSettings(settings);

      if (reminderLoaded) {
        setReminder(currentReminder);
        setReminderError("");
      } else {
        setReminderError(
          "재알림 정보를 확인하지 못했어요. 다시 조회해 주세요."
        );
      }

      if (settingsResult.status === "rejected") {
        console.error(
          "공개 알림 설정 조회 실패:",
          logError(settingsResult.reason)
        );
      }

      if (reminderResult.status === "rejected") {
        console.error(
          "재알림 조회 실패:",
          logError(reminderResult.reason)
        );
      }

      if (!settings || !reminderLoaded) {
        return null;
      }

      return {
        settings,
        reminder: currentReminder,
      };
    },
    []
  );

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const result = await refreshNotifications(
          () => active
        );

        if (active && !result) {
          setNotice(
            "일부 알림 정보를 확인하지 못했어요."
          );
        }
      } catch (error) {
        if (active) {
          console.error(
            "알림 설정 조회 실패:", logError(error));
          setNotice(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, [refreshNotifications]);

  // 알림 상태 다시 조회
  const handleRefreshNotifications = async () => {
    if (saving) return;

    setSaving(true);
    setNotice("");

    try {
      const result = await refreshNotifications();

      setNotice(
        result
          ? "알림 상태를 다시 확인했어요."
          : "알림 상태를 확인하지 못했어요. 다시 조회해 주세요."
      );
    } finally {
      setSaving(false);
    }
  };

  // 기본 공개 시간 저장
  const handleSaveTime = () => {
    if (saving) return;

    try {
      localStorage.setItem(
        TIME_STORAGE_KEY,
        selectedTime
      );

      setDefaultTime(selectedTime);
      setTimeModalOpen(false);

      setNotice(
        "기본 공개 시간을 이 브라우저에 저장했어요."
      );
    } catch {
      setNotice(
        "브라우저에 설정을 저장하지 못했어요."
      );
    }
  };

  // 공개 알림 ON/OFF
  const handleToggleNotification = async () => {
    if (saving || !notificationSettings) return;

    const currentlyEnabled = Boolean(
      notificationSettings.publicationEnabled
    );

    setSaving(true);
    setNotice("");

    try {
      if (currentlyEnabled) {
        await updatePublicationNotification(false);
      } else {
        if (!isPushSupported()) {
          throw new Error("PUSH_UNSUPPORTED");
        }

        await subscribeToPush();
        await updatePublicationNotification(true);
      }

      const result = await refreshNotifications();

      setNotice(
        result
          ? currentlyEnabled
            ? "공개 알림을 껐어요."
            : "공개 알림을 켰어요."
          : "변경 요청 후 알림 상태를 확인하지 못했어요. 다시 조회해 주세요."
      );
    } catch (error) {
      console.error(
        "공개 알림 설정 변경 실패:", logError(error));

      setNotice(getPushErrorMessage(error));

      // 부분적으로 변경되었을 수 있으므로 서버 상태 재조회
      await refreshNotifications();
    } finally {
      setSaving(false);
    }
  };

  // 예약된 재알림 취소
  const handleCancelReminder = async () => {
    if (saving || !reminder || reminderError) return;

    setSaving(true);
    setNotice("");

    try {
      await cancelReminder();

      const result = await refreshNotifications();

      setNotice(
        result
          ? "예약된 재알림을 취소했어요."
          : "취소 요청 후 알림 상태를 확인하지 못했어요."
      );
    } catch (error) {
      console.error("재알림 취소 실패:", logError(error));
      setNotice(getErrorMessage(error));

      await refreshNotifications();
    } finally {
      setSaving(false);
    }
  };

  // 서버의 전체 해제는 구독만 제거하므로 재알림도 별도로 취소한다.
  const handleDisableAllNotifications = async () => {
    if (saving || !notificationSettings) return;

    setSaving(true);
    setNotice("");

    try {
      const writes = await Promise.allSettled([
        disableAllNotifications(),
        cancelReminder(),
      ]);
      const result = await refreshNotifications();
      const confirmed =
        writes.every((write) => write.status === "fulfilled") &&
        result &&
        !result.settings.publicationEnabled &&
        result.settings.subscriptionCount === 0 &&
        result.reminder === null;

      setNotice(
        confirmed
          ? "모든 알림을 껐어요."
          : "모든 알림 끄기를 완료하지 못했어요. 상태를 확인한 뒤 다시 시도해 주세요."
      );
    } catch (error) {
      console.error("모든 알림 끄기 실패:", logError(error));
      setNotice(getErrorMessage(error));

      await refreshNotifications();
    } finally {
      setSaving(false);
    }
  };

  // 금고 전체 삭제
  const handleDeleteVault = async () => {
    if (saving) return;

    setSaving(true);
    setNotice("");

    try {
      const response = await deleteVault();

      if (response.status === 204) {
        try {
          localStorage.removeItem(TIME_STORAGE_KEY);
        } catch {
          // 저장소 접근 실패
        }

        window.location.replace("/start");
        return;
      }

      setDeleteModalOpen(false);

      setNotice(
        "삭제 요청의 완료 여부를 확인하지 못했어요. 서버 상태를 확인해 주세요."
      );
    } catch (error) {
      console.error("금고 전체 삭제 실패:", logError(error));
      setNotice(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const notificationEnabled = Boolean(
    notificationSettings?.publicationEnabled
  );

  const subscriptionCount = Number(
    notificationSettings?.subscriptionCount ?? 0
  );

  const notificationAvailable =
    notificationSettings !== null;

  const reminderTime =
    reminder?.sendAt ?? null;

  const hasReminder = Boolean(
    reminder && typeof reminder === "object"
  );

  return (
    <div className="nv-settings">
      <header className="nv-settings-header">
        <h1>설정</h1>
      </header>

      <main className="nv-settings-main">
        {loading && (
          <p className="nv-settings-notice" role="status">
            알림 설정을 불러오고 있어요...
          </p>
        )}

        {/* 공개 시간 */}
        <section className="nv-settings-section">
          <h2 className="nv-settings-section-title">
            공개 시간
          </h2>

          <button
            type="button"
            className="nv-settings-card nv-settings-time-card"
            onClick={() => {
              setSelectedTime(defaultTime);
              setTimeModalOpen(true);
            }}
            disabled={saving}
          >
            <div className="nv-settings-card-content">
              <strong>기본 공개 시간</strong>
              <p>이후 만드는 걱정에만 적용해요.</p>
              <p>이미 맡긴 걱정은 금고에서 개별 변경</p>
            </div>

            <div className="nv-settings-time-right">
              <span>{formatTime(defaultTime)}</span>
              <span
                className="nv-settings-chevron"
                aria-hidden="true"
              >
                ›
              </span>
            </div>
          </button>
        </section>

        {/* 알림 */}
        <section className="nv-settings-section">
          <h2 className="nv-settings-section-title">
            알림
          </h2>

          <div className="nv-settings-card nv-settings-notification-card">
            <div className="nv-settings-card-content">
              <strong>공개 알림</strong>
              <p>공개 시각에 한 번 알려드려요.</p>
              <p>
                끄면 아직 보내지 않은 공개 알림이 취소돼요.
              </p>

              {subscriptionCount === 0 && (
                <p className="nv-settings-coming-soon">
                  이 브라우저의 푸시 알림 연결이 필요할 수 있어요.
                </p>
              )}
            </div>

            <button
              type="button"
              className="nv-settings-switch"
              role="switch"
              aria-checked={notificationEnabled}
              aria-label="공개 알림"
              onClick={handleToggleNotification}
              disabled={!notificationAvailable || saving}
              style={{
                background: notificationEnabled
                  ? "#25243a"
                  : "#9d9fbb",
              }}
            >
              <span
                className="nv-settings-switch-knob"
                style={{
                  transform: notificationEnabled
                    ? "translateX(18px)"
                    : "translateX(0)",
                }}
              />
            </button>
          </div>

          {/* 예약된 재알림 */}
          <div className="nv-settings-card nv-settings-reminder-card">
            <div className="nv-settings-card-content">
              <strong>예약된 재알림</strong>
              <p>
                {reminderError
                  ? reminderError
                  : hasReminder
                    ? reminderTime
                      ? formatReminderTime(reminderTime)
                      : "예약 정보를 확인해 주세요."
                    : "예약된 재알림이 없어요."}
              </p>
            </div>

            <button
              type="button"
              className="nv-settings-cancel"
              onClick={handleCancelReminder}
              disabled={
                !hasReminder ||
                Boolean(reminderError) ||
                saving
              }
            >
              취소
            </button>
          </div>

          <button
            type="button"
            className="nv-settings-primary"
            onClick={handleDisableAllNotifications}
            disabled={!notificationAvailable || saving}
          >
            {saving ? "처리 중..." : "모든 알림 끄기"}
          </button>
        </section>

        {/* 이용·보관 안내 */}
        <section className="nv-settings-section">
          <h2 className="nv-settings-section-title">
            이용·보관 안내
          </h2>

          <div className="nv-settings-info-box">
            <ul>
              <li>
                로그인 없이 이 브라우저에서만
                금고에 접근해요.
              </li>
              <li>
                브라우저 데이터를 지우거나 다른
                기기에서 열면 기존 금고에
                접근하거나 복구하기 어려울 수 있어요.
              </li>
              <li>
                모든 기록은 작성일로부터 30일이
                지나면 자동으로 삭제돼요.
              </li>
              <li>
                파쇄하면 원문뿐 아니라 분석·활동
                기록까지 함께 지워져요.
              </li>
              <li>
                걱정 정리에 외부 AI를 사용해요.
                실제 처리 범위는 운영 조건에
                맞춰 안내해요.
              </li>
            </ul>
          </div>
        </section>

        {/* 금고 전체 삭제 */}
        <section className="nv-settings-section nv-settings-danger-section">
          <h2 className="nv-settings-section-title">
            금고
          </h2>

          <button
            type="button"
            className="nv-settings-primary"
            onClick={() => {
              setNotice("");
              setDeleteModalOpen(true);
            }}
            disabled={saving}
          >
            금고 전체 삭제
          </button>

          <p className="nv-settings-danger-description">
            모든 기록·설정·예약과 이 브라우저의
            게스트 정보를 지워요.
            삭제 후 처음 화면으로 돌아가요.
          </p>
        </section>

        {(!notificationAvailable || reminderError) &&
          !loading && (
            <button
              type="button"
              className="nv-settings-primary"
              onClick={handleRefreshNotifications}
              disabled={saving}
            >
              알림 상태 다시 조회
            </button>
          )}

        {notice && (
          <p className="nv-settings-notice" role="status">
            {notice}
          </p>
        )}
      </main>

      {/* 기본 공개 시간 모달 */}
      {timeModalOpen && (
        <div className="nv-settings-modal-overlay">
          <div
            className="nv-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-time-title"
          >
            <h2 id="settings-time-title">
              기본 공개 시간
            </h2>

            <p>
              앞으로 새로 만드는 걱정에 적용할
              시간을 선택해 주세요.
            </p>

            <p>
              현재는 이 브라우저에 임시 저장돼요.
            </p>

            <label
              className="nv-settings-select-label"
              htmlFor="settings-default-time"
            >
              공개 시간
            </label>

            <select
              id="settings-default-time"
              className="nv-settings-time-select"
              value={selectedTime}
              onChange={(event) =>
                setSelectedTime(event.target.value)
              }
            >
              {TIME_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="nv-settings-modal-primary"
              onClick={handleSaveTime}
              disabled={saving}
            >
              저장
            </button>

            <button
              type="button"
              className="nv-settings-modal-secondary"
              onClick={() => setTimeModalOpen(false)}
              disabled={saving}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 금고 전체 삭제 확인 모달 */}
      {deleteModalOpen && (
        <div className="nv-settings-modal-overlay">
          <div
            className="nv-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-delete-title"
          >
            <h2 id="settings-delete-title">
              금고를 전부 삭제할까요?
            </h2>

            <p>
              모든 걱정 기록과 설정, 예약된 알림,
              이 브라우저의 게스트 정보를 지워요.
              복구할 수 없고 삭제가 끝나면
              처음 화면으로 돌아가요.
            </p>

            <button
              type="button"
              className="nv-settings-modal-primary"
              onClick={handleDeleteVault}
              disabled={saving}
            >
              {saving ? "처리 중..." : "전부 삭제"}
            </button>

            <button
              type="button"
              className="nv-settings-modal-secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={saving}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
