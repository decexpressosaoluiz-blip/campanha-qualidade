
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

export const calculateStats = (
  data: AppData, 
  specificUnit?: string, 
  dateRange?: { start: Date | null, end: Date | null }
): UnitStats[] => {
  const unitMap = new Map<string, UnitStats>();

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

  // Define a data alvo para "Vendas do Dia" (último dia do período ou última atualização)
  const targetDateStr = (filterEnd || data.lastUpdate).toISOString().split('T')[0];

  data.ctes.forEach(cte => {
    if (hasDateFilter && filterStart && filterEnd) {
      if (cte.data < filterStart || cte.data > filterEnd) return; 
    }

    const unitColeta = normalizeUnitName(cte.unidadeColeta);
    const unitEntrega = normalizeUnitName(cte.unidadeEntrega);
    
    // Todos os documentos contribuem para o pool de cálculos se tiverem unidade
    const unitRef = unitColeta || unitEntrega;
    if (!unitRef) return;

    const stats = getOrCreateStats(unitRef);
    const statusMdfe = normalizeStatus(cte.statusMdfe);
    const statusPrazo = normalizeStatus(cte.statusPrazo);
    const statusEntrega = normalizeStatus(cte.statusEntrega);

    // 1. Lógica de Faturamento e MDFE
    if (unitColeta) {
      stats.faturamento += cte.valor;
      stats.docsVendas.push(cte);
      if (cte.data.toISOString().split('T')[0] === targetDateStr) {
        stats.vendasDiaAnterior += cte.valor;
      }
      if (statusMdfe.match(/COM MDFE|ENCERRADO|AUTORIZADO/i)) stats.comMdfe++;
      else { stats.semMdfe++; stats.docsSemMdfe.push(cte); }
    }

    // 2. Lógica de Entrega e Foto (Unificando critérios para evitar 705 vs 706)
    if (unitEntrega) {
      stats.recebido += cte.valor;
      const isSemBaixa = statusPrazo === '' || statusPrazo === 'SEM DATA' || statusEntrega === 'SEM BAIXA' || statusEntrega.includes('NÃO BAIXADO');

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
        else {
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

  const results = Array.from(unitMap.values());
  return specificUnit ? results.filter(s => s.unidade === normalizeUnitName(specificUnit)) : results;
};
