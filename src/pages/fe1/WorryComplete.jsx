
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, ShieldCheck } from "lucide-react";

import "./WorryComplete.css";

// 서버의 UTC 공개 시각을 한국 시간으로 표시
const formatPublishAt = (publishAt) => {
  if (!publishAt) return "공개 예정 시간을 확인할 수 없어요";

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

function WorryComplete() {
  const navigate = useNavigate();
  const location = useLocation();

  // S-05에서 전달받은 서버 응답
  const { worryId, publishAt, status } = location.state ?? {};

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

  const handleHome = () => {
    navigate("/", { replace: true });
  };

  const handleNewWorry = () => {
    navigate("/worry-input", {
      replace: true,
    });
  };

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
        <button
          type="button"
          className="wc-home-button"
          onClick={handleHome}
        >
          홈으로
        </button>

        <button
          type="button"
          className="wc-new-button"
          onClick={handleNewWorry}
        >
          새 걱정 맡기기
        </button>

        <button
          type="button"
          className="wc-reminder-button"
          disabled
          title="알림 예약 기능은 준비 중이에요"
        >
          조금 뒤에 다시 알려주세요
        </button>
      </footer>
    </div>
  );
}

export default WorryComplete;
