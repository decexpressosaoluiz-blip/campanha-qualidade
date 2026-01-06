
export interface User {
  username: string;
  unit: string; // Empty for Admin/Manager
}

export interface Cte {
  id: string; // Chave/Número
  data: Date;
  prazoBaixa: Date | null; // Coluna F
  unidadeColeta: string;
  unidadeEntrega: string;
  valor: number;
  statusPrazo: string;
  statusMdfe: string;
  remetente?: string;
  destinatario?: string;
}

export interface UnitMeta {
  unidade: string;
  meta: number;
}

export interface AppData {
  ctes: Cte[];
  metas: UnitMeta[];
  refDate: Date;
  holidays: Date[];
  lastUpdate: Date;
  fixedDays: {
    total: number;
    elapsed: number;
  };
}

export interface UnitStats {
  unidade: string;
  faturamento: number;
  vendasDiaAnterior: number; 
  recebido: number; 
  meta: number;
  projecao: number;
  percentualProjecao: number;
  
  // Counts
  totalCtes: number;
  baixaNoPrazo: number;
  baixaForaPrazo: number;
  semBaixa: number;
  comMdfe: number;
  semMdfe: number;

  // Document Lists (for drill down)
  docsVendas: Cte[];
  docsBaixaNoPrazo: Cte[];
  docsBaixaForaPrazo: Cte[];
  docsSemBaixa: Cte[];
  docsSemMdfe: Cte[];
}

export enum DashboardView {
  LOGIN,
  MANAGER,
  UNIT_DETAIL
}

export type SortField = 'unidade' | 'faturamento' | 'projecao' | 'noPrazo' | 'foraPrazo' | 'semBaixa' | 'semMdfe';
