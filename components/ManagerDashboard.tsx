
import React, { useState, useMemo, useRef } from 'react';
import { UnitStats, Cte } from '../types';
import Card from './Card';
import { DollarSign, Truck, FileText, Search, ArrowUpDown, Calendar, Filter, AlertTriangle, Image as ImageIcon, Loader2, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { normalizeStatus } from '../services/calculationService';
import DailyRevenueChart from './DailyRevenueChart';

interface ManagerDashboardProps {
  stats: UnitStats[];
  allCtes: Cte[];
  onSelectUnit: (unit: string) => void;
  onDateFilterChange: (start: string, end: string) => void;
  dateRange: { start: string, end: string };
  lastUpdate: Date;
  fixedDays: { total: number; elapsed: number };
}

type SortDirection = 'asc' | 'desc';

type SalesSortField = 'unidade' | 'faturamento' | 'projecao' | 'percentualProjecao';
type DeliverySortField = 'unidade' | 'totalRecebimentos' | 'pctNoPrazo' | 'pctSemBaixa' | 'pctForaPrazo';
type ManifestSortField = 'unidade' | 'totalEmissoes' | 'pctComMdfe' | 'pctSemMdfe';

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ stats, allCtes, onSelectUnit, onDateFilterChange, dateRange, lastUpdate, fixedDays }) => {
  const [filter, setFilter] = useState('');
  
  const [salesSort, setSalesSort] = useState<{field: SalesSortField, dir: SortDirection}>({ field: 'faturamento', dir: 'desc' });
  const [deliverySort, setDeliverySort] = useState<{field: DeliverySortField, dir: SortDirection}>({ field: 'pctNoPrazo', dir: 'desc' });
  const [manifestSort, setManifestSort] = useState<{field: ManifestSortField, dir: SortDirection}>({ field: 'pctComMdfe', dir: 'desc' });

  const [deliveryLocalStart, setDeliveryLocalStart] = useState('');
  const [deliveryLocalEnd, setDeliveryLocalEnd] = useState('');

  const exportSalesRef = useRef<HTMLDivElement>(null);
  const exportDeliveryRef = useRef<HTMLDivElement>(null);
  const exportManifestRef = useRef<HTMLDivElement>(null);
  
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const filteredStats = useMemo(() => {
    return stats.filter(s => s.unidade.includes(filter.toUpperCase()));
  }, [stats, filter]);

  const totalStats = useMemo(() => {
    return filteredStats.reduce((acc, curr) => ({
      faturamento: acc.faturamento + curr.faturamento,
      vendasDiaAnterior: acc.vendasDiaAnterior + curr.vendasDiaAnterior,
      meta: acc.meta + curr.meta,
      projecao: acc.projecao + curr.projecao,
      baixaNoPrazo: acc.baixaNoPrazo + curr.baixaNoPrazo,
      baixaForaPrazo: acc.baixaForaPrazo + curr.baixaForaPrazo,
      semBaixa: acc.semBaixa + curr.semBaixa,
      comMdfe: acc.comMdfe + curr.comMdfe,
      semMdfe: acc.semMdfe + curr.semMdfe,
      totalCtes: acc.totalCtes + (curr.comMdfe + curr.semMdfe)
    }), { faturamento: 0, vendasDiaAnterior: 0, meta: 0, projecao: 0, baixaNoPrazo: 0, baixaForaPrazo: 0, semBaixa: 0, comMdfe: 0, semMdfe: 0, totalCtes: 0 });
  }, [filteredStats]);

  const deliveryStats = useMemo(() => {
    let countNoPrazo = 0, countForaPrazo = 0, countSemBaixa = 0;
    const start = deliveryLocalStart ? new Date(deliveryLocalStart + 'T00:00:00') : null;
    const end = deliveryLocalEnd ? new Date(deliveryLocalEnd + 'T23:59:59') : null;

    allCtes.forEach(cte => {
      if (!cte.prazoBaixa) return;
      if (start && cte.prazoBaixa < start) return;
      if (end && cte.prazoBaixa > end) return;
      const status = normalizeStatus(cte.statusPrazo);
      if (status === 'NO PRAZO') countNoPrazo++;
      else if (status === 'FORA DO PRAZO') countForaPrazo++;
      else countSemBaixa++;
    });

    const total = countNoPrazo + countForaPrazo + countSemBaixa;
    return {
      total, noPrazo: countNoPrazo, foraPrazo: countForaPrazo, semBaixa: countSemBaixa,
      pctNoPrazo: total > 0 ? (countNoPrazo / total) * 100 : 0,
      pctSemBaixa: total > 0 ? (countSemBaixa / total) * 100 : 0,
      pctForaPrazo: total > 0 ? (countForaPrazo / total) * 100 : 0,
    };
  }, [allCtes, deliveryLocalStart, deliveryLocalEnd]);

  const generalPercentProj = totalStats.meta > 0 ? (totalStats.projecao / totalStats.meta) * 100 : 0;
  const generalPercentFat = totalStats.meta > 0 ? (totalStats.faturamento / totalStats.meta) * 100 : 0;
  const remainingDays = Math.max(1, fixedDays.total - fixedDays.elapsed);
  const metaDoDiaGeral = Math.max(0, totalStats.meta - totalStats.faturamento) / remainingDays;

  const handleSalesSort = (field: SalesSortField) => setSalesSort(prev => ({ field, dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc' }));
  const handleDeliverySort = (field: DeliverySortField) => setDeliverySort(prev => ({ field, dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc' }));
  const handleManifestSort = (field: ManifestSortField) => setManifestSort(prev => ({ field, dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc' }));

  const sortedSalesStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      let valA = 0, valB = 0;
      if (salesSort.field === 'unidade') return salesSort.dir === 'asc' ? a.unidade.localeCompare(b.unidade) : b.unidade.localeCompare(a.unidade);
      if (salesSort.field === 'faturamento') { valA = a.faturamento; valB = b.faturamento; }
      if (salesSort.field === 'projecao') { valA = a.projecao; valB = b.projecao; }
      if (salesSort.field === 'percentualProjecao') { valA = a.percentualProjecao; valB = b.percentualProjecao; }
      return salesSort.dir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStats, salesSort]);

  const sortedDeliveryStats = useMemo(() => {
    return [...filteredStats].map(s => {
        const total = s.baixaNoPrazo + s.baixaForaPrazo + s.semBaixa;
        return {
            ...s, totalRecebimentos: total,
            pctNoPrazo: total > 0 ? (s.baixaNoPrazo / total) * 100 : 0,
            pctSemBaixa: total > 0 ? (s.semBaixa / total) * 100 : 0,
            pctForaPrazo: total > 0 ? (s.baixaForaPrazo / total) * 100 : 0,
        }
    }).sort((a, b) => {
        let valA = 0, valB = 0;
        if (deliverySort.field === 'unidade') return deliverySort.dir === 'asc' ? a.unidade.localeCompare(b.unidade) : b.unidade.localeCompare(a.unidade);
        if (deliverySort.field === 'totalRecebimentos') { valA = a.totalRecebimentos; valB = b.totalRecebimentos; }
        if (deliverySort.field === 'pctNoPrazo') { valA = a.pctNoPrazo; valB = b.pctNoPrazo; }
        if (deliverySort.field === 'pctSemBaixa') { valA = a.pctSemBaixa; valB = b.pctSemBaixa; }
        if (deliverySort.field === 'pctForaPrazo') { valA = a.pctForaPrazo; valB = b.pctForaPrazo; }
        return deliverySort.dir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStats, deliverySort]);

  const sortedManifestStats = useMemo(() => {
    return [...filteredStats].map(s => {
        const total = s.comMdfe + s.semMdfe;
        return {
            ...s, totalEmissoes: total,
            pctComMdfe: total > 0 ? (s.comMdfe / total) * 100 : 0,
            pctSemMdfe: total > 0 ? (s.semMdfe / total) * 100 : 0,
        }
    }).sort((a, b) => {
        let valA = 0, valB = 0;
        if (manifestSort.field === 'unidade') return manifestSort.dir === 'asc' ? a.unidade.localeCompare(b.unidade) : b.unidade.localeCompare(a.unidade);
        if (manifestSort.field === 'totalEmissoes') { valA = a.totalEmissoes; valB = b.totalEmissoes; }
        if (manifestSort.field === 'pctComMdfe') { valA = a.pctComMdfe; valB = b.pctComMdfe; }
        if (manifestSort.field === 'pctSemMdfe') { valA = a.pctSemMdfe; valB = b.pctSemMdfe; }
        return manifestSort.dir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStats, manifestSort]);

  const handleDownloadImage = async (ref: React.RefObject<HTMLDivElement | null>, type: string, fileName: string) => {
    if (!ref.current) return;
    setIsExporting(type);
    try {
      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await toJpeg(ref.current, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${fileName}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.jpeg`;
      link.href = dataUrl; link.click();
    } catch (err) { alert('Erro ao gerar imagem.'); } finally { setIsExporting(null); }
  };

  const SortIcon = ({ active, dir }: { active: boolean, dir: SortDirection }) => {
    if (!active) return <ArrowUpDown className="w-2.5 h-2.5 ml-0.5 opacity-20" />;
    return dir === 'asc' ? <ArrowUp className="w-2.5 h-2.5 ml-0.5 text-sle-primary" /> : <ArrowDown className="w-2.5 h-2.5 ml-0.5 text-sle-primary" />;
  };

  const filterEndDate = dateRange.end ? new Date(dateRange.end + 'T12:00:00') : lastUpdate;
  const effectiveDate = filterEndDate > lastUpdate ? lastUpdate : filterEndDate;
  const salesLabelDate = new Date(effectiveDate);

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-1 sm:px-0">
      {/* EXPORT REFS (Hidden) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
         <div ref={exportSalesRef} className="bg-white p-10 w-[1100px] font-sans">
            <h1 className="text-2xl font-bold mb-4 text-sle-dark border-b-2 border-sle-primary pb-2">RANKING DE VENDAS</h1>
            <table className="w-full text-base text-left border-collapse">
               <thead className="bg-[#F8F9FE] text-[#24268B]"><tr><th className="p-4 border-b">Unidade</th><th className="p-4 border-b text-right">Vendas</th><th className="p-4 border-b text-right">Projeção</th><th className="p-4 border-b text-center">% Projeção</th></tr></thead>
               <tbody>{sortedSalesStats.map(s => (<tr key={s.unidade}><td className="p-4 border-b font-bold text-sle-dark">{s.unidade}</td><td className="p-4 border-b text-right">{s.faturamento.toLocaleString('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0})}</td><td className="p-4 border-b text-right">{s.projecao.toLocaleString('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0})}</td><td className="p-4 border-b text-center"><span className={`px-2 py-1 rounded font-bold text-sm ${s.percentualProjecao >= 100 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{s.percentualProjecao.toFixed(0)}%</span></td></tr>))}</tbody>
            </table>
         </div>
         <div ref={exportDeliveryRef} className="bg-white p-10 w-[1100px] font-sans">
            <h1 className="text-2xl font-bold mb-4 text-sle-dark border-b-2 border-warning pb-2">RANKING DE PENDÊNCIAS</h1>
            <table className="w-full text-base text-left border-collapse">
               <thead className="bg-[#F8F9FE] text-[#24268B]"><tr><th className="p-4 border-b">Unidade</th><th className="p-4 border-b text-center">Total</th><th className="p-4 border-b text-center">% OK</th><th className="p-4 border-b text-center">% PEND</th><th className="p-4 border-b text-center">% ATR</th></tr></thead>
               <tbody>{sortedDeliveryStats.map(s => (<tr key={s.unidade}><td className="p-4 border-b font-bold text-sle-dark">{s.unidade}</td><td className="p-4 border-b text-center font-bold">{s.totalRecebimentos}</td><td className="p-4 border-b text-center text-green-700 font-bold">{s.pctNoPrazo.toFixed(0)}%</td><td className="p-4 border-b text-center text-yellow-600 font-bold">{s.pctSemBaixa.toFixed(0)}%</td><td className="p-4 border-b text-center text-red-600 font-bold">{s.pctForaPrazo.toFixed(0)}%</td></tr>))}</tbody>
            </table>
         </div>
      </div>

      {/* Global Toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center text-sle-primary bg-blue-50 px-3 py-1.5 rounded-full">
          <Clock className="w-4 h-4 mr-2" />
          <span className="font-semibold text-xs sm:text-sm uppercase tracking-tight">Atualizado: {lastUpdate.toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            <div className="relative w-full md:min-w-[240px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input type="text" placeholder="Buscar unidade..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs w-full outline-none focus:ring-2 focus:ring-sle-primary bg-gray-50/50" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
               <Calendar className="w-4 h-4 text-gray-400" />
               <input type="date" value={dateRange.start} onChange={(e) => onDateFilterChange(e.target.value, dateRange.end)} className="bg-transparent text-[11px] sm:text-xs outline-none w-26 font-semibold" />
               <span className="text-gray-300">-</span>
               <input type="date" value={dateRange.end} onChange={(e) => onDateFilterChange(dateRange.start, e.target.value)} className="bg-transparent text-[11px] sm:text-xs outline-none w-26 font-semibold" />
            </div>
            <div className="hidden sm:flex text-[10px] font-bold text-blue-800 bg-blue-100/50 px-3 py-2 rounded-lg border border-blue-200/50 uppercase tracking-widest leading-none">DIAS: {fixedDays.elapsed}/{fixedDays.total}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="FATURAMENTO GERAL" icon={<DollarSign className="w-5 h-5 opacity-50"/>} className="border-l-sle-primary shadow-sm hover:shadow-md transition-shadow">
           <div className="space-y-4">
             <div className="flex justify-between items-start">
               <div>
                 <div className="text-3xl font-bold text-[#0F103A] tracking-tight">{totalStats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</div>
                 <div className="text-[10px] text-gray-400 mt-2 font-semibold uppercase tracking-wider">Meta Total: {totalStats.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</div>
               </div>
               <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-right">
                  <p className="text-[9px] font-bold text-blue-800 uppercase leading-none mb-1">Meta do Dia</p>
                  <p className="text-sm font-bold text-sle-primary leading-none">{metaDoDiaGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
               </div>
             </div>
             <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex flex-col">
                      <span className="text-[9px] uppercase text-gray-400 font-semibold tracking-wide">Projeção Total</span>
                      <span className="font-bold text-sle-primary text-lg leading-none">{totalStats.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                   </div>
                   <span className={`text-xl font-bold ${generalPercentProj >= 100 ? 'text-green-600' : 'text-red-600'}`}>{generalPercentProj.toFixed(1)}%</span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`absolute top-0 left-0 h-full transition-all duration-500 opacity-40 ${generalPercentProj >= 100 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(generalPercentProj, 100)}%` }}></div>
                    <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${generalPercentProj >= 100 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(generalPercentFat, 100)}%` }}></div>
                </div>
             </div>
             <div className="bg-blue-50/40 border border-blue-100/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-tight">Vendas do dia {salesLabelDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
                  <span className="text-sm font-bold text-[#2E31B4]">{totalStats.vendasDiaAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
             </div>
           </div>
        </Card>

        <Card title="PENDÊNCIAS DE ENTREGA" icon={<Truck className="w-5 h-5 opacity-50"/>} className="border-l-warning shadow-sm hover:shadow-md transition-shadow">
           <div className="flex flex-col gap-4">
              <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Filtrar Prazo (Col F):</span>
                  <div className="flex items-center gap-1">
                      <input type="date" value={deliveryLocalStart} onChange={(e) => setDeliveryLocalStart(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1 rounded outline-none w-24" />
                      <span className="text-gray-300">-</span>
                      <input type="date" value={deliveryLocalEnd} onChange={(e) => setDeliveryLocalEnd(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1 rounded outline-none w-24" />
                  </div>
              </div>
             <div className="grid grid-cols-3 gap-2 items-center text-center h-[90px]">
               <div className="flex flex-col border-r border-gray-100 px-1 py-1">
                  <span className="text-xl font-bold text-green-700 leading-none">{deliveryStats.noPrazo}</span>
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50/50 rounded-md mt-2 py-0.5">{deliveryStats.pctNoPrazo.toFixed(0)}% OK</span>
               </div>
               <div className="flex flex-col bg-yellow-50/50 rounded-lg px-2 py-3 border border-yellow-100 shadow-sm transform scale-105 transition-transform hover:scale-110">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mx-auto mb-1" />
                  <span className="text-2xl font-bold text-yellow-700 leading-none">{deliveryStats.semBaixa}</span>
                  <span className="text-[10px] font-bold text-yellow-600 mt-1 uppercase tracking-tighter">{deliveryStats.pctSemBaixa.toFixed(0)}% PEND</span>
               </div>
               <div className="flex flex-col border-l border-gray-100 px-1 py-1">
                  <span className="text-xl font-bold text-red-700 leading-none">{deliveryStats.foraPrazo}</span>
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50/50 rounded-md mt-2 py-0.5">{deliveryStats.pctForaPrazo.toFixed(0)}% ATRASO</span>
               </div>
             </div>
           </div>
        </Card>

        <Card title="MANIFESTOS" icon={<FileText className="w-5 h-5 opacity-50"/>} className="border-l-danger shadow-sm hover:shadow-md transition-shadow">
           <div className="flex flex-col gap-3 py-1 justify-center min-h-[140px]">
              <div className="flex justify-between items-center p-4 rounded-lg bg-green-50/40 border border-green-100"><div className="flex flex-col"><span className="text-[10px] font-semibold text-green-800 uppercase tracking-tight leading-none">Com MDFE</span><span className="text-[9px] font-medium text-green-600 mt-1">{((totalStats.comMdfe / Math.max(1, totalStats.comMdfe + totalStats.semMdfe)) * 100).toFixed(0)}% Cobertura</span></div><span className="font-bold text-2xl text-green-600 leading-none">{totalStats.comMdfe}</span></div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-red-50/40 border border-red-100"><div className="flex flex-col"><span className="text-[10px] font-semibold text-red-800 uppercase tracking-tight leading-none">Sem MDFE</span><span className="text-[9px] font-medium text-red-600 mt-1">{((totalStats.semMdfe / Math.max(1, totalStats.comMdfe + totalStats.semMdfe)) * 100).toFixed(0)}% Pendente</span></div><span className="text-2xl font-bold text-red-600 leading-none">{totalStats.semMdfe}</span></div>
           </div>
        </Card>
      </div>

      <DailyRevenueChart ctes={allCtes} startDate={dateRange.start ? new Date(dateRange.start + 'T00:00:00') : undefined} endDate={dateRange.end ? new Date(dateRange.end + 'T23:59:59') : undefined} />

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        {/* TABELA VENDAS */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 xl:col-span-2">
            <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center"><h3 className="font-semibold text-xs uppercase tracking-wider">Ranking de Vendas</h3><button onClick={() => handleDownloadImage(exportSalesRef, 'sales', 'Ranking_Vendas')} className="bg-[#059669] text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center"><ImageIcon className="w-3.5 h-3.5 mr-2" /> Baixar Imagem</button></div>
            <div className="overflow-x-auto"><table className="w-full text-[10px] sm:text-sm text-left table-fixed min-w-[500px]"><thead className="bg-[#F8F9FE] text-[#24268B]"><tr><th className="w-[40%] px-3 py-3 font-bold uppercase cursor-pointer" onClick={() => handleSalesSort('unidade')}><div className="flex items-center">UNIDADE <SortIcon active={salesSort.field === 'unidade'} dir={salesSort.dir} /></div></th><th className="w-[20%] px-2 py-3 text-right font-bold uppercase cursor-pointer" onClick={() => handleSalesSort('faturamento')}><div className="flex items-center justify-end">VENDAS <SortIcon active={salesSort.field === 'faturamento'} dir={salesSort.dir} /></div></th><th className="w-[20%] px-2 py-3 text-right font-bold uppercase cursor-pointer" onClick={() => handleSalesSort('projecao')}><div className="flex items-center justify-end">PROJEÇÃO <SortIcon active={salesSort.field === 'projecao'} dir={salesSort.dir} /></div></th><th className="w-[20%] px-2 py-3 text-center font-bold uppercase cursor-pointer" onClick={() => handleSalesSort('percentualProjecao')}><div className="flex items-center justify-center">% PROJEÇÃO <SortIcon active={salesSort.field === 'percentualProjecao'} dir={salesSort.dir} /></div></th></tr></thead><tbody className="divide-y divide-gray-50">{sortedSalesStats.map(stat => (<tr key={stat.unidade} onClick={() => onSelectUnit(stat.unidade)} className="hover:bg-blue-50/40 cursor-pointer transition-colors"><td className="px-3 py-3 font-semibold uppercase">{stat.unidade}</td><td className="px-2 py-3 text-right">{stat.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td><td className="px-2 py-3 text-right text-sle-primary font-bold">{stat.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td><td className="px-2 py-3 text-center"><span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${stat.percentualProjecao >= 100 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{stat.percentualProjecao.toFixed(0)}%</span></td></tr>))}</tbody></table></div>
        </div>

        {/* TABELA ENTREGAS */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center"><h3 className="font-semibold text-xs uppercase tracking-wider">Ranking Pendências</h3><button onClick={() => handleDownloadImage(exportDeliveryRef, 'delivery', 'Ranking_Entregas')} className="bg-[#059669] text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center"><ImageIcon className="w-3.5 h-3.5 mr-2" /> Baixar</button></div>
            <div className="overflow-x-auto"><table className="w-full text-[10px] sm:text-sm text-left table-fixed min-w-[400px]"><thead className="bg-[#F8F9FE] text-[#24268B]"><tr><th className="w-[30%] px-2 py-3 cursor-pointer" onClick={() => handleDeliverySort('unidade')}><div className="flex items-center">UNID <SortIcon active={deliverySort.field === 'unidade'} dir={deliverySort.dir} /></div></th><th className="w-[15%] px-1 py-3 text-center cursor-pointer" onClick={() => handleDeliverySort('totalRecebimentos')}><div className="flex items-center justify-center">QTD <SortIcon active={deliverySort.field === 'totalRecebimentos'} dir={deliverySort.dir} /></div></th><th className="w-[18%] text-center cursor-pointer" onClick={() => handleDeliverySort('pctNoPrazo')}><div className="flex items-center justify-center">% OK <SortIcon active={deliverySort.field === 'pctNoPrazo'} dir={deliverySort.dir} /></div></th><th className="w-[19%] text-center cursor-pointer" onClick={() => handleDeliverySort('pctSemBaixa')}><div className="flex items-center justify-center">% PEN <SortIcon active={deliverySort.field === 'pctSemBaixa'} dir={deliverySort.dir} /></div></th><th className="w-[18%] text-center cursor-pointer" onClick={() => handleDeliverySort('pctForaPrazo')}><div className="flex items-center justify-center">% ATR <SortIcon active={deliverySort.field === 'pctForaPrazo'} dir={deliverySort.dir} /></div></th></tr></thead><tbody className="divide-y divide-gray-50">{sortedDeliveryStats.map(stat => (<tr key={stat.unidade} onClick={() => onSelectUnit(stat.unidade)} className="hover:bg-blue-50/40 cursor-pointer transition-colors"><td className="px-2 py-3 font-semibold uppercase">{stat.unidade}</td><td className="px-1 py-3 text-center font-bold">{stat.totalRecebimentos}</td><td className="px-1 py-3 text-center text-green-600 font-bold">{stat.pctNoPrazo.toFixed(0)}%</td><td className="px-1 py-3 text-center text-yellow-600 font-bold">{stat.pctSemBaixa.toFixed(0)}%</td><td className="px-1 py-3 text-center text-red-600 font-bold">{stat.pctForaPrazo.toFixed(0)}%</td></tr>))}</tbody></table></div>
        </div>

        {/* TABELA MANIFESTOS */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-50 bg-gray-50/30"><h3 className="font-semibold text-xs uppercase tracking-wider">Ranking Manifestos</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-[10px] sm:text-sm text-left table-fixed min-w-[400px]"><thead className="bg-[#F8F9FE] text-[#24268B]"><tr><th className="w-[35%] px-2 py-3 cursor-pointer" onClick={() => handleManifestSort('unidade')}><div className="flex items-center">UNID <SortIcon active={manifestSort.field === 'unidade'} dir={manifestSort.dir} /></div></th><th className="w-[20%] text-center cursor-pointer" onClick={() => handleManifestSort('totalEmissoes')}><div className="flex items-center justify-center">QTD <SortIcon active={manifestSort.field === 'totalEmissoes'} dir={manifestSort.dir} /></div></th><th className="w-[22%] text-center cursor-pointer" onClick={() => handleManifestSort('pctComMdfe')}><div className="flex items-center justify-center">% COM <SortIcon active={manifestSort.field === 'pctComMdfe'} dir={manifestSort.dir} /></div></th><th className="w-[23%] text-center cursor-pointer" onClick={() => handleManifestSort('pctSemMdfe')}><div className="flex items-center justify-center">% SEM <SortIcon active={manifestSort.field === 'pctSemMdfe'} dir={manifestSort.dir} /></div></th></tr></thead><tbody className="divide-y divide-gray-50">{sortedManifestStats.map(stat => (<tr key={stat.unidade} onClick={() => onSelectUnit(stat.unidade)} className="hover:bg-blue-50/40 cursor-pointer transition-colors"><td className="px-2 py-3 font-semibold uppercase">{stat.unidade}</td><td className="px-1 py-3 text-center font-bold">{stat.totalEmissoes}</td><td className="px-1 py-3 text-center text-green-600 font-bold">{stat.pctComMdfe.toFixed(0)}%</td><td className="px-1 py-3 text-center text-red-600 font-bold">{stat.pctSemMdfe.toFixed(0)}%</td></tr>))}</tbody></table></div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
