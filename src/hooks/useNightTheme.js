
import { useEffect, useState } from "react";

// 22:00 이상 또는 06:00 미만이면 나이트 테마
const getIsNight = () => {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
};

export default function useNightTheme() {
  const [isNight, setIsNight] = useState(getIsNight);

  useEffect(() => {
    const updateTheme = () => {
      setIsNight(getIsNight());
    };

    updateTheme();

    // 페이지를 열어둔 상태에서도 자동 전환
    const interval = window.setInterval(updateTheme, 30_000);

    // 다른 탭에서 돌아왔을 때 갱신
    window.addEventListener("focus", updateTheme);

    // 브라우저 탭 활성화 시 갱신
    document.addEventListener(
      "visibilitychange",
      updateTheme
    );

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", updateTheme);
      document.removeEventListener(
        "visibilitychange",
        updateTheme
      );
    };
  }, []);

  return isNight;
}
