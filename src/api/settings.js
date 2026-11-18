
import api from "./client";

// 기본 공개 시각 조회
export const getDefaultPublication = async () => {
  const response = await api.get("/worry-publication/default", {
    params: { timeZone: "Asia/Seoul" },
  });

  return response.data;
};

// 공개 알림 설정 조회
export const getNotificationSettings = async () => {
  const response = await api.get("/notifications/settings");
  return response.data;
};

// 브라우저 푸시 구독 등록
export const registerPushSubscription = async (subscription) => {
  const json = subscription.toJSON();

  const response = await api.put("/notifications/subscription", {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  });

  return response.data;
};

// 공개 알림 동의 변경
export const updatePublicationNotification = async (enabled) => {
  const response = await api.put("/notifications/publication", {
    enabled,
  });

  return response.data;
};

// 예약된 재알림 조회
export const getReminder = async () => {
  const response = await api.get("/notifications/reminder");

  // 예약된 재알림이 없으면 204 No Content
  return response.status === 204 ? null : response.data;
};

// 재알림 예약
export const scheduleReminder = async ({
  worryId,
  endpoint,
  minutes,
}) => {
  const response = await api.put("/notifications/reminder", {
    worryId,
    endpoint,
    minutes,
  });

  return response.data;
};

// 예약된 재알림 취소
export const cancelReminder = async () => {
  const response = await api.delete("/notifications/reminder");
  return response.data;
};

// 모든 알림 끄기
export const disableAllNotifications = async () => {
  const response = await api.delete("/notifications/settings");
  return response.data;
};

// 금고 전체 삭제
export const deleteVault = async () => {
  return api.delete("/vault");
};
