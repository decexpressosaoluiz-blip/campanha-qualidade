
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

// Robust Date Parser
export const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const cleanValue = value.trim();
  
  // Try YYYY-MM-DD (ISO)
  if (cleanValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = cleanValue.split('-').map(Number);
    // Force 12:00:00 to avoid timezone rollovers
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  // Try DD/MM/YYYY or D/M/YYYY
  const parts = cleanValue.split(/[\/\.\-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0]);
    const p1 = parseInt(parts[1]);
    const p2 = parseInt(parts[2]);

    // Check if first part is year (YYYY/MM/DD)
    if (parts[0].length === 4) {
       return new Date(p0, p1 - 1, p2, 12, 0, 0);
    }
    // Assume DD/MM/YYYY
    return new Date(p2, p1 - 1, p0, 12, 0, 0);
  }
  
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  return null;
};

export const calculateStats = (
  data: AppData, 
  specificUnit?: string, 
  dateRange?: { start: Date | null, end: Date | null }
): UnitStats[] => {
  const unitMap = new Map<string, UnitStats>();

  // Init Map
  data.metas.forEach(m => {
    unitMap.set(m.unidade, {
      unidade: m.unidade,
      faturamento: 0,
      vendasDiaAnterior: 0,
      recebido: 0,
      meta: m.meta,
      projecao: 0,
      percentualProjecao: 0,
      totalCtes: 0,
      baixaNoPrazo: 0,
      baixaForaPrazo: 0,
      semBaixa: 0,
      comMdfe: 0,
      semMdfe: 0,
      docsVendas: [],
      docsBaixaNoPrazo: [],
      docsBaixaForaPrazo: [],
      docsSemBaixa: [],
      docsSemMdfe: []
    });
  });

  const hasDateFilter = dateRange?.start && dateRange?.end;
  const filterStart = dateRange?.start ? new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate(), 0,0,0) : null;
  const filterEnd = dateRange?.end ? new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate(), 23,59,59) : null;

  // Para o cálculo do dia anterior, usamos a data da última atualização carregada
  const lastUpdateStr = data.lastUpdate.toISOString().split('T')[0];

  // Process CTEs
  data.ctes.forEach(cte => {
    // Cálculo do faturamento do dia da atualização (independente do filtro de período do dashboard)
    const cteDateStr = cte.data.toISOString().split('T')[0];
    const isLastDay = cteDateStr === lastUpdateStr;

    if (hasDateFilter && filterStart && filterEnd) {
      if (cte.data < filterStart || cte.data > filterEnd) return; 
    }

    const unitColeta = normalizeUnitName(cte.unidadeColeta);
    if (unitColeta && unitMap.has(unitColeta)) {
      const stats = unitMap.get(unitColeta)!;
      stats.faturamento += cte.valor;
      stats.docsVendas.push(cte);
      
      if (isLastDay) {
        stats.vendasDiaAnterior += cte.valor;
      }

      const statusMdfe = normalizeStatus(cte.statusMdfe);
      if (statusMdfe.includes('COM MDFE') || statusMdfe.includes('ENCERRADO') || statusMdfe.includes('AUTORIZADO')) {
        stats.comMdfe++;
      } else {
        stats.semMdfe++;
        stats.docsSemMdfe.push(cte);
      }
    }

    const unitEntrega = normalizeUnitName(cte.unidadeEntrega);
    if (unitEntrega && unitMap.has(unitEntrega)) {
      const stats = unitMap.get(unitEntrega)!;
      // Incrementa Recebido baseado na entrega (Coluna I)
      stats.recebido += cte.valor;

      const statusPrazo = normalizeStatus(cte.statusPrazo);
      if (statusPrazo === 'NO PRAZO') {
        stats.baixaNoPrazo++;
        stats.docsBaixaNoPrazo.push(cte);
      } else if (statusPrazo === 'FORA DO PRAZO') {
        stats.baixaForaPrazo++;
        stats.docsBaixaForaPrazo.push(cte);
      } else {
        stats.semBaixa++;
        stats.docsSemBaixa.push(cte);
      }
    }
  });

  const daysElapsed = data.fixedDays.elapsed > 0 ? data.fixedDays.elapsed : 1;
  const totalDaysInPeriod = data.fixedDays.total > 0 ? data.fixedDays.total : 1;

  Array.from(unitMap.values()).forEach(stats => {
    const dailyAvg = stats.faturamento / daysElapsed;
    stats.projecao = dailyAvg * totalDaysInPeriod;
    stats.percentualProjecao = stats.meta > 0 ? (stats.projecao / stats.meta) * 100 : 0;
  });

  const allStats = Array.from(unitMap.values());
  if (specificUnit) {
    return allStats.filter(s => s.unidade === normalizeUnitName(specificUnit));
  }
  return allStats;
};
