
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

import { checkGuest } from "./api/guest";

// 게스트 인증 API 연결 전 임시 화면
function WorryInputPlaceholder() {
  return (
    <div style={{ padding: "40px 24px" }}>
      <h1>걱정 입력 화면</h1>
      <p>이곳에 S-03 걱정 입력 화면을 구현할 예정입니다.</p>
    </div>
  );
}

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

      {/* 걱정 입력 화면 - 임시 */}
      <Route
        path="/worry-input"
        element={<WorryInputPlaceholder />}
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
