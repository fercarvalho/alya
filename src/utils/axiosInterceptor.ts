/**
 * Axios Interceptor para Refresh Token Automático
 * Implementação baseada em REFRESH-TOKENS-GUIDE.md
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/api";

// Flag para evitar múltiplas tentativas simultâneas de refresh
let isRefreshing = false;
// Fila de requisições que falharam durante o refresh
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// Detectar modo demo (igual ao AuthContext)
const isDemoMode =
  typeof window !== "undefined" &&
  (import.meta.env.VITE_DEMO_MODE === "true" ||
    window.location.hostname.includes("github.io") ||
    window.location.hostname.includes("demo") ||
    window.location.hostname.includes("demo."));

// Usar storage correto baseado no modo
const getStorage = () => (isDemoMode ? sessionStorage : localStorage);

/**
 * Processa a fila de requisições pendentes após refresh
 */
const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Renova o accessToken usando o refreshToken
 */
const refreshAccessToken = async (): Promise<string> => {
  const storage = getStorage();
  const refreshToken = storage.getItem("refreshToken");

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  try {
    console.log("[Axios Interceptor] Renovando accessToken...");

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    if (response.data.success) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        response.data;

      // Atualizar tokens no storage
      storage.setItem("accessToken", newAccessToken);
      if (newRefreshToken) {
        storage.setItem("refreshToken", newRefreshToken);
      }

      console.log("[Axios Interceptor] ✅ AccessToken renovado com sucesso");
      return newAccessToken;
    } else {
      throw new Error("Token refresh failed");
    }
  } catch (error) {
    console.error("[Axios Interceptor] ❌ Erro ao renovar token:", error);

    // Limpar tokens inválidos
    storage.removeItem("accessToken");
    storage.removeItem("refreshToken");
    storage.removeItem("authToken"); // Limpar token antigo também

    throw error;
  }
};

/**
 * Interceptor de Request: Adiciona accessToken automaticamente
 */
axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const storage = getStorage();
    const accessToken = storage.getItem("accessToken");

    // Adicionar token se existir e não for request de login/refresh
    if (
      accessToken &&
      !config.url?.includes("/auth/login") &&
      !config.url?.includes("/auth/refresh")
    ) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

/**
 * Interceptor de Response: Renova token automaticamente em caso de 401
 */
axios.interceptors.response.use(
  (response: any) => {
    // Sucesso: apenas retornar response
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Se erro 401 (Unauthorized) e não é retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Não tentar refresh em endpoints de autenticação
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/verify")
      ) {
        return Promise.reject(error);
      }

      // Se já está renovando, adicionar à fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Marcar como retry para evitar loop infinito
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();

        // Processar fila de requisições pendentes
        processQueue(null, newAccessToken);

        // Atualizar header da requisição original
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retentar requisição original
        return axios(originalRequest);
      } catch (refreshError) {
        // Falha ao renovar: processar fila com erro
        processQueue(refreshError, null);

        // Redirecionar para login
        console.warn(
          "[Axios Interceptor] ⚠️ Sessão expirada. Redirecionando para login...",
        );

        // Disparar evento customizado para AuthContext tratar
        window.dispatchEvent(new CustomEvent("auth:session-expired"));

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Outros erros: apenas rejeitar
    return Promise.reject(error);
  },
);

/**
 * Listener para evento de sessão expirada
 * O AuthContext deve escutar este evento e fazer logout
 */
export const setupSessionExpiredListener = (onSessionExpired: () => void) => {
  window.addEventListener("auth:session-expired", onSessionExpired);

  // Retornar função de cleanup
  return () => {
    window.removeEventListener("auth:session-expired", onSessionExpired);
  };
};

export default axios;
