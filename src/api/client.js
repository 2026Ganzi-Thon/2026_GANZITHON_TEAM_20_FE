import axios from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
});

const UNSAFE = ["post", "put", "patch", "delete"];

let csrf = null;
let csrfPromise = null;

async function fetchCsrf() {
  if (!csrfPromise) {
    csrfPromise = api
      .get("/csrf")
      .then(({ data }) => {
        csrf = data;
        return data;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

export function clearCsrf() {
  csrf = null;
}

// POST, PUT, PATCH, DELETE 요청에 CSRF 토큰 첨부
api.interceptors.request.use(async (config) => {
  if (UNSAFE.includes(config.method)) {
    const { token, headerName } =
      csrf ?? (await fetchCsrf());

    config.headers[headerName] = token;
  }

  return config;
});

// 게스트 세션 발급 및 CSRF 오류 처리
api.interceptors.response.use(
  async (response) => {
    if (
      response.config.url === "/guest-sessions" &&
      response.config.method === "post"
    ) {
      clearCsrf();
      await fetchCsrf();
    }

    return response;
  },
  async (error) => {
    const { config, response } = error;

    if (
      config &&
      response?.status === 403 &&
      response.data?.code === "CSRF_REJECTED" &&
      !config._csrfRetried
    ) {
      config._csrfRetried = true;
      clearCsrf();

      await fetchCsrf();

      return api(config);
    }

    return Promise.reject(error);
  }
);

export const errorCode = (error) =>
  error.response?.data?.code ?? null;

export default api;