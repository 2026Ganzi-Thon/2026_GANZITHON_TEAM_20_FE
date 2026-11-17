
import api from "./client";

// 기본 공개 시각 조회
export const getDefaultPublication = async () => {
  const response = await api.get(
    "/worry-publication/default",
    {
      params: {
        timeZone: "Asia/Seoul",
      },
    }
  );

  return response.data;
};

// 공개 알림 설정 조회
export const getNotificationSettings = async () => {
  const response = await api.get(
    "/notifications/settings"
  );

  return response.data;
};

// 공개 알림 동의 변경
export const updatePublicationNotification = async (
  enabled
) => {
  const response = await api.put(
    "/notifications/publication",
    { enabled }
  );

  return response.data;
};

// 예약된 재알림 조회
export const getReminder = async () => {
  const response = await api.get(
    "/notifications/reminder"
  );

  return response.data;
};

// 예약된 재알림 취소
export const cancelReminder = async () => {
  const response = await api.delete(
    "/notifications/reminder"
  );

  return response.data;
};

// 모든 알림 끄기
export const disableAllNotifications = async () => {
  const response = await api.delete(
    "/notifications/settings"
  );

  return response.data;
};

// 금고 전체 삭제
// 204 응답 여부를 확인할 수 있도록 전체 응답 반환
export const deleteVault = async () => {
  return api.delete("/vault");
};
