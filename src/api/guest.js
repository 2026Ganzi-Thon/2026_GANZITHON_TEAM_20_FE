import { api, errorCode } from "./client";

// 현재 게스트 세션 확인
export async function checkGuest() {
  try {
    await api.get("/guest-sessions/current");
    return "READY";
  } catch (error) {
    const code = errorCode(error);

    if (code === "GUEST_SESSION_REQUIRED") {
      return "NEED_START";
    }

    if (code === "GUEST_SESSION_INVALID") {
      return "INVALID";
    }

    throw error;
  }
}

// 처음 시작하기
export const startGuest = () =>
  api.post("/guest-sessions", {
    mode: "START",
  });

// 만료된 세션에서 새로 시작하기
export const restartGuest = () =>
  api.post("/guest-sessions", {
    mode: "RESTART",
  });