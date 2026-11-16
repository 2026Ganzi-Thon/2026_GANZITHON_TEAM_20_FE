
import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Layout from "./layouts/Layout";

import Start from "./pages/fe1/Start";
import Home from "./pages/fe1/Home";
import Records from "./pages/fe2/Records";
import Settings from "./pages/fe1/Settings";
import WorryInput from "./pages/fe1/WorryInput";
import WorryTime from "./pages/fe1/WorryTime";
import WorryAnalysis from "./pages/fe1/WorryAnalysis";
import WorryComplete from "./pages/fe1/WorryComplete";

import { checkGuest } from "./api/guest";

// 세션 확인 및 화면 접근 제어
function AppRoutes() {
  const location = useLocation();

  const [guestStatus, setGuestStatus] = useState("CHECKING");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    setGuestStatus("CHECKING");

    checkGuest()
      .then((status) => {
        if (active) {
          setGuestStatus(status);
        }
      })
      .catch((error) => {
        console.error("게스트 세션 확인 실패:", error);

        if (active) {
          setGuestStatus("ERROR");
        }
      });

    return () => {
      active = false;
    };
  }, [location.pathname, retryCount]);

  // 세션 확인 중
  if (guestStatus === "CHECKING") {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        금고를 확인하고 있어요...
      </div>
    );
  }

  // 서버 연결 오류
  if (guestStatus === "ERROR") {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <p>서버에 연결할 수 없어요.</p>

        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 최초 방문
  if (guestStatus === "NEED_START") {
    if (location.pathname !== "/start") {
      return <Navigate to="/start" replace />;
    }

    return <Start />;
  }

  // 세션 만료 또는 무효
  if (guestStatus === "INVALID") {
    if (
      location.pathname !== "/start" ||
      location.search !== "?mode=restart"
    ) {
      return <Navigate to="/start?mode=restart" replace />;
    }

    return <Start />;
  }

  // 세션이 유효한 사용자
  return (
    <Routes>
      {/* 기존 사용자가 시작 화면에 접근하면 홈으로 이동 */}
      <Route
        path="/start"
        element={<Navigate to="/" replace />}
      />

      {/* 걱정 입력 화면 */}
      <Route
        path="/worry-input"
        element={<WorryInput />}
      />
      <Route path="/worry-confirm" element={<WorryTime />} />
      {/* S-05 AI 분석 중 */}
      <Route path="/worry-analysis" element={<WorryAnalysis />} />
      {/* S-06 봉인 완료 */}
      <Route
        path="/worry-complete"
        element={<WorryComplete />}
      />

      {/* 기존 메인 화면 */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/records" element={<Records />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 정의되지 않은 경로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
