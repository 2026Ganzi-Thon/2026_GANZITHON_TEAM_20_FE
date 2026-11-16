import client from "./client";

// 걱정 접수 API
export const submitWorry = async (
  data,
  idempotencyKey,
  analysisContext
) => {
  const response = await client.post(
    "/worry-requests",
    data,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
        "X-Analysis-Context": analysisContext,
      },
    }
  );

  return response.data;
};

// 걱정 분석 상태 조회 API
export const getWorryRequest = async (
  requestId,
  analysisContext
) => {
  const response = await client.get(
    `/worry-requests/${encodeURIComponent(requestId)}`,
    {
      headers: analysisContext
        ? { "X-Analysis-Context": analysisContext }
        : {},
    }
  );

  return response.data;
};