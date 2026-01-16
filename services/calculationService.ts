
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
  if (!value || value.trim() === '' || value.toLowerCase() === 'null') return null;
  const cleanValue = value.trim();
  
  // Extrai apenas a data se houver hora (ex: "14/01/2026 08:30")
  const datePart = cleanValue.split(' ')[0];
  
  // Tenta formato YYYY-MM-DD
  if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  
  // Tenta formatos com barra ou ponto (DD/MM/YYYY)
  const parts = datePart.split(/[\/\.\-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0]);
    const p1 = parseInt(parts[1]);
    const p2 = parseInt(parts[2]);
    
    // Se o primeiro part tiver 4 dígitos, assume YYYY-MM-DD
    if (parts[0].length === 4) {
      return new Date(p0, p1 - 1, p2, 12, 0, 0);
    }
    // Caso contrário assume DD-MM-YYYY
    return new Date(p2, p1 - 1, p0, 12, 0, 0);
  }
  
  const d = new Date(cleanValue);
  if (!isNaN(d.getTime())) {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  return null;
};

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
        docsSemMdfe: [], docsSemFoto: [], docsComFoto: [], docsSemBaixaEntrega: []
      });
    }
    return unitMap.get(unit)!;
  };

  data.metas.forEach(m => { getOrCreateStats(m.unidade).meta = m.meta; });

  const filterStart = dateRange?.start ? new Date(dateRange.start.setHours(0,0,0,0)) : null;
  const filterEnd = dateRange?.end ? new Date(dateRange.end.setHours(23,59,59,999)) : null;

  let actualMaxDate: string | null = null;
  data.ctes.forEach(cte => {
    if (filterStart && filterEnd) {
      if (cte.data < filterStart || cte.data > filterEnd) return;
    }
    const ymd = toYMD(cte.data);
    if (!actualMaxDate || ymd > actualMaxDate) actualMaxDate = ymd;
  });

  summary.dataVendasDia = actualMaxDate || toYMD(data.lastUpdate);

  data.ctes.forEach(cte => {
    if (filterStart && filterEnd) {
      if (cte.data < filterStart || cte.data > filterEnd) return; 
    }

    const unitColeta = normalizeUnitName(cte.unidadeColeta);
    const unitEntrega = normalizeUnitName(cte.unidadeEntrega);
    const statusMdfe = normalizeStatus(cte.statusMdfe);
    const statusPrazo = normalizeStatus(cte.statusPrazo);
    const statusEntrega = normalizeStatus(cte.statusEntrega);
    const cteYMD = toYMD(cte.data);

    summary.totalDocs++;
    
    if (statusMdfe.match(/COM MDFE|ENCERRADO|AUTORIZADO/i)) summary.manifestos.comMdfe++;
    else summary.manifestos.semMdfe++;

    const isSemBaixa = statusPrazo === '' || statusPrazo === 'SEM DATA' || statusEntrega === 'SEM BAIXA' || statusEntrega.includes('NÃO BAIXADO');
    
    if (isSemBaixa) {
      summary.pendencias.pend++;
      summary.fotos.pendBxa++;
    } else {
      if (statusPrazo === 'NO PRAZO') summary.pendencias.ok++;
      else summary.pendencias.atraso++;

      if (statusEntrega.includes('COM FOTO')) summary.fotos.comFoto++;
      else summary.fotos.semFoto++;
    }

    summary.faturamento += cte.valor;
    if (cteYMD === summary.dataVendasDia) summary.vendasDia += cte.valor;

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
        stats.docsSemBaixaEntrega.push(cte);
      } else {
        if (statusPrazo === 'NO PRAZO') {
          stats.baixaNoPrazo++;
          stats.docsBaixaNoPrazo.push(cte);
        } else {
          stats.baixaForaPrazo++;
          stats.docsBaixaForaPrazo.push(cte);
        }
        
        if (statusEntrega.includes('COM FOTO')) {
          stats.comFoto++;
          stats.docsComFoto.push(cte);
        } else {
          stats.semFoto++;
          stats.docsSemFoto.push(cte);
        }
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
