
import React, { useState, useMemo } from 'react';
import { UnitStats, Cte, User } from '../types';
import Card from './Card';
import { DollarSign, Truck, FileText, AlertTriangle, Download, ArrowUpDown, ExternalLink, Clock, ArrowUp, ArrowDown, Calendar, Camera, CameraOff } from 'lucide-react';
import { downloadXLS } from '../services/excelService';
import { LINKS } from '../constants';
import { normalizeStatus } from '../services/calculationService';
import DailyRevenueChart from './DailyRevenueChart';

interface UnitDashboardProps {
  stats: UnitStats;
  onBack: () => void;
  user: User | null;
  setHeaderActions: (actions: React.ReactNode) => void;
  lastUpdate: Date;
  allCtes: Cte[];
  fixedDays: { total: number; elapsed: number };
  dateRange: { start: string, end: string };
  onDateFilterChange: (start: string, end: string) => void;
}

type TabType = 'vendas' | 'baixas' | 'manifestos' | 'fotos';
type SortKey = 'data' | 'id' | 'valor' | 'statusPrazo' | 'statusMdfe' | 'statusEntrega' | 'unidadeEntrega';
type SortDirection = 'asc' | 'desc';

const UnitDashboard: React.FC<UnitDashboardProps> = ({ stats, user, setHeaderActions, lastUpdate, allCtes, fixedDays, dateRange, onDateFilterChange }) => {
  const [activeTab, setActiveTab] = useState<TabType>('vendas');
  const [baixaFilter, setBaixaFilter] = useState<'all' | 'noPrazo' | 'foraPrazo' | 'semBaixa'>('all');
  const [mdfeFilter, setMdfeFilter] = useState<'all' | 'comMdfe' | 'semMdfe'>('all');
  const [fotoFilter, setFotoFilter] = useState<'all' | 'comFoto' | 'semFoto' | 'semBaixaEntrega'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'data', direction: 'desc' });

  const [deliveryStart, setDeliveryStart] = useState('');
  const [deliveryEnd, setDeliveryEnd] = useState('');

  const getDocuments = (): Cte[] => {
    let docs: Cte[] = [];
    switch (activeTab) {
      case 'vendas': docs = [...stats.docsVendas]; break;
      case 'baixas':
        if (baixaFilter === 'all') docs = [...stats.docsSemBaixa, ...stats.docsBaixaForaPrazo, ...stats.docsBaixaNoPrazo];
        else if (baixaFilter === 'noPrazo') docs = [...stats.docsBaixaNoPrazo];
        else if (baixaFilter === 'foraPrazo') docs = [...stats.docsBaixaForaPrazo];
        else if (baixaFilter === 'semBaixa') docs = [...stats.docsSemBaixa];
        break;
      case 'manifestos':
        if (mdfeFilter === 'all') docs = [...stats.docsVendas]; 
        else if (mdfeFilter === 'comMdfe') docs = stats.docsVendas.filter(d => !stats.docsSemMdfe.some(s => s.id === d.id));
        else if (mdfeFilter === 'semMdfe') docs = [...stats.docsSemMdfe];
        break;
      case 'fotos':
        if (fotoFilter === 'all') docs = [...stats.docsVendas];
        else if (fotoFilter === 'comFoto') docs = stats.docsVendas.filter(d => normalizeStatus(d.statusEntrega) === 'COM FOTO');
        else if (fotoFilter === 'semFoto') docs = [...stats.docsSemFoto];
        else if (fotoFilter === 'semBaixaEntrega') docs = stats.docsVendas.filter(d => {
            const s = normalizeStatus(d.statusEntrega);
            return s === 'SEM BAIXA' || s.includes('NÃO BAIXADO');
        });
        break;
    }
    return docs.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortConfig.key === 'id') { aVal = parseInt(a.id) || 0; bVal = parseInt(b.id) || 0; }
      else { aVal = a[sortConfig.key]; bVal = b[sortConfig.key]; }
      if (aVal === bVal) return 0;
      const res = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  };

  const currentDocs = getDocuments();

  const unitDeliveryStats = useMemo(() => {
    let countNoPrazo = 0, countForaPrazo = 0, countSemBaixa = 0;
    const start = deliveryStart ? new Date(deliveryStart + 'T00:00:00') : null;
    const end = deliveryEnd ? new Date(deliveryEnd + 'T23:59:59') : null;

    allCtes.forEach(cte => {
      if (!cte.prazoBaixa || cte.unidadeEntrega !== stats.unidade) return;
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
      pctForaPrazo: total > 0 ? (countForaPrazo / total) * 100 : 0
    };
  }, [allCtes, deliveryStart, deliveryEnd, stats.unidade]);

  const remainingDays = Math.max(1, fixedDays.total - fixedDays.elapsed);
  const metaDoDiaUnit = Math.max(0, stats.meta - stats.faturamento) / remainingDays;

  const handleSort = (key: SortKey) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));

  const filterAndSortByDate = (tab: TabType, filterType: any) => {
    setActiveTab(tab);
    if (tab === 'baixas') setBaixaFilter(filterType);
    if (tab === 'manifestos') setMdfeFilter(filterType);
    if (tab === 'fotos') setFotoFilter(filterType);
    setSortConfig({ key: 'data', direction: 'asc' });
    const tableElement = document.getElementById('listagem-documentos');
    if (tableElement) {
      window.scrollTo({ top: tableElement.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-2.5 h-2.5 ml-0.5 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-2.5 h-2.5 ml-0.5 text-sle-primary" /> : <ArrowDown className="w-2.5 h-2.5 ml-0.5 text-sle-primary" />;
  };

  const filterEndDate = dateRange.end ? new Date(dateRange.end + 'T12:00:00') : lastUpdate;
  const effectiveDate = filterEndDate > lastUpdate ? lastUpdate : filterEndDate;
  const salesLabelDate = new Date(effectiveDate);

  const totalStatusEntrega = stats.comFoto + stats.semFoto + stats.semBaixaEntrega;
  const pctComFoto = totalStatusEntrega > 0 ? (stats.comFoto / totalStatusEntrega) * 100 : 0;
  const pctSemFoto = totalStatusEntrega > 0 ? (stats.semFoto / totalStatusEntrega) * 100 : 0;
  const pctSemBaixaEntrega = totalStatusEntrega > 0 ? (stats.semBaixaEntrega / totalStatusEntrega) * 100 : 0;

  const chartStart = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : undefined;
  const chartEnd = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : undefined;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 px-2 sm:px-0 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
             <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0F103A] tracking-tight">Painel: {stats.unidade}</h2>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1">Gestão Unidade</p>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button onClick={() => downloadXLS(currentDocs, `Relatorio_${stats.unidade}`)} className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-[#059669] text-white rounded-xl font-bold text-xs uppercase shadow-sm hover:bg-[#047857] transition-all">
                    <Download className="w-4 h-4 mr-2" /> Exportar XLS
                </button>
                <a href={LINKS.PENDENCIAS} target="_blank" rel="noreferrer" className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 bg-[#EC1B23] text-white rounded-xl font-bold text-xs uppercase shadow-sm hover:bg-[#C41017] transition-all">
                    <ExternalLink className="w-4 h-4 mr-2" /> Pendências
                </a>
             </div>
        </div>

        <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center text-sle-primary bg-blue-50 px-4 py-2 rounded-xl">
              <Clock className="w-4 h-4 mr-2.5 opacity-60" />
              <span className="font-bold text-xs sm:text-sm uppercase tracking-tight">ATUALIZADO ATÉ: {lastUpdate.toLocaleDateString('pt-BR')}</span>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200/50">
                   <Calendar className="w-4 h-4 text-gray-400" />
                   <input type="date" value={dateRange.start} onChange={(e) => onDateFilterChange(e.target.value, dateRange.end)} className="bg-transparent text-[11px] sm:text-xs outline-none w-26 font-bold text-gray-600" />
                   <span className="text-gray-300">-</span>
                   <input type="date" value={dateRange.end} onChange={(e) => onDateFilterChange(dateRange.start, e.target.value)} className="bg-transparent text-[11px] sm:text-xs outline-none w-26 font-bold text-gray-600" />
                </div>
                <div className="hidden sm:flex text-[10px] font-bold text-blue-800 bg-blue-100/50 px-4 py-2 rounded-xl border border-blue-200/50 uppercase tracking-widest">
                   DIAS: {fixedDays.elapsed}/{fixedDays.total}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 sm:px-0">
        <Card title="PENDÊNCIAS DE ENTREGA" icon={<Truck className="w-5 h-5 text-warning opacity-40" />} className="border-l-warning">
           <div className="flex flex-col gap-4">
              <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-widest leading-none">Filtrar Prazo:</span>
                  <div className="flex items-center gap-1">
                      <input type="date" value={deliveryStart} onChange={(e) => setDeliveryStart(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-26 font-bold shadow-sm" />
                      <span className="text-gray-300">-</span>
                      <input type="date" value={deliveryEnd} onChange={(e) => setDeliveryEnd(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-26 font-bold shadow-sm" />
                  </div>
              </div>
              <div className="flex gap-2 h-[85px]">
                <div onClick={() => filterAndSortByDate('baixas', 'noPrazo')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer ${baixaFilter === 'noPrazo' ? 'border-green-400 bg-green-50 shadow-inner' : 'border-green-100 bg-green-50/30'}`}>
                  <span className="text-2xl font-semibold text-green-700 leading-none">{unitDeliveryStats.noPrazo}</span>
                  <span className="text-[9px] font-bold text-green-600 uppercase mt-2">{unitDeliveryStats.pctNoPrazo.toFixed(0)}% OK</span>
                </div>
                <div onClick={() => filterAndSortByDate('baixas', 'semBaixa')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer z-20 ${baixaFilter === 'semBaixa' ? 'border-yellow-400 bg-yellow-50 shadow-md scale-105 ring-2 ring-yellow-100' : 'border-yellow-200 bg-yellow-50/50'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 mb-1 opacity-70" />
                  <span className="text-2xl font-semibold text-yellow-700 leading-none">{unitDeliveryStats.semBaixa}</span>
                  <span className="text-[9px] font-bold text-yellow-600 uppercase mt-1.5 tracking-tighter">{unitDeliveryStats.pctSemBaixa.toFixed(0)}% PEND</span>
                </div>
                <div onClick={() => filterAndSortByDate('baixas', 'foraPrazo')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer ${baixaFilter === 'foraPrazo' ? 'border-red-400 bg-red-50 shadow-inner' : 'border-red-100 bg-red-50/30'}`}>
                  <span className="text-2xl font-semibold text-red-700 leading-none">{unitDeliveryStats.foraPrazo}</span>
                  <span className="text-[9px] font-bold text-red-600 uppercase mt-2">ATRASO</span>
                </div>
              </div>
           </div>
        </Card>

        <Card title="STATUS ENTREGA (FOTO)" icon={<Camera className="w-5 h-5 text-green-600 opacity-40" />} className="border-l-green-600">
           <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 h-[85px] items-center text-center pt-8">
                 <div onClick={() => filterAndSortByDate('fotos', 'comFoto')} className={`flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer h-full ${fotoFilter === 'comFoto' ? 'border-green-400 bg-green-50 shadow-inner' : 'border-green-100 bg-green-50/20'}`}>
                    <span className="text-2xl font-semibold text-green-700 leading-none">{stats.comFoto}</span>
                    <span className="text-[9px] font-bold text-green-600 uppercase mt-2">{pctComFoto.toFixed(0)}% OK</span>
                 </div>
                 <div onClick={() => filterAndSortByDate('fotos', 'semFoto')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer h-full z-20 ${fotoFilter === 'semFoto' ? 'border-red-400 bg-red-50 shadow-md scale-105 ring-2 ring-red-100' : 'border-red-200 bg-red-50/40'}`}>
                    <CameraOff className="w-3.5 h-3.5 text-red-600 mb-1 opacity-70" />
                    <span className="text-2xl font-semibold text-red-700 leading-none">{stats.semFoto}</span>
                    <span className="text-[9px] font-bold text-red-600 uppercase mt-1.5 tracking-tighter">{pctSemFoto.toFixed(0)}% S/ FOTO</span>
                 </div>
                 <div onClick={() => filterAndSortByDate('fotos', 'semBaixaEntrega')} className={`flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer h-full ${fotoFilter === 'semBaixaEntrega' ? 'border-yellow-400 bg-yellow-50 shadow-inner' : 'border-yellow-100 bg-yellow-50/20'}`}>
                    <span className="text-2xl font-semibold text-yellow-700 leading-none">{stats.semBaixaEntrega}</span>
                    <span className="text-[9px] font-bold text-yellow-600 uppercase mt-2">PND BXA</span>
                 </div>
              </div>
              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center mt-2 opacity-60 leading-none">Comprovantes Digitais</div>
           </div>
        </Card>

        <Card title="MANIFESTOS" icon={<FileText className="w-5 h-5 text-danger opacity-40" />} className="border-l-danger">
           <div className="flex flex-col gap-3 h-[135px] justify-center">
             <div onClick={() => filterAndSortByDate('manifestos', 'comMdfe')} className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${mdfeFilter === 'comMdfe' ? 'border-green-400 bg-green-50 shadow-sm' : 'bg-green-50/30 border-green-100'}`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-green-800 uppercase leading-none tracking-tight">Com MDFE</span>
                  <span className="text-[9px] font-semibold text-green-500 mt-2">{((stats.comMdfe / Math.max(1, stats.comMdfe + stats.semMdfe)) * 100).toFixed(0)}% COBERTURA</span>
                </div>
                <span className="font-semibold text-2xl text-green-600 leading-none">{stats.comMdfe}</span>
             </div>
             <div onClick={() => filterAndSortByDate('manifestos', 'semMdfe')} className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${mdfeFilter === 'semMdfe' ? 'border-red-400 bg-red-50 shadow-sm' : 'bg-red-50/30 border-red-100'}`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-red-800 uppercase leading-none tracking-tight">Sem MDFE</span>
                  <span className="text-[9px] font-semibold text-red-500 mt-2">{((stats.semMdfe / Math.max(1, stats.comMdfe + stats.semMdfe)) * 100).toFixed(0)}% PENDENTE</span>
                </div>
                <span className="font-semibold text-2xl text-red-600 leading-none">{stats.semMdfe}</span>
             </div>
           </div>
        </Card>
      </div>

      {/* REVENUE SECTION */}
      <div className="space-y-4 px-2 sm:px-0">
        <Card title="FATURAMENTO UNIDADE" icon={<DollarSign className="w-5 h-5 text-sle-primary opacity-40" />} className="border-l-sle-primary">
          <div className="flex flex-col md:flex-row items-center gap-10 py-3">
             <div className="flex-1 w-full text-center md:text-left">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none opacity-80">Realizado</p>
                 <span className="text-4xl font-semibold text-[#0F103A] tracking-tighter">{stats.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                 <p className="text-[11px] font-semibold text-gray-400 mt-2 uppercase">META: {stats.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
             </div>
             
             <div className="flex-[2] w-full bg-[#F1F3FB]/70 p-6 rounded-3xl border border-blue-100/50 shadow-inner">
                <div className="flex justify-between items-end mb-4">
                   <div className="flex flex-col">
                      <span className="text-[11px] uppercase text-gray-400 font-bold tracking-widest leading-none">Projeção Final</span>
                      <span className="font-semibold text-sle-primary text-3xl mt-1 tracking-tight">{stats.projecao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                   </div>
                   <div className="text-right">
                      <span className={`text-2xl font-semibold ${stats.percentualProjecao >= 100 ? 'text-green-600' : 'text-red-600'}`}>{stats.percentualProjecao.toFixed(1)}%</span>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Status Meta</p>
                   </div>
                </div>
                <div className="relative w-full h-4 bg-white rounded-full overflow-hidden border border-blue-100 shadow-sm">
                    <div className={`absolute top-0 left-0 h-full transition-all duration-1000 opacity-20 ${stats.percentualProjecao >= 100 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(stats.percentualProjecao, 100)}%` }}></div>
                    <div className={`absolute top-0 left-0 h-full transition-all duration-700 shadow-md ${stats.percentualProjecao >= 100 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min((stats.faturamento / stats.meta) * 100, 100)}%` }}></div>
                </div>
             </div>

             <div className="flex-1 w-full space-y-3">
                <div className="bg-blue-50/80 border border-blue-100/40 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-tighter leading-none">Vendas dia {salesLabelDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
                    <span className="text-2xl font-semibold text-[#2E31B4] leading-none">{stats.vendasDiaAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                </div>
                {/* BALÃO LARANJA DE RECEBIDO RESTAURADO NA UNIDADE */}
                <div className="bg-orange-50/80 border border-orange-200/40 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-bold text-orange-800 uppercase tracking-tighter leading-none">Recebido</span>
                    <span className="text-2xl font-semibold text-orange-700 leading-none">{stats.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter leading-none">Meta Diária Restante</span>
                    <span className="text-2xl font-semibold text-sle-primary leading-none">{metaDoDiaUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
                </div>
             </div>
          </div>
        </Card>

        <DailyRevenueChart ctes={allCtes} unitName={stats.unidade} startDate={chartStart} endDate={chartEnd} />
      </div>

      {/* DOCUMENT LIST */}
      <div id="listagem-documentos" className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mt-8 mx-2 sm:mx-0">
        <div className="px-8 py-6 bg-[#F8F9FE] border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-5">
          <div className="flex items-center">
            <div className="w-1.5 h-6 bg-sle-primary rounded-full mr-4 opacity-50"></div>
            <h3 className="font-bold text-[#0F103A] uppercase text-xs sm:text-sm tracking-[0.2em]">Listagem de Documentos</h3>
          </div>
          <div className="flex p-1.5 bg-gray-200/40 rounded-2xl gap-1 border border-gray-100/50 shadow-inner">
            {[
              { label: 'Vendas', key: 'vendas' },
              { label: 'Entregas', key: 'baixas' },
              { label: 'MDFEs', key: 'manifestos' },
              { label: 'Comprovantes', key: 'fotos' }
            ].map((t) => (
              <button 
                key={t.key} 
                onClick={() => { 
                  setActiveTab(t.key as TabType);
                  if (t.key === 'baixas') setBaixaFilter('all');
                  if (t.key === 'manifestos') setMdfeFilter('all');
                  if (t.key === 'fotos') setFotoFilter('semFoto');
                  setSortConfig({ key: 'data', direction: 'desc' });
                }} 
                className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === t.key ? 'bg-sle-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:bg-white/90'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-[11px] sm:text-sm text-left table-fixed min-w-[800px]">
            <thead className="bg-[#F1F3FB] text-[#24268B]">
              <tr>
                <th className="w-[10%] px-5 py-5 font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('data')}>DATA <SortIcon column="data" /></th>
                <th className="w-[12%] px-3 py-5 font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('id')}>CTE <SortIcon column="id" /></th>
                <th className="w-[18%] px-3 py-5 font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('unidadeEntrega')}>DESTINO <SortIcon column="unidadeEntrega" /></th>
                <th className="w-[15%] px-3 py-5 text-right font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('valor')}>VALOR <SortIcon column="valor" /></th>
                <th className="w-[15%] px-3 py-5 text-center font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('statusPrazo')}>PRAZO <SortIcon column="statusPrazo" /></th>
                <th className="w-[15%] px-3 py-5 text-center font-bold uppercase cursor-pointer" onClick={() => handleSort('statusEntrega')}>COMPR. (M) <SortIcon column="statusEntrega" /></th>
                <th className="w-[15%] px-3 py-5 text-center font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('statusMdfe')}>MDFE <SortIcon column="statusMdfe" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentDocs.map((doc, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-5 py-5 text-gray-500 font-bold">{doc.data.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</td>
                  <td className="px-3 py-5 text-sle-primary font-bold">{doc.id}</td>
                  <td className="px-3 py-5 text-gray-600 truncate font-semibold uppercase">{doc.unidadeEntrega}</td>
                  <td className="px-3 py-5 text-right text-gray-700 font-bold">R$ {doc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-5 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${doc.statusPrazo?.includes('NO PRAZO') ? 'text-green-600 bg-green-50/50 border-green-100' : doc.statusPrazo?.includes('FORA') ? 'text-red-600 bg-red-50/50 border-red-200' : 'text-yellow-600 bg-yellow-50/50 border-yellow-200'}`}>
                      {doc.statusPrazo?.includes('NO PRAZO') ? 'NO PRAZO' : doc.statusPrazo?.includes('FORA') ? 'FORA PRAZO' : 'AGUARDANDO'}
                    </span>
                  </td>
                  <td className="px-3 py-5 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border shadow-sm ${normalizeStatus(doc.statusEntrega) === 'COM FOTO' ? 'text-green-700 bg-green-50/80 border-green-200' : (normalizeStatus(doc.statusEntrega) === 'SEM FOTO' || normalizeStatus(doc.statusEntrega).includes('NÃO BAIXADO')) ? 'text-red-700 bg-red-50/80 border-red-200' : 'text-yellow-700 bg-yellow-50/80 border-yellow-200'}`}>
                      {doc.statusEntrega === 'COM FOTO' ? 'COM FOTO' : (doc.statusEntrega === 'SEM FOTO' || doc.statusEntrega.includes('NÃO BAIXADO')) ? 'SEM FOTO' : 'SEM BAIXA'}
                    </span>
                  </td>
                  <td className="px-3 py-5 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${doc.statusMdfe?.match(/COM MDFE|ENCERRADO|AUTORIZADO/i) ? 'text-green-600 bg-green-50/50 border-green-100' : 'text-red-600 bg-red-50/50 border-red-100'}`}>
                      {doc.statusMdfe?.match(/COM MDFE|ENCERRADO|AUTORIZADO/i) ? 'MDFE OK' : 'SEM MDFE'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentDocs.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-24 text-center text-gray-300 italic text-xs uppercase tracking-[0.4em] font-bold">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnitDashboard;
