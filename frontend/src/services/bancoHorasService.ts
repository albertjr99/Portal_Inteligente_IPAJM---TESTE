import { DiaTrabalhado } from '@/types/bancoHoras';

const SRH_BASE = 'https://srh.pythonanywhere.com';

{/* export async function fetchBancoHoras(nf: string): Promise<DiaTrabalhado[]> {
  const res = await fetch(`${SRH_BASE}/api/consulta/${nf}`);
  if (!res.ok) {
    throw new Error('Numero Funcional nao encontrado no sistema.');
  }

  const data = await res.json();

  let lista: DiaTrabalhado[] = [];

  if (Array.isArray(data)) {
    lista = data;
  } else if (Array.isArray(data?.registros)) {
    lista = data.registros;
  } else if (Array.isArray(data?.dias_trabalhados)) {
    lista = data.dias_trabalhados;
  } else {
    const res2 = await fetch(`${SRH_BASE}/api/dias-trabalhados/servidor/${nf}`);
    if (!res2.ok) {
      throw new Error('Nao foi possivel carregar seus registros.');
    }
    const data2 = await res2.json();
    lista = Array.isArray(data2) ? data2 : [];
  }

  if (lista.length === 0) {
    throw new Error('Nenhum registro encontrado.');
  }

  return lista.sort((a, b) =>
    (b.dia_trabalhado ?? '').localeCompare(a.dia_trabalhado ?? '')
  );
} */}

export async function fetchBancoHorasPorNome(nome: string): Promise<DiaTrabalhado[]> {
  // Usa nosso backend como proxy: faz filtro com match exato normalizado
  // evitando o fuzzy-match da API externa que pode retornar outro servidor.
  const nomeEncoded = encodeURIComponent(nome);
  const res = await fetch(`/api/banco-horas/srh/extrato?nome=${nomeEncoded}`);

  if (!res.ok) {
    throw new Error('Não foi possível carregar os dados de banco de horas.');
  }

  const data = await res.json();
  const lista: DiaTrabalhado[] = Array.isArray(data) ? data : [];

  if (lista.length === 0) {
    throw new Error('Nenhum registro encontrado para o seu nome no sistema de Banco de Horas.');
  }

  return lista.sort((a, b) =>
    (b.dia_trabalhado ?? '').localeCompare(a.dia_trabalhado ?? '')
  );
}
