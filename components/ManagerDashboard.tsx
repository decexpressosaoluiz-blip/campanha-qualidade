
import React, { useState, useMemo, useRef } from 'react';
import { UnitStats, Cte } from '../types';
import Card from './Card';
import { DollarSign, Truck, FileText, Search, ArrowUpDown, Calendar, LayoutDashboard, Building2, AlertTriangle, ArrowUp, ArrowDown, Clock, Camera, CameraOff, Download, Info, TrendingUp, Target } from 'lucide-react';
import { normalizeStatus, DashboardSummary } from '../services/calculationService';
import DailyRevenueChart from './DailyRevenueChart';
import { toPng } from 'html-to-image';

interface ManagerDashboardProps {
  stats: UnitStats[];
  summary: DashboardSummary;
  allCtes: Cte[];
  onSelectUnit: (unit: string) => void;
  onDateFilterChange: (start: string, end: string) => void;
  dateRange: { start: string, end: string };
  lastUpdate: Date;
  fixedDays: { total: number; elapsed: number };
}

type SortDirection = 'asc' | 'desc';
type DashboardTab = 'gerencial' | 'unidades';

type SalesSortField = 'unidade' | 'faturamento' | 'meta' | 'projecao' | 'percentualProjecao';
type DeliverySortField = 'unidade' | 'totalRecebimentos' | 'pctNoPrazo' | 'pctSemBaixa' | 'pctForaPrazo';
type PhotoSortField = 'unidade' | 'totalFotos' | 'pctComFoto' | 'pctSemFoto';

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ stats, summary, allCtes, onSelectUnit, onDateFilterChange, dateRange, lastUpdate, fixedDays }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('gerencial');
  const [filter, setFilter] = useState('');
  const [highlightedUnit, setHighlightedUnit] = useState<string | null>(null);
  
  const financialRef = useRef<HTMLDivElement>(null);
  const salesRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  
  const [salesSort, setSalesSort] = useState<{field: SalesSortField, dir: SortDirection}>({ field: 'faturamento', dir: 'desc' });
  const [deliverySort, setDeliverySort] = useState<{field: DeliverySortField, dir: SortDirection}>({ field: 'pctNoPrazo', dir: 'desc' });
  const [photoSort, setPhotoSort] = useState<{field: PhotoSortField, dir: SortDirection}>({ field: 'pctComFoto', dir: 'desc' });

  const [deliveryLocalStart, setDeliveryLocalStart] = useState('');
  const [deliveryLocalEnd, setDeliveryLocalEnd] = useState('');
  
  const [photoLocalStart, setPhotoLocalStart] = useState('');
  const [photoLocalEnd, setPhotoLocalEnd] = useState('');

  const filteredStats = useMemo(() => stats.filter(s => s.unidade.includes(filter.toUpperCase())), [stats, filter]);

  const unitSummary = useMemo(() => {
    return filteredStats.reduce((acc, curr) => ({
      faturamento: acc.faturamento + curr.faturamento,
      meta: acc.meta + curr.meta,
      projecao: acc.projecao + curr.projecao,
    }), { faturamento: 0, meta: 0, projecao: 0 });
  }, [filteredStats]);

  const deliveryStatsLocal = useMemo(() => {
    if (!deliveryLocalStart && !deliveryLocalEnd) return summary.pendencias;
    
    let ok = 0, pend = 0, atraso = 0;
    const start = deliveryLocalStart ? new Date(deliveryLocalStart + 'T00:00:00') : null;
    const end = deliveryLocalEnd ? new Date(deliveryLocalEnd + 'T23:59:59') : null;

    allCtes.forEach(cte => {
      if (!cte.prazoBaixa) return;
      if (start && cte.prazoBaixa < start) return;
      if (end && cte.prazoBaixa > end) return;
      
      const statusPrazo = normalizeStatus(cte.statusPrazo);
      const statusEntrega = normalizeStatus(cte.statusEntrega);
      const isSemBaixa = statusPrazo === '' || statusPrazo === 'SEM DATA' || statusEntrega === 'SEM BAIXA' || statusEntrega.includes('NÃO BAIXADO');
      
      if (isSemBaixa) pend++;
      else if (statusPrazo === 'NO PRAZO') ok++;
      else atraso++;
    });

    return { ok, pend, atraso };
  }, [allCtes, deliveryLocalStart, deliveryLocalEnd, summary.pendencias]);

  const photoStatsLocal = useMemo(() => {
    let com = 0, sem = 0;
    const start = photoLocalStart ? new Date(photoLocalStart + 'T00:00:00') : null;
    const end = photoLocalEnd ? new Date(photoLocalEnd + 'T23:59:59') : null;

    if (photoLocalStart || photoLocalEnd) {
      allCtes.forEach(cte => {
        if (!cte.dataBaixa) return;
        if (start && cte.dataBaixa < start) return;
        if (end && cte.dataBaixa > end) return;

        const statusEntrega = normalizeStatus(cte.statusEntrega);
        if (statusEntrega.includes('COM FOTO')) com++;
        else if (statusEntrega.includes('SEM FOTO')) sem++;
      });
      return { com, sem };
    }
    return { com: summary.fotos.comFoto, sem: summary.fotos.semFoto };
  }, [allCtes, photoLocalStart, photoLocalEnd, summary.fotos]);

  const totalBaseFotosLocal = photoStatsLocal.com + photoStatsLocal.sem;
  const pctFotoOk = totalBaseFotosLocal > 0 ? (photoStatsLocal.com / totalBaseFotosLocal) * 100 : 0;
  const pctFotoSem = totalBaseFotosLocal > 0 ? (photoStatsLocal.sem / totalBaseFotosLocal) * 100 : 0;

  const handleUnitClick = (unit: string) => {
    setHighlightedUnit(unit);
    setTimeout(() => setHighlightedUnit(null), 1500);
    onSelectUnit(unit);
  };

  const exportElement = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { 
        backgroundColor: '#F8F9FD', 
        quality: 1,
        filter: (node) => {
           if (node.tagName === 'BUTTON') return false;
           return true;
        }
      });
      const link = document.createElement('a');
      link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar imagem:', err);
    }
  };

  const generalPercentProj = unitSummary.meta > 0 ? (unitSummary.projecao / unitSummary.meta) * 100 : 0;
  const remainingDays = Math.max(1, fixedDays.total - fixedDays.elapsed);
  const metaDoDiaGeral = Math.max(0, unitSummary.meta - unitSummary.faturamento) / remainingDays;
  const percentageRealized = unitSummary.meta > 0 ? (unitSummary.faturamento / unitSummary.meta) * 100 : 0;

  const sortedSalesStats = useMemo(() => [...filteredStats].sort((a, b) => {
    const valA = a[salesSort.field];
    const valB = b[salesSort.field];
    return salesSort.dir === 'asc' ? (valA < valB ? -1 : 1) : (valB < valA ? -1 : 1);
  }), [filteredStats, salesSort]);

  const sortedDeliveryStats = useMemo(() => {
    return filteredStats.map(s => {
      const total = s.baixaNoPrazo + s.baixaForaPrazo + s.semBaixa;
      return { ...s, totalRecebimentos: total, pctNoPrazo: total > 0 ? (s.baixaNoPrazo / total) * 100 : 0, pctSemBaixa: total > 0 ? (s.semBaixa / total) * 100 : 0, pctForaPrazo: total > 0 ? (s.baixaForaPrazo / total) * 100 : 0 };
    }).sort((a, b) => {
      const valA = a[deliverySort.field as keyof typeof a] as number;
      const valB = b[deliverySort.field as keyof typeof b] as number;
      return deliverySort.dir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStats, deliverySort]);

  const sortedPhotoStats = useMemo(() => {
    return filteredStats.map(s => {
      const totalComS = s.comFoto + s.semFoto;
      return { ...s, totalBaseFotos: totalComS, pctComFoto: totalComS > 0 ? (s.comFoto / totalComS) * 100 : 0, pctSemFoto: totalComS > 0 ? (s.semFoto / totalComS) * 100 : 0 };
    }).sort((a, b) => {
      const valA = a[photoSort.field as keyof typeof a] as number;
      const valB = b[photoSort.field as keyof typeof b] as number;
      return photoSort.dir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStats, photoSort]);

  const SortIcon = ({ active, dir }: { active: boolean, dir: SortDirection }) => (
    active ? (dir === 'asc' ? <ArrowUp className="w-2.5 h-2.5 ml-1 text-sle-primary" /> : <ArrowDown className="w-2.5 h-2.5 ml-1 text-sle-primary" />) : <ArrowUpDown className="w-2.5 h-2.5 ml-1 opacity-20" />
  );

  const displayDateStr = useMemo(() => {
    const [y, m, d] = summary.dataVendasDia.split('-');
    return `${d}/${m}`;
  }, [summary.dataVendasDia]);

  const totalPend = deliveryStatsLocal.ok + deliveryStatsLocal.pend + deliveryStatsLocal.atraso;
  const pctOk = totalPend > 0 ? (deliveryStatsLocal.ok / totalPend) * 100 : 0;
  const pctPend = totalPend > 0 ? (deliveryStatsLocal.pend / totalPend) * 100 : 0;
  const pctAtraso = totalPend > 0 ? (deliveryStatsLocal.atraso / totalPend) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white px-6 py-4 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50/50 p-2 rounded-xl">
             <Clock className="w-4 h-4 text-sle-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Status Sistema</span>
            <span className="font-semibold text-sm text-gray-700 uppercase tracking-tight mt-0.5">Atualizado: {lastUpdate.toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
              <button onClick={() => setActiveTab('gerencial')} className={`flex items-center px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${activeTab === 'gerencial' ? 'bg-white text-sle-primary shadow-sm ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600'}`}><LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Visão Geral</button>
              <button onClick={() => setActiveTab('unidades')} className={`flex items-center px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${activeTab === 'unidades' ? 'bg-white text-sle-primary shadow-sm ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600'}`}><Building2 className="w-3.5 h-3.5 mr-2" /> Agências</button>
            </div>
            
            <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm hover:border-sle-primary/30 transition-colors group">
               <Calendar className="w-4 h-4 text-gray-400 group-hover:text-sle-primary transition-colors" />
               <input type="date" value={dateRange.start} onChange={(e) => onDateFilterChange(e.target.value, dateRange.end)} className="bg-transparent text-[10px] outline-none w-24 font-bold text-gray-600 uppercase" />
               <span className="text-gray-300">-</span>
               <input type="date" value={dateRange.end} onChange={(e) => onDateFilterChange(dateRange.start, e.target.value)} className="bg-transparent text-[10px] outline-none w-24 font-bold text-gray-600 uppercase" />
            </div>
        </div>
      </div>

      {activeTab === 'gerencial' ? (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="PENDÊNCIAS DE ENTREGA" icon={<Truck className="w-5 h-5 opacity-40"/>} variant="warning">
               <div className="flex flex-col gap-4">
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center">
                      <span className="text-[9px] font-semibold text-gray-400 uppercase mb-2 tracking-widest leading-none">Filtrar Prazo (F):</span>
                      <div className="flex items-center gap-1">
                          <input type="date" value={deliveryLocalStart} onChange={(e) => setDeliveryLocalStart(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-28 font-medium shadow-sm text-center uppercase text-gray-600" />
                          <span className="text-gray-300">-</span>
                          <input type="date" value={deliveryLocalEnd} onChange={(e) => setDeliveryLocalEnd(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-28 font-medium shadow-sm text-center uppercase text-gray-600" />
                      </div>
                  </div>
                 <div className="flex gap-3 h-[90px]">
                   <div className="flex-1 flex flex-col items-center justify-center border border-green-100 bg-green-50/20 rounded-xl">
                      <span className="text-2xl font-bold text-green-700 leading-none">{deliveryStatsLocal.ok}</span>
                      <span className="text-[9px] font-semibold text-green-600 mt-2 uppercase tracking-tight">{pctOk.toFixed(0)}% NO PRAZO</span>
                   </div>
                   <div className="flex-1 flex flex-col items-center justify-center border border-yellow-200 bg-yellow-50/40 rounded-xl shadow-sm">
                      <span className="text-2xl font-bold text-yellow-700 leading-none">{deliveryStatsLocal.pend}</span>
                      <span className="text-[9px] font-semibold text-yellow-600 mt-2 uppercase tracking-tight">{pctPend.toFixed(0)}% SEM BAIXA</span>
                   </div>
                   <div className="flex-1 flex flex-col items-center justify-center border border-red-100 bg-red-50/20 rounded-xl">
                      <span className="text-2xl font-bold text-red-700 leading-none">{deliveryStatsLocal.atraso}</span>
                      <span className="text-[9px] font-semibold text-red-600 mt-2 uppercase tracking-tight">{pctAtraso.toFixed(0)}% FORA</span>
                   </div>
                 </div>
               </div>
            </Card>

            <Card title="STATUS ENTREGA (FOTO)" icon={<Camera className="w-5 h-5 opacity-40"/>} variant="success">
               <div className="flex flex-col gap-4">
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col items-center">
                      <span className="text-[9px] font-semibold text-gray-400 uppercase mb-2 tracking-widest leading-none">Filtrar Baixa (D):</span>
                      <div className="flex items-center gap-1">
                          <input type="date" value={photoLocalStart} onChange={(e) => setPhotoLocalStart(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-28 font-medium shadow-sm text-center uppercase text-gray-600" />
                          <span className="text-gray-300">-</span>
                          <input type="date" value={photoLocalEnd} onChange={(e) => setPhotoLocalEnd(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-28 font-medium shadow-sm text-center uppercase text-gray-600" />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 h-[90px] items-center text-center">
                     <div className="flex flex-col items-center justify-center border border-green-100 bg-green-50/20 p-2.5 rounded-xl h-full">
                        <span className="text-2xl font-bold text-green-700 leading-none">{photoStatsLocal.com}</span>
                        <span className="text-[9px] font-semibold text-green-600 uppercase mt-2 tracking-tight">{pctFotoOk.toFixed(0)}% COM FOTO</span>
                     </div>
                     <div className="flex flex-col items-center justify-center border border-red-200 bg-red-50/40 p-2.5 rounded-xl h-full shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1">
                           <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                        </div>
                        <span className="text-2xl font-bold text-red-700 leading-none">{photoStatsLocal.sem}</span>
                        <span className="text-[9px] font-semibold text-red-600 uppercase mt-2 tracking-tight">{pctFotoSem.toFixed(0)}% SEM FOTO</span>
                     </div>
                  </div>
               </div>
            </Card>

            <Card title="MANIFESTOS" icon={<FileText className="w-5 h-5 opacity-40"/>} variant="danger">
               <div className="flex flex-col gap-3 py-1 justify-center h-[178px]">
                  <div className="flex justify-between items-center p-4 rounded-xl bg-green-50/30 border border-green-100/50 hover:bg-green-50/60 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-green-800 uppercase tracking-tight">Com MDFE</span>
                      <span className="text-[9px] font-semibold text-green-600 mt-1 uppercase">{(summary.manifestos.comMdfe / Math.max(1, summary.manifestos.comMdfe + summary.manifestos.semMdfe) * 100).toFixed(0)}% COBERTURA</span>
                    </div>
                    <span className="font-bold text-2xl text-green-700 leading-none">{summary.manifestos.comMdfe}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-red-50/30 border border-red-100/50 hover:bg-red-50/60 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-red-800 uppercase tracking-tight">Sem MDFE</span>
                      <span className="text-[9px] font-semibold text-red-600 mt-1 uppercase">{(summary.manifestos.semMdfe / Math.max(1, summary.manifestos.comMdfe + summary.manifestos.semMdfe) * 100).toFixed(0)}% PENDENTE</span>
                    </div>
                    <span className="text-2xl font-bold text-red-700 leading-none">{summary.manifestos.semMdfe}</span>
                  </div>
               </div>
            </Card>
          </div>

          <div ref={financialRef} className="space-y-6">
            <Card title="FATURAMENTO CONSOLIDADO" icon={<DollarSign className="w-5 h-5 opacity-40" />} variant="primary" className={`${highlightedUnit ? 'ring-2 ring-sle-primary shadow-xl' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center py-2">
                
                {/* Coluna 1: Realizado e Meta (Reestruturado para não sobrepor) */}
                <div className="col-span-1 flex flex-col justify-center pl-2 border-r border-gray-100 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-100 p-1 rounded-md">
                            <TrendingUp className="w-3.5 h-3.5 text-sle-primary" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Realizado Total</p>
                    </div>
                    
                    <span className="text-3xl sm:text-4xl font-bold text-[#0F103A] tracking-tight truncate" title={summary.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
                        {summary.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </span>
                    
                    <div className="mt-4 pt-3 border-t border-gray-50">
                        <div className="flex justify-between items-end mb-1">
                             <span className="text-[10px] font-semibold text-gray-400 uppercase">Meta Global</span>
                             <span className="text-[11px] font-bold text-gray-600">{unitSummary.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-sle-primary rounded-full" style={{ width: `${Math.min(percentageRealized, 100)}%` }}></div>
                        </div>
                        <div className="text-right mt-1">
                            <span className="text-[9px] font-bold text-sle-primary">{percentageRealized.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                
                {/* Coluna 2 e 3: Projeção */}
                <div className="col-span-1 md:col-span-2 w-full bg-gradient-to-br from-[#F8F9FE] to-[#eff2fc] p-5 rounded-xl border border-blue-50/50 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-end mb-4 relative z-10">
                      <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-1">Projeção Consolidada</span>
                          <span className="font-bold text-sle-primary text-3xl tracking-tight">{unitSummary.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="text-right">
                          <span className={`text-3xl font-bold ${generalPercentProj >= 100 ? 'text-green-600' : 'text-red-500'} tracking-tighter`}>{generalPercentProj.toFixed(1)}%</span>
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">Atingimento</p>
                      </div>
                    </div>
                    <div className="relative w-full h-2.5 bg-gray-200/50 rounded-full overflow-hidden">
                        <div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${generalPercentProj >= 100 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(generalPercentProj, 100)}%` }}></div>
                        <div className="absolute top-0 left-0 h-full w-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] opacity-30 animate-[pulse_2s_infinite]"></div>
                    </div>
                </div>

                {/* Coluna 4: Diário */}
                <div className="col-span-1 w-full space-y-3 pl-2 border-l border-gray-100">
                    <div className="bg-white border border-blue-100 rounded-xl p-3 flex justify-between items-center shadow-[0_2px_8px_rgba(46,49,180,0.04)]">
                        <span className="text-[9px] font-bold text-blue-900/60 uppercase tracking-tighter">Vendas {displayDateStr}</span>
                        <span className="text-lg font-bold text-[#2E31B4] leading-none">{summary.vendasDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Meta Diária (Grupo)</span>
                        <span className="text-lg font-bold text-gray-700 leading-none">{metaDoDiaGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
              </div>
            </Card>

            <div className="relative group">
              <DailyRevenueChart ctes={allCtes} startDate={dateRange.start ? new Date(dateRange.start + 'T00:00:00') : undefined} endDate={dateRange.end ? new Date(dateRange.end + 'T23:59:59') : undefined} />
              <button onClick={() => exportElement(financialRef, 'faturamento-e-tendencia')} className="absolute top-4 right-4 p-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-400 hover:text-sle-primary transition-all opacity-0 group-hover:opacity-100 z-10" title="Exportar Gráfico (PNG)"><Download className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="relative flex-grow">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input type="text" placeholder="Filtrar Agência por nome..." className="pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-full outline-none focus:ring-2 focus:ring-sle-primary/20 focus:border-sle-primary bg-gray-50/50 font-medium placeholder-gray-400 transition-all" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div ref={salesRef} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden border border-gray-100 xl:col-span-2">
                <div className="p-4 border-b border-gray-50 bg-[#F8F9FD] flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500">Ranking Financeiro</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => exportElement(salesRef, 'ranking-financeiro')} className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-sle-primary hover:bg-gray-50 transition-all shadow-sm" title="Baixar como Imagem">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <Info className="w-4 h-4 text-gray-300 cursor-help" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left table-fixed min-w-[700px]">
                    <thead className="bg-white text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 font-bold uppercase tracking-wider text-[10px] cursor-pointer hover:bg-gray-50 text-gray-400" onClick={() => setSalesSort({field:'unidade', dir: salesSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center">AGÊNCIA <SortIcon active={salesSort.field === 'unidade'} dir={salesSort.dir} /></div></th>
                        <th className="px-3 py-3 text-right font-bold uppercase tracking-wider text-[10px] cursor-pointer hover:bg-gray-50 text-gray-400" onClick={() => setSalesSort({field:'faturamento', dir: salesSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-end">VENDAS <SortIcon active={salesSort.field === 'faturamento'} dir={salesSort.dir} /></div></th>
                        <th className="px-3 py-3 text-right font-bold uppercase tracking-wider text-[10px] cursor-pointer hover:bg-gray-50 text-gray-400" onClick={() => setSalesSort({field:'meta', dir: salesSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-end">META <SortIcon active={salesSort.field === 'meta'} dir={salesSort.dir} /></div></th>
                        <th className="px-3 py-3 text-right font-bold uppercase tracking-wider text-[10px] cursor-pointer hover:bg-gray-50 text-gray-400" onClick={() => setSalesSort({field:'projecao', dir: salesSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-end">PROJEÇÃO <SortIcon active={salesSort.field === 'projecao'} dir={salesSort.dir} /></div></th>
                        <th className="px-6 py-3 text-center font-bold uppercase tracking-wider text-[10px] cursor-pointer hover:bg-gray-50 text-gray-400" onClick={() => setSalesSort({field:'percentualProjecao', dir: salesSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-center">% META <SortIcon active={salesSort.field === 'percentualProjecao'} dir={salesSort.dir} /></div></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sortedSalesStats.map(stat => (
                        <tr key={stat.unidade} onClick={() => handleUnitClick(stat.unidade)} className="hover:bg-blue-50/30 cursor-pointer transition-colors group">
                          <td className="px-6 py-3.5 font-bold text-xs uppercase text-[#0F103A] group-hover:text-sle-primary truncate">{stat.unidade}</td>
                          <td className="px-3 py-3.5 text-right font-medium text-gray-600 text-xs">{stat.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-3.5 text-right font-medium text-gray-400 text-xs">{stat.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-3.5 text-right text-sle-primary font-bold text-xs">{stat.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stat.percentualProjecao >= 100 ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{stat.percentualProjecao.toFixed(0)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>

            <div ref={deliveryRef} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-50 bg-[#F8F9FD] flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500">Ranking Entregas</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => exportElement(deliveryRef, 'ranking-entregas')} className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-sle-primary hover:bg-gray-50 transition-all shadow-sm">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <Info className="w-4 h-4 text-gray-300 cursor-help" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left table-fixed min-w-[400px]">
                    <thead className="bg-white text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 cursor-pointer text-[10px] uppercase font-bold tracking-wider hover:bg-gray-50 text-gray-400" onClick={() => setDeliverySort({field:'unidade', dir: deliverySort.dir==='asc'?'desc':'asc'})}><div className="flex items-center">AGÊNCIA <SortIcon active={deliverySort.field === 'unidade'} dir={deliverySort.dir} /></div></th>
                        <th className="text-center cursor-pointer text-[10px] uppercase font-bold tracking-wider hover:bg-gray-50 text-gray-400" onClick={() => setDeliverySort({field:'pctNoPrazo', dir: deliverySort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-center">% OK <SortIcon active={deliverySort.field === 'pctNoPrazo'} dir={deliverySort.dir} /></div></th>
                        <th className="text-center cursor-pointer text-[10px] uppercase font-bold tracking-wider hover:bg-gray-50 text-yellow-600/70" onClick={() => setDeliverySort({field:'pctSemBaixa', dir: deliverySort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-center">% PEN <SortIcon active={deliverySort.field === 'pctSemBaixa'} dir={deliverySort.dir} /></div></th>
                        <th className="text-center cursor-pointer text-[10px] uppercase font-bold tracking-wider hover:bg-gray-50 text-red-600/70" onClick={() => setDeliverySort({field:'pctForaPrazo', dir: deliverySort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-center">% ATR <SortIcon active={deliverySort.field === 'pctForaPrazo'} dir={deliverySort.dir} /></div></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sortedDeliveryStats.map(stat => (
                        <tr key={stat.unidade} onClick={() => handleUnitClick(stat.unidade)} className="hover:bg-yellow-50/10 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-bold text-xs uppercase text-gray-700 truncate">{stat.unidade}</td>
                          <td className="px-1 py-3 text-center text-green-600 font-bold text-xs">{stat.pctNoPrazo.toFixed(0)}%</td>
                          <td className="px-1 py-3 text-center text-yellow-600 font-bold text-xs">{stat.pctSemBaixa.toFixed(0)}%</td>
                          <td className="px-1 py-3 text-center text-red-600 font-bold text-xs">{stat.pctForaPrazo.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>

            <div ref={photoRef} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-50 bg-[#F8F9FD] flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500">Ranking Fotos</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => exportElement(photoRef, 'ranking-fotos')} className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-sle-primary hover:bg-gray-50 transition-all shadow-sm">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <Info className="w-4 h-4 text-gray-300 cursor-help" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left table-fixed min-w-[400px]">
                    <thead className="bg-white text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 cursor-pointer text-[10px] uppercase font-bold tracking-wider hover:bg-gray-50 text-gray-400" onClick={() => setPhotoSort({field:'unidade', dir: photoSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center">AGÊNCIA <SortIcon active={photoSort.field === 'unidade'} dir={photoSort.dir} /></div></th>
                        <th className="text-center cursor-pointer text-[10px] uppercase font-bold tracking-wider hover:bg-gray-50 text-green-700/70" onClick={() => setPhotoSort({field:'pctComFoto', dir: photoSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-center">% FOTO <SortIcon active={photoSort.field === 'pctComFoto'} dir={photoSort.dir} /></div></th>
                        <th className="text-center cursor-pointer text-[10px] uppercase font-bold tracking-wider hover:bg-gray-50 text-red-600/70" onClick={() => setPhotoSort({field:'pctSemFoto', dir: photoSort.dir==='asc'?'desc':'asc'})}><div className="flex items-center justify-center">% SEM <SortIcon active={photoSort.field === 'pctSemFoto'} dir={photoSort.dir} /></div></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sortedPhotoStats.map(stat => (
                        <tr key={stat.unidade} onClick={() => handleUnitClick(stat.unidade)} className="hover:bg-green-50/10 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-bold text-xs uppercase text-gray-700 truncate">{stat.unidade}</td>
                          <td className="px-1 py-3 text-center text-green-600 font-bold text-xs">{stat.pctComFoto.toFixed(0)}%</td>
                          <td className="px-1 py-3 text-center text-red-600 font-bold text-xs">{stat.pctSemFoto.toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
