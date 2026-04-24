import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";

type AuthContextType = {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // carregar usuário salvo
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    // PARA TESTES, USE "http://localhost:8000/api/login"
    // EM PRODUÇÃO, USE "/api/login"
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Usuário ou senha inválidos");
    }

    const data = await response.json();
    const userFromBackend = data.user;
    
    // Mapear os dados do backend para a interface User do frontend
    const mappedUser: User = {
      ...userFromBackend,
      id: userFromBackend.id || userFromBackend.username,
      profile: userFromBackend.profile || "servidor",
      sector: userFromBackend.sector || "Geral",
      name: userFromBackend.name || userFromBackend.username || "Usuário"
    };

    setCurrentUser(mappedUser);
    localStorage.setItem("user", JSON.stringify(mappedUser));
    localStorage.setItem("token", data.token);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth fora do AuthProvider");
  return context;
}