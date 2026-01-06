
import React, { useState, useMemo, useRef } from 'react';
import { UnitStats, SortField, Cte } from '../types';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts';
import Card from './Card';
import { DollarSign, Truck, FileText, Search, ArrowUpDown, Calendar, Filter, AlertTriangle, CheckCircle, XCircle, ChevronDown, Clock, Info, Image as ImageIcon } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { normalizeStatus } from '../services/calculationService';

interface ManagerDashboardProps {
  stats: UnitStats[];
  allCtes: Cte[];
  onSelectUnit: (unit: string) => void;
  onDateFilterChange: (start: string, end: string) => void;
  dateRange: { start: string, end: string };
  lastUpdate: Date;
  fixedDays: { total: number; elapsed: number };
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ stats, allCtes, onSelectUnit, onDateFilterChange, dateRange, lastUpdate, fixedDays }) => {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('faturamento'); 
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const defaultDeliveryEnd = lastUpdate.toISOString().split('T')[0];
  const [deliveryFilter, setDeliveryFilter] = useState({ start: '', end: defaultDeliveryEnd });

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
    const start = deliveryFilter.start ? new Date(deliveryFilter.start + 'T00:00:00') : null;
    const end = deliveryFilter.end ? new Date(deliveryFilter.end + 'T23:59:59') : null;

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
      total,
      noPrazo: countNoPrazo,
      foraPrazo: countForaPrazo,
      semBaixa: countSemBaixa,
      pctNoPrazo: total > 0 ? (countNoPrazo / total) * 100 : 0,
      pctSemBaixa: total > 0 ? (countSemBaixa / total) * 100 : 0,
    };
  }, [allCtes, deliveryFilter]);

  const generalPercentProj = totalStats.meta > 0 ? (totalStats.projecao / totalStats.meta) * 100 : 0;
  const generalPercentFat = totalStats.meta > 0 ? (totalStats.faturamento / totalStats.meta) * 100 : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'unidade' ? 'asc' : 'desc');
    }
  };

  const sortedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      let valA = 0, valB = 0;
      switch (sortField) {
        case 'unidade': return sortDirection === 'asc' ? a.unidade.localeCompare(b.unidade) : b.unidade.localeCompare(a.unidade);
        case 'faturamento': valA = a.faturamento; valB = b.faturamento; break;
        case 'projecao': valA = a.percentualProjecao; valB = b.percentualProjecao; break;
        case 'noPrazo':
           const tA = a.baixaNoPrazo + a.baixaForaPrazo + a.semBaixa;
           const tB = b.baixaNoPrazo + b.baixaForaPrazo + b.semBaixa;
           valA = tA > 0 ? a.baixaNoPrazo / tA : 0;
           valB = tB > 0 ? b.baixaNoPrazo / tB : 0;
           break;
        case 'semBaixa': valA = a.semBaixa; valB = b.semBaixa; break;
        case 'semMdfe':
          const tMdfeA = a.comMdfe + a.semMdfe;
          const tMdfeB = b.comMdfe + b.semMdfe;
          valA = tMdfeA > 0 ? a.semMdfe / tMdfeA : 0;
          valB = tMdfeB > 0 ? b.semMdfe / tMdfeB : 0;
          break;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStats, sortField, sortDirection]);

  const handleDownloadImage = async () => {
    if (!exportContainerRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const dataUrl = await toJpeg(exportContainerRef.current, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Ranking_SLE_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.jpeg`;
      link.href = dataUrl; link.click();
    } catch (err) { alert('Erro ao gerar imagem.'); } 
    finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 px-1 sm:px-0">
      
      {/* Export View (Hidden) */}
      <div style={{ position: 'absolute', left: '-9999px' }}><div ref={exportContainerRef} style={{ padding: '40px', background: '#fff', width: '850px' }}></div></div>

      {/* Toolbar */}
      <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center text-sle-primary bg-blue-50 px-3 py-1.5 rounded-full">
          <Clock className="w-4 h-4 mr-2" />
          <span className="font-semibold text-xs sm:text-sm uppercase tracking-tight">Atualizado: {lastUpdate.toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            <div className="relative w-full md:min-w-[240px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input type="text" placeholder="Buscar unidade..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs w-full outline-none focus:ring-2 focus:ring-sle-primary focus:border-transparent bg-gray-50/50 transition-all" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
               <Calendar className="w-4 h-4 text-gray-400" />
               <input type="date" value={dateRange.start} onChange={(e) => onDateFilterChange(e.target.value, dateRange.end)} className="bg-transparent text-[11px] sm:text-xs outline-none w-26 font-semibold text-gray-600" />
               <span className="text-gray-300">-</span>
               <input type="date" value={dateRange.end} onChange={(e) => onDateFilterChange(dateRange.start, e.target.value)} className="bg-transparent text-[11px] sm:text-xs outline-none w-26 font-semibold text-gray-600" />
            </div>
            <div className="hidden sm:flex text-[10px] font-bold text-blue-800 bg-blue-100/50 px-3 py-2 rounded-lg border border-blue-200/50 uppercase tracking-widest leading-none">
               DIAS: {fixedDays.elapsed}/{fixedDays.total}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FATURAMENTO CARD */}
        <Card title="FATURAMENTO GERAL" icon={<DollarSign className="w-5 h-5 text-sle-primary opacity-50"/>} className="border-l-sle-primary shadow-sm hover:shadow-md transition-shadow">
           <div className="space-y-4">
             <div>
               <div className="text-3xl font-bold text-[#0F103A] tracking-tight leading-none">
                 {totalStats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
               </div>
               <div className="text-[10px] text-gray-400 mt-2 font-semibold uppercase tracking-wider">Meta Total: {totalStats.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</div>
             </div>
             <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex flex-col">
                      <span className="text-[9px] uppercase text-gray-400 font-semibold tracking-wide">Projeção Total</span>
                      <span className="font-bold text-sle-primary text-lg leading-none">{totalStats.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                   </div>
                   <span className={`text-xl font-bold ${generalPercentProj >= 100 ? 'text-green-600' : 'text-red-600'}`}>{generalPercentProj.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${generalPercentProj >= 100 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(generalPercentFat, 100)}%` }}></div>
                </div>
             </div>
             <div className="bg-blue-50/40 border border-blue-100/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-tight">Vendas do dia {lastUpdate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
                  <span className="text-sm font-bold text-[#2E31B4]">
                    {totalStats.vendasDiaAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
             </div>
           </div>
        </Card>

        {/* PENDÊNCIAS CARD */}
        <Card title="PENDÊNCIAS DE ENTREGA" icon={<Truck className="w-5 h-5 text-warning opacity-50"/>} className="border-l-warning shadow-sm hover:shadow-md transition-shadow">
           <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between gap-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-tight leading-none">Filtrar Prazo:</span>
                <div className="flex items-center gap-1">
                   <input type="date" value={deliveryFilter.start} onChange={(e) => setDeliveryFilter(p => ({...p, start: e.target.value}))} className="bg-white border border-gray-200 rounded text-[10px] px-1.5 py-1 focus:ring-1 focus:ring-warning" />
                   <input type="date" value={deliveryFilter.end} onChange={(e) => setDeliveryFilter(p => ({...p, end: e.target.value}))} className="bg-white border border-gray-200 rounded text-[10px] px-1.5 py-1 focus:ring-1 focus:ring-warning" />
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
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50/50 rounded-md mt-2 py-0.5">ATRASO</span>
               </div>
             </div>
           </div>
        </Card>

        {/* MANIFESTOS CARD */}
        <Card title="MANIFESTOS" icon={<FileText className="w-5 h-5 text-danger opacity-50"/>} className="border-l-danger shadow-sm hover:shadow-md transition-shadow">
           <div className="flex flex-col gap-3 py-1 justify-center min-h-[140px]">
              <div className="flex justify-between items-center p-4 rounded-lg bg-green-50/40 border border-green-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-green-800 uppercase tracking-tight leading-none">Com MDFE</span>
                  <span className="text-[9px] font-medium text-green-600 mt-1">{((totalStats.comMdfe / Math.max(1, totalStats.comMdfe + totalStats.semMdfe)) * 100).toFixed(0)}% Cobertura</span>
                </div>
                <span className="font-bold text-2xl text-green-600 leading-none">{totalStats.comMdfe}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-red-50/40 border border-red-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-red-800 uppercase tracking-tight leading-none">Sem MDFE</span>
                  <span className="text-[9px] font-medium text-red-600 mt-1">{((totalStats.semMdfe / Math.max(1, totalStats.comMdfe + totalStats.semMdfe)) * 100).toFixed(0)}% Pendente</span>
                </div>
                <span className="text-2xl font-bold text-red-600 leading-none">{totalStats.semMdfe}</span>
              </div>
           </div>
        </Card>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mt-6">
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
             <Filter className="text-sle-primary w-4 h-4"/>
             <h3 className="font-semibold text-[#0F103A] text-xs sm:text-sm uppercase tracking-wider">Ranking Geral de Unidades</h3>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <button disabled={isExporting} onClick={handleDownloadImage} className="flex-1 sm:flex-none flex items-center justify-center bg-[#059669] text-white px-4 py-2.5 rounded-lg shadow-sm text-[10px] sm:text-xs font-semibold uppercase tracking-widest hover:bg-[#047857] active:scale-95 transition-all">
                <ImageIcon className="w-4 h-4 mr-2" /> Baixar Imagem
             </button>
             <div className="relative group flex-1 sm:flex-none">
                <button className="w-full flex items-center justify-center space-x-2 text-[10px] sm:text-xs text-gray-700 bg-white border border-gray-200 py-2.5 px-4 rounded-lg shadow-sm hover:bg-gray-50 font-semibold uppercase tracking-tight">
                  <ArrowUpDown className="w-4 h-4 text-gray-400" /><span>Ordenar</span><ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <div className="absolute top-full right-0 mt-1 w-full min-w-[180px] bg-white border border-gray-100 rounded-xl shadow-xl hidden group-hover:block z-20 overflow-hidden py-1">
                      {['faturamento', 'projecao', 'noPrazo', 'semMdfe'].map(f => (
                        <button key={f} onClick={() => { setSortField(f as SortField); setSortDirection('desc'); }} className={`block w-full text-left px-4 py-2.5 text-[10px] font-semibold hover:bg-blue-50 text-gray-600 uppercase tracking-wider transition-colors ${sortField === f ? 'bg-blue-50 text-sle-primary' : ''}`}>{f === 'faturamento' ? 'Faturamento' : f === 'projecao' ? '% Projeção' : f === 'noPrazo' ? '% Entrega' : 'Sem MDFE'}</button>
                      ))}
                </div>
             </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-[10px] sm:text-sm text-left table-fixed">
            <thead className="bg-[#F8F9FE] text-[#24268B]">
               <tr>
                 <th className="w-[35%] px-3 py-4 font-semibold uppercase truncate tracking-tight" onClick={() => handleSort('unidade')}>Unidade</th>
                 <th className="w-[22%] px-2 py-4 text-right font-semibold uppercase truncate tracking-tight" onClick={() => handleSort('faturamento')}>Vendas</th>
                 <th className="w-[20%] px-2 py-4 text-right font-semibold uppercase truncate tracking-tight" onClick={() => handleSort('projecao')}>Proj</th>
                 <th className="w-[11%] px-1 py-4 text-center font-semibold uppercase truncate tracking-tight" onClick={() => handleSort('projecao')}>%</th>
                 <th className="w-[12%] px-1 py-4 text-center font-semibold uppercase truncate tracking-tight" onClick={() => handleSort('noPrazo')}>OK</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {sortedStats.map((stat) => {
                 const tB = stat.baixaNoPrazo + stat.baixaForaPrazo + stat.semBaixa;
                 const pN = tB > 0 ? (stat.baixaNoPrazo / tB) * 100 : 0;
                 return (
                   <tr key={stat.unidade} onClick={() => onSelectUnit(stat.unidade)} className="hover:bg-blue-50/40 active:bg-blue-100/50 cursor-pointer transition-colors group">
                     <td className="px-3 py-4 font-semibold text-[#0F103A] uppercase truncate group-hover:text-sle-primary">{stat.unidade}</td>
                     <td className="px-2 py-4 text-right text-gray-600 font-semibold truncate leading-none">{stat.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td>
                     <td className="px-2 py-4 text-right text-sle-primary font-bold truncate leading-none">{stat.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td>
                     <td className="px-1 py-4 text-center">
                       <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold ${stat.percentualProjecao >= 100 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{stat.percentualProjecao.toFixed(0)}%</span>
                     </td>
                     <td className="px-1 py-4 text-center">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md ${pN >= 90 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{pN.toFixed(0)}%</span>
                     </td>
                   </tr>
                 );
               })}
               {sortedStats.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">Nenhuma unidade encontrada</td></tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
