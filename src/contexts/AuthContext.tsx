import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { API_BASE_URL } from "../config/api";
import { setupSessionExpiredListener } from "../utils/axiosInterceptor";

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
  position?: string;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  role: string;
  modules?: string[];
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LoginResponse {
  success: boolean;
  firstLogin?: boolean;
  newPassword?: string;
  error?: string;
  errorCode?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null; // Mantido para compatibilidade (aponta para accessToken)
  accessToken: string | null;
  refreshToken: string | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  isLoading: boolean;
  completeFirstLogin: () => void;
  updateUser: (userData: Partial<User>, newToken?: string) => void;
  refreshUser: () => Promise<void>;
  isImpersonating: boolean;
  impersonate: (userId: string) => Promise<void>;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(
    () => !!sessionStorage.getItem("originalAccessToken")
  );

  // Alias para compatibilidade com código existente
  const token = accessToken;

  // Detectar se está em modo demo
  // Modo demo é ativado APENAS quando:
  // 1. A variável de ambiente VITE_DEMO_MODE está definida como 'true'
  // 2. OU quando o hostname contém 'demo' ou 'github.io' (ambientes de demonstração)
  // Em produção normal (alya.sistemas.viverdepj.com.br), NÃO é modo demo
  const isDemoMode =
    typeof window !== "undefined" &&
    (import.meta.env.VITE_DEMO_MODE === "true" ||
      window.location.hostname.includes("github.io") ||
      window.location.hostname.includes("demo") ||
      window.location.hostname.includes("demo."));

  // Função auxiliar para usar storage correto
  const getStorage = () => (isDemoMode ? sessionStorage : localStorage);

  useEffect(() => {
    // Verificar se há tokens salvos (usando storage correto baseado no modo)
    const storage = getStorage();
    const savedAccessToken = storage.getItem("accessToken");
    const savedRefreshToken = storage.getItem("refreshToken");

    // Migração: Se existir 'authToken' antigo, migrar para novos campos
    const oldToken = storage.getItem("authToken");
    if (oldToken && !savedAccessToken) {
      storage.setItem("accessToken", oldToken);
      storage.removeItem("authToken");
      verifyToken(oldToken);
    } else if (savedAccessToken) {
      setAccessToken(savedAccessToken);
      setRefreshToken(savedRefreshToken);
      verifyToken(savedAccessToken);
    } else {
      setIsLoading(false);
    }

    // Escutar evento de sessão expirada do Axios Interceptor
    const cleanup = setupSessionExpiredListener(() => {
      console.log("[AuthContext] Sessão expirada detectada pelo interceptor");
      logout();
    });

    return cleanup;
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAccessToken(tokenToVerify);
      } else {
        // Token inválido, remover do storage
        const storage = getStorage();
        storage.removeItem("accessToken");
        storage.removeItem("refreshToken");
        storage.removeItem("authToken"); // Limpar token antigo também
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
      }
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      const storage = getStorage();
      storage.removeItem("accessToken");
      storage.removeItem("refreshToken");
      storage.removeItem("authToken");
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string,
  ): Promise<LoginResponse> => {
    try {
      // Garantir que o Service Worker está pronto (se estiver em modo demo)
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const isDemoMode =
          window.location.hostname.includes("github.io") ||
          window.location.hostname === "alya.fercarvalho.com" ||
          window.location.hostname.includes("demo");
        if (isDemoMode) {
          try {
            await navigator.serviceWorker.ready;
            console.log("[AuthContext] Service Worker está pronto");
          } catch (e) {
            console.warn("[AuthContext] Service Worker não está pronto:", e);
          }
        }
      }

      console.log("[AuthContext] Tentando login:", {
        username,
        apiUrl: `${API_BASE_URL}/auth/login`,
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("[AuthContext] Resposta recebida:", {
        ok: response.ok,
        status: response.status,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[AuthContext] Dados recebidos:", {
          success: data.success,
          hasUser: !!data.user,
          hasAccessToken: !!data.accessToken,
          hasRefreshToken: !!data.refreshToken,
          hasOldToken: !!data.token,
        });

        // Suporte a ambos os formatos (novo e antigo)
        const receivedAccessToken = data.accessToken || data.token;
        const receivedRefreshToken = data.refreshToken;

        // Se for primeiro login, NÃO atualizar o estado ainda - esperar o modal ser fechado
        const storage = getStorage();
        if (data.firstLogin && data.newPassword) {
          // Guardar tokens temporariamente mas não atualizar estado do usuário ainda
          storage.setItem("accessToken", receivedAccessToken);
          if (receivedRefreshToken) {
            storage.setItem("refreshToken", receivedRefreshToken);
          }
          storage.setItem("pendingFirstLogin", "true");

          return {
            success: true,
            firstLogin: true,
            newPassword: data.newPassword,
          };
        }

        // Login normal: atualizar estado imediatamente
        if (data.success && data.user && receivedAccessToken) {
          setUser(data.user);
          setAccessToken(receivedAccessToken);
          setRefreshToken(receivedRefreshToken);
          storage.setItem("accessToken", receivedAccessToken);
          if (receivedRefreshToken) {
            storage.setItem("refreshToken", receivedRefreshToken);
          }
          storage.removeItem("pendingFirstLogin");
          storage.removeItem("authToken"); // Limpar token antigo

          return {
            success: true,
            firstLogin: false,
          };
        } else {
          console.error("[AuthContext] Resposta inválida:", data);
          return {
            success: false,
          };
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Erro HTTP ${response.status}` };
        }
        console.error("[AuthContext] Erro no login:", errorData);
        return {
          success: false,
          error: errorData.error || 'Erro ao fazer login',
          errorCode: errorData.errorCode,
          message: errorData.message,
        };
      }
    } catch (error: any) {
      console.error("[AuthContext] Erro ao fazer login:", error);
      if (error.name === "AbortError") {
        return {
          success: false,
          error:
            "Timeout: O servidor não respondeu a tempo. Verifique se o servidor está rodando.",
        };
      }
      return {
        success: false,
        error: "Erro de conexão com o servidor",
      };
    }
  };

  const completeFirstLogin = async () => {
    // Após o modal ser fechado, verificar o token e atualizar o estado
    const storage = getStorage();
    const savedAccessToken = storage.getItem("accessToken");
    if (savedAccessToken) {
      await verifyToken(savedAccessToken);
      storage.removeItem("pendingFirstLogin");
    }
  };

  const logout = async () => {
    try {
      // Chamar endpoint de logout do backend para revogar refreshToken
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error("[AuthContext] Erro ao fazer logout:", error);
      // Continuar com logout local mesmo se falhar no backend
    } finally {
      // Limpar estado local
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      const storage = getStorage();
      storage.removeItem("accessToken");
      storage.removeItem("refreshToken");
      storage.removeItem("authToken"); // Limpar token antigo também
      storage.removeItem("pendingFirstLogin");
    }
  };

  const updateUser = (userData: Partial<User>, newToken?: string) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
    if (newToken) {
      setAccessToken(newToken);
      const storage = getStorage();
      storage.setItem("accessToken", newToken);
    }
  };

  const refreshUser = async () => {
    const storage = getStorage();
    const savedAccessToken = storage.getItem("accessToken");
    if (savedAccessToken) {
      await verifyToken(savedAccessToken);
    }
  };

  const impersonate = async (userId: string) => {
    if (!accessToken) return;
    const response = await fetch(`${API_BASE_URL}/admin/impersonate/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Erro ao impersonar usuário");

    // Salvar token original antes de trocar
    sessionStorage.setItem("originalAccessToken", accessToken);
    if (refreshToken) sessionStorage.setItem("originalRefreshToken", refreshToken);

    const storage = getStorage();
    storage.setItem("accessToken", data.token);
    storage.removeItem("refreshToken");

    setUser(data.user);
    setAccessToken(data.token);
    setRefreshToken(null);
    setIsImpersonating(true);

    // Sinalizar para App.tsx resetar a aba ativa
    window.dispatchEvent(new CustomEvent("auth:impersonation-changed"));
  };

  const stopImpersonating = () => {
    const originalToken = sessionStorage.getItem("originalAccessToken");
    const originalRefresh = sessionStorage.getItem("originalRefreshToken");
    if (!originalToken) return;

    sessionStorage.removeItem("originalAccessToken");
    sessionStorage.removeItem("originalRefreshToken");

    const storage = getStorage();
    storage.setItem("accessToken", originalToken);
    if (originalRefresh) storage.setItem("refreshToken", originalRefresh);
    else storage.removeItem("refreshToken");

    setAccessToken(originalToken);
    setRefreshToken(originalRefresh);
    setIsImpersonating(false);
    verifyToken(originalToken);

    // Sinalizar para App.tsx resetar a aba ativa
    window.dispatchEvent(new CustomEvent("auth:impersonation-changed"));
  };

  const value: AuthContextType = {
    user,
    token,
    accessToken,
    refreshToken,
    login,
    logout,
    isLoading,
    completeFirstLogin,
    updateUser,
    refreshUser,
    isImpersonating,
    impersonate,
    stopImpersonating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
