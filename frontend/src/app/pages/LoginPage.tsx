import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {currentUser } = useAuth();
    useEffect(() => {
        if (currentUser) {
            navigate("/");
        }
    }, [currentUser]);

  const { login } = useAuth();

  const handleLogin = async (e: any) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Usuário ou senha inválidos");
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header parecido com dashboard */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-green-800">
            Portal IPAJM
          </h1>
          <p className="text-muted-foreground mt-2">
            Acesse com seu usuário de rede
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="text-sm font-medium">Usuário</label>
              <input
                type="text"
                placeholder="seu.login"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-2 rounded-md hover:bg-green-800 transition"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

          </form>
        </div>

        {/* Footer simples */}
        <p className="text-center text-xs text-muted-foreground">
          Portal interno - IPAJM
        </p>

      </div>
    </div>
  );
}