
import { Cte, UnitMeta, AppData, UnitStats } from '../types';

export const normalizeUnitName = (name: string): string => {
  if (!name) return '';
  return name.trim().toUpperCase();
};

export const normalizeStatus = (status: string): string => {
  if (!status) return '';
  return status.trim().toUpperCase();
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  let clean = value.replace('R$', '').trim();
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const cleanValue = value.trim();
  if (cleanValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = cleanValue.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  const parts = cleanValue.split(/[\/\.\-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0]);
    const p1 = parseInt(parts[1]);
    const p2 = parseInt(parts[2]);
    if (parts[0].length === 4) return new Date(p0, p1 - 1, p2, 12, 0, 0);
    return new Date(p2, p1 - 1, p0, 12, 0, 0);
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  return null;
};

// Auxiliar para comparação de datas sem fuso horário
const toYMD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface DashboardSummary {
  totalDocs: number;
  faturamento: number;
  vendasDia: number;
  dataVendasDia: string;
  pendencias: {
    ok: number;
    pend: number;
    atraso: number;
  };
  fotos: {
    comFoto: number;
    semFoto: number;
    pendBxa: number;
  };
  manifestos: {
    comMdfe: number;
    semMdfe: number;
  };
}

export const calculateStats = (
  data: AppData, 
  specificUnit?: string, 
  dateRange?: { start: Date | null, end: Date | null }
): { stats: UnitStats[], summary: DashboardSummary } => {
  const unitMap = new Map<string, UnitStats>();
  
  const summary: DashboardSummary = {
    totalDocs: 0, faturamento: 0, vendasDia: 0, dataVendasDia: '',
    pendencias: { ok: 0, pend: 0, atraso: 0 },
    fotos: { comFoto: 0, semFoto: 0, pendBxa: 0 },
    manifestos: { comMdfe: 0, semMdfe: 0 }
  };

  const getOrCreateStats = (unit: string): UnitStats => {
    if (!unitMap.has(unit)) {
      unitMap.set(unit, {
        unidade: unit, faturamento: 0, vendasDiaAnterior: 0, recebido: 0, meta: 0, 
        projecao: 0, percentualProjecao: 0, totalCtes: 0, baixaNoPrazo: 0, baixaForaPrazo: 0,
        semBaixa: 0, comMdfe: 0, semMdfe: 0, comFoto: 0, semFoto: 0, semBaixaEntrega: 0,
        docsVendas: [], docsBaixaNoPrazo: [], docsBaixaForaPrazo: [], docsSemBaixa: [],
        docsSemMdfe: [], docsSemFoto: []
      });
    }
    return unitMap.get(unit)!;
  };

  data.metas.forEach(m => { getOrCreateStats(m.unidade).meta = m.meta; });

  const hasDateFilter = dateRange?.start && dateRange?.end;
  const filterStart = dateRange?.start ? new Date(dateRange.start.setHours(0,0,0,0)) : null;
  const filterEnd = dateRange?.end ? new Date(dateRange.end.setHours(23,59,59,999)) : null;

  // Identifica a última data real com movimento no período
  let actualMaxDate: string | null = null;
  data.ctes.forEach(cte => {
    if (hasDateFilter && filterStart && filterEnd) {
      if (cte.data < filterStart || cte.data > filterEnd) return;
    }
    const ymd = toYMD(cte.data);
    if (!actualMaxDate || ymd > actualMaxDate) actualMaxDate = ymd;
  });

  summary.dataVendasDia = actualMaxDate || toYMD(data.lastUpdate);

  data.ctes.forEach(cte => {
    if (hasDateFilter && filterStart && filterEnd) {
      if (cte.data < filterStart || cte.data > filterEnd) return; 
    }

    const unitColeta = normalizeUnitName(cte.unidadeColeta);
    const unitEntrega = normalizeUnitName(cte.unidadeEntrega);
    const statusMdfe = normalizeStatus(cte.statusMdfe);
    const statusPrazo = normalizeStatus(cte.statusPrazo);
    const statusEntrega = normalizeStatus(cte.statusEntrega);
    const cteYMD = toYMD(cte.data);

    summary.totalDocs++;
    
    // 1. Lógica Global de Manifestos (Consistência 100%)
    if (statusMdfe.match(/COM MDFE|ENCERRADO|AUTORIZADO/i)) summary.manifestos.comMdfe++;
    else summary.manifestos.semMdfe++;

    // 2. Lógica Global de Pendências e Fotos (Consistência 100%)
    const isSemBaixa = statusPrazo === '' || statusPrazo === 'SEM DATA' || statusEntrega === 'SEM BAIXA' || statusEntrega.includes('NÃO BAIXADO');
    
    if (isSemBaixa) {
      summary.pendencias.pend++;
      summary.fotos.pendBxa++;
    } else {
      if (statusPrazo === 'NO PRAZO') summary.pendencias.ok++;
      else summary.pendencias.atraso++;

      if (statusEntrega === 'COM FOTO') summary.fotos.comFoto++;
      else summary.fotos.semFoto++;
    }

    // 3. Lógica Global de Faturamento
    summary.faturamento += cte.valor;
    if (cteYMD === summary.dataVendasDia) summary.vendasDia += cte.valor;

    // 4. Lógica por Unidade (Rankings)
    if (unitColeta) {
      const stats = getOrCreateStats(unitColeta);
      stats.faturamento += cte.valor;
      stats.docsVendas.push(cte);
      if (cteYMD === summary.dataVendasDia) stats.vendasDiaAnterior += cte.valor;
      if (statusMdfe.match(/COM MDFE|ENCERRADO|AUTORIZADO/i)) stats.comMdfe++;
      else { stats.semMdfe++; stats.docsSemMdfe.push(cte); }
    }

    if (unitEntrega) {
      const stats = getOrCreateStats(unitEntrega);
      stats.recebido += cte.valor;
      if (isSemBaixa) {
        stats.semBaixa++;
        stats.semBaixaEntrega++;
        stats.docsSemBaixa.push(cte);
      } else {
        if (statusPrazo === 'NO PRAZO') {
          stats.baixaNoPrazo++;
          stats.docsBaixaNoPrazo.push(cte);
        } else {
          stats.baixaForaPrazo++;
          stats.docsBaixaForaPrazo.push(cte);
        }
        if (statusEntrega === 'COM FOTO') stats.comFoto++;
        else { stats.semFoto++; stats.docsSemFoto.push(cte); }
      }
    }
  });

  const daysElapsed = Math.max(1, data.fixedDays.elapsed);
  const totalDaysInPeriod = Math.max(1, data.fixedDays.total);

  unitMap.forEach(stats => {
    stats.projecao = (stats.faturamento / daysElapsed) * totalDaysInPeriod;
    stats.percentualProjecao = stats.meta > 0 ? (stats.projecao / stats.meta) * 100 : 0;
  });

  let statsList = Array.from(unitMap.values());
  if (specificUnit) {
    statsList = statsList.filter(s => s.unidade === normalizeUnitName(specificUnit));
  }

  return { stats: statsList, summary };
};
