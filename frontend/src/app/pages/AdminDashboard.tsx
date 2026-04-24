import { useEffect, useState } from "react";
import { toast } from "sonner";
// ainda não usado
// import { useAuth } from "../../contexts/AuthContext";
import { AdminContent } from "@/components/AdminContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Role = { id: number; name: string; description: string };
type SectorMapping = { id: number; sector_name: string; role_id: number; role?: Role };
type SystemUser = { id: number; username: string; department: string; sector: string; roles: Role[] };

export function AdminDashboard() {
  // ainda não usado
  // const { currentUser } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [mappings, setMappings] = useState<SectorMapping[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);

  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [newMap, setNewMap] = useState({ sector_name: "", role_id: "" });
  // ainda não usado
  // const token = localStorage.getItem("token");

  const authHeaders = {
    "Content-Type": "application/json",
    // Na API real adicionar Authorization: `Bearer ${token}` se necessário
  };

  useEffect(() => {
    fetchRoles();
    fetchMappings();
    fetchUsers();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles", { headers: authHeaders });
      if (res.ok) setRoles(await res.json());
    } catch { toast.error("Erro ao carregar roles"); }
  };

  const fetchMappings = async () => {
    try {
      const res = await fetch("/api/admin/mappings", { headers: authHeaders });
      if (res.ok) setMappings(await res.json());
    } catch { toast.error("Erro ao carregar mappings"); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: authHeaders });
      if (res.ok) setUsers(await res.json());
    } catch { toast.error("Erro ao carregar usuários"); }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return;
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newRole)
      });
      if (res.ok) {
        toast.success("Role criada com sucesso!");
        fetchRoles();
        setNewRole({ name: "", description: "" });
      } else {
        toast.error("Erro ao criar role");
      }
    } catch { toast.error("Erro de conexão"); }
  };

  const handleDeleteRole = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Role deletada!");
        fetchRoles();
      }
    } catch { toast.error("Erro"); }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMap.sector_name || !newMap.role_id) return;
    try {
      const res = await fetch("/api/admin/mappings", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ sector_name: newMap.sector_name, role_id: parseInt(newMap.role_id) })
      });
      if (res.ok) {
        toast.success("Mapeamento criado com sucesso!");
        fetchMappings();
        setNewMap({ sector_name: "", role_id: "" });
      } else {
        toast.error("Erro ao criar mapeamento");
      }
    } catch { toast.error("Erro de conexão"); }
  };

  const handleDeleteMapping = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/mappings/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Mapeamento deletado!");
        fetchMappings();
      }
    } catch { toast.error("Erro"); }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie Permissões, Perfis e o Conteúdo dinâmico do Portal.
        </p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="mb-6 bg-muted/50 border">
          <TabsTrigger value="access" className="px-8 text-base">Acessos e Permissões</TabsTrigger>
          <TabsTrigger value="content" className="px-8 text-base font-semibold">Gestão de Conteúdos 🚀</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* FUNÇÕES */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Gerenciar Funções</h2>
          <form onSubmit={handleCreateRole} className="flex gap-2 mb-6">
            <input
              placeholder="Nome (ex: Admin)"
              className="flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={newRole.name}
              onChange={e => setNewRole({ ...newRole, name: e.target.value })}
            />
            <input
              placeholder="Descrição"
              className="flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={newRole.description}
              onChange={e => setNewRole({ ...newRole, description: e.target.value })}
            />
            <button type="submit" className="h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90">
              Adicionar
            </button>
          </form>

          <ul className="space-y-2">
            {roles.map(r => (
              <li key={r.id} className="flex items-center justify-between p-3 border rounded bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <span className="text-xs text-muted-foreground">{r.description}</span>
                </div>
                <button onClick={() => handleDeleteRole(r.id)} className="text-destructive hover:underline text-sm">Remover</button>
              </li>
            ))}
            {roles.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma role encontrada.</p>}
          </ul>
        </div>

        {/* MAPEAMENTO DE SETORES */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Mapeamento AD de Setores</h2>
          <form onSubmit={handleCreateMapping} className="flex gap-2 mb-6">
            <input
              placeholder="Nome Setor LDAP (ex: TI, RH)"
              className="flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              value={newMap.sector_name}
              onChange={e => setNewMap({ ...newMap, sector_name: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newMap.role_id}
              onChange={e => setNewMap({ ...newMap, role_id: e.target.value })}
            >
              <option value="">Selecione a Role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button type="submit" className="h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90">
              Mapear
            </button>
          </form>

          <ul className="space-y-2">
            {mappings.map(m => (
              <li key={m.id} className="flex items-center justify-between p-3 border rounded bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{m.sector_name}</p>
                  <span className="text-xs text-muted-foreground">→ Mapeado para Role ID: {m.role_id}</span>
                </div>
                <button onClick={() => handleDeleteMapping(m.id)} className="text-destructive hover:underline text-sm">Desmapear</button>
              </li>
            ))}
            {mappings.length === 0 && <p className="text-sm text-muted-foreground">Nenhum mapeamento ativo.</p>}
          </ul>
        </div>
      </div>

      {/* USUÁRIOS */}
      <div className="bg-card border rounded-lg p-6 shadow-sm mt-8">
        <h2 className="text-xl font-semibold mb-6 border-b pb-2">Usuários Sincronizados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted">
              <tr>
                <th className="px-6 py-3 rounded-tl-md">Username</th>
                <th className="px-6 py-3">Setor/Departamento</th>
                <th className="px-6 py-3 rounded-tr-md">Roles Atribuídas</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{u.username}</td>
                  <td className="px-6 py-4">{u.department || "-"}</td>
                  <td className="px-6 py-4">
                    {u.roles.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map(r => (
                          <span key={r.id} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                            {r.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Nenhuma</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">Nenhum usuário sincronizado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </TabsContent>

      <TabsContent value="content">
        <AdminContent />
      </TabsContent>
      </Tabs>

    </div>
  );
}
