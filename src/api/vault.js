import client from "./client";

/**
 * 홈 화면 금고 요약 조회
 * GET /api/v1/vault/summary
 */
export const getVaultSummary = async () => {
  const response = await client.get("/vault/summary");
  return response.data;
};