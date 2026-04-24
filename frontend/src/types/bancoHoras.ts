export interface DiaTrabalhado {
  id: number;
  nf: string;
  nome: string;
  setor: string;
  vinculo?: string;
  dia_trabalhado?: string;
  entrada?: string;
  saida?: string;
  h_trab?: string;
  h_direito?: string;
  prazo_max?: string;
  h_totais?: string;
  hora_dia?: string;
  dias_gozar?: string;
  dias_gozados?: string;
  h_descontadas?: string;
  saldo?: string;
  observacao?: string;
}