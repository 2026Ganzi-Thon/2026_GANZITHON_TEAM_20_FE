
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./WorryInput.css";

const ANXIETY_OPTIONS = [
  { value: 1, label: "거의 없음" },
  { value: 2, label: "조금" },
  { value: 3, label: "보통" },
  { value: 4, label: "많이" },
  { value: 5, label: "아주 많이" },
];

function WorryInput() {
  const navigate = useNavigate();

  const [worry, setWorry] = useState("");
  const [anxietyLevel, setAnxietyLevel] = useState(null);
  const [tomorrowCheck, setTomorrowCheck] = useState("");

  // 필수 항목 검증
  const isValid =
    worry.trim().length > 0 &&
    worry.length <= 500 &&
    anxietyLevel !== null;

  const handleNext = () => {
    if (!isValid) return;

    // 다음 화면에 입력 데이터 전달
    navigate("/worry-confirm", {
      state: {
        worry: worry.trim(),
        anxietyLevel,
        tomorrowCheck: tomorrowCheck.trim(),
      },
    });
  };

  return (
    <div className="worry-input-page">
      {/* 헤더 */}
      <header className="worry-input-header">
        <button
          type="button"
          className="worry-back-button"
          onClick={() => navigate("/")}
          aria-label="뒤로가기"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>

        <h1>걱정 맡기기</h1>
      </header>

      <main className="worry-input-content">
        {/* 걱정 내용 */}
        <section className="worry-field">
          <label htmlFor="worry-content" className="worry-field-title">
            지금 어떤 걱정이 떠오르나요?
          </label>

          <textarea
            id="worry-content"
            className="worry-textarea"
            placeholder="지금 떠오르는 걱정을 적어주세요"
            value={worry}
            onChange={(e) => setWorry(e.target.value)}
            maxLength={500}
          />

          <div className="worry-character-count">
            {worry.length}/500
          </div>
        </section>

        {/* 불안도 */}
        <section className="worry-field">
          <div className="worry-anxiety-title">
            <h2 className="worry-field-title">지금 불안도</h2>
            <span className="worry-required">필수</span>
          </div>

          <div
            className="worry-anxiety-options"
            role="group"
            aria-label="지금 불안도"
          >
            {ANXIETY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`worry-anxiety-option ${
                  anxietyLevel === option.value ? "selected" : ""
                }`}
                onClick={() => setAnxietyLevel(option.value)}
                aria-pressed={anxietyLevel === option.value}
              >
                <span className="worry-anxiety-number">
                  {option.value}
                </span>

                <span className="worry-anxiety-label">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 내일 확인할 것 */}
        <section className="worry-field">
          <label htmlFor="tomorrow-check" className="worry-field-title">
            내일 확인할 것 (선택)
          </label>

          <input
            id="tomorrow-check"
            type="text"
            className="worry-tomorrow-input"
            placeholder="예) 발표 자료 분량 확인하기"
            value={tomorrowCheck}
            onChange={(e) => setTomorrowCheck(e.target.value)}
            maxLength={100}
          />

          <div className="worry-character-count">
            {tomorrowCheck.length}/100
          </div>
        </section>
      </main>

      {/* 하단 다음 버튼 */}
      <div className="worry-input-footer">
        <button
          type="button"
          className="worry-next-button"
          onClick={handleNext}
          disabled={!isValid}
        >
          다음
        </button>
      </div>
    </div>
  );
}

export default WorryInput;
