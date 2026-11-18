
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
import useNightTheme from "./hooks/useNightTheme";

import "./styles/colors.css";

// 세션 확인 및 화면 접근 제어
function AppRoutes() {
  const location = useLocation();

  const [guestCheck, setGuestCheck] = useState({
    pathname: null,
    retryCount: 0,
    status: "CHECKING",
  });

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    checkGuest()
      .then((status) => {
        if (active) {
          setGuestCheck({
            pathname: location.pathname,
            retryCount,
            status,
          });
        }
      })
      .catch((error) => {
        console.error("게스트 세션 확인 실패:", error);

        if (active) {
          setGuestCheck({
            pathname: location.pathname,
            retryCount,
            status: "ERROR",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [location.pathname, retryCount]);

  const guestStatus =
    guestCheck.pathname === location.pathname &&
    guestCheck.retryCount === retryCount
      ? guestCheck.status
      : "CHECKING";

  // 세션 확인 중
  if (guestStatus === "CHECKING") {
    return (
      <div
        style={{
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        금고를 확인하고 있어요...
      </div>
    );
  }

  // 서버 연결 오류
  if (guestStatus === "ERROR") {
    return (
      <div
        style={{
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <p>서버에 연결할 수 없어요.</p>

        <button
          type="button"
          onClick={() =>
            setRetryCount((count) => count + 1)
          }
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
      return (
        <Navigate
          to="/start?mode=restart"
          replace
        />
      );
    }

    return <Start />;
  }

  // 세션이 유효한 사용자
  return (
    <Routes>
      <Route
        path="/start"
        element={<Navigate to="/" replace />}
      />

      <Route
        path="/worry-input"
        element={<WorryInput />}
      />

      <Route
        path="/worry-confirm"
        element={<WorryTime />}
      />

      <Route
        path="/worry-analysis"
        element={<WorryAnalysis />}
      />

      <Route
        path="/worry-complete"
        element={<WorryComplete />}
      />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/records"
          element={<Records />}
        />
        <Route
          path="/settings"
          element={<Settings />}
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

function App() {
  const isNight = useNightTheme();

  return (
    <div
      className={
        isNight ? "theme-night" : "theme-morning"
      }
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}

export default App;
