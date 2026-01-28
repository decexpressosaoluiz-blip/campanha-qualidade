
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UnitStats, Cte, User } from '../types';
import Card from './Card';
import { DollarSign, Truck, FileText, AlertTriangle, Download, ArrowUpDown, ExternalLink, Clock, ArrowUp, ArrowDown, Calendar, Camera, CameraOff, Filter, X, Check, FileSpreadsheet } from 'lucide-react';
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

interface ColumnFilters {
  prazo: string[];
  entrega: string[];
  mdfe: string[];
}

const UnitDashboard: React.FC<UnitDashboardProps> = ({ stats, user, setHeaderActions, lastUpdate, allCtes, fixedDays, dateRange, onDateFilterChange }) => {
  const [activeTab, setActiveTab] = useState<TabType>('vendas');
  
  // Filtros rápidos dos Cards (mantidos para navegação macro)
  const [baixaFilter, setBaixaFilter] = useState<'all' | 'noPrazo' | 'foraPrazo' | 'semBaixa'>('all');
  const [mdfeFilter, setMdfeFilter] = useState<'all' | 'comMdfe' | 'semMdfe'>('all');
  const [fotoFilter, setFotoFilter] = useState<'all' | 'comFoto' | 'semFoto' | 'semBaixaEntrega'>('all');
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'data', direction: 'desc' });

  // Novos Filtros de Coluna
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    prazo: [],
    entrega: [],
    mdfe: []
  });
  
  // Controle de visibilidade e posição dos dropdowns de filtro
  const [openFilterMenu, setOpenFilterMenu] = useState<keyof ColumnFilters | null>(null);
  const [filterMenuPos, setFilterMenuPos] = useState<{top: number, left: number} | null>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [deliveryStart, setDeliveryStart] = useState('');
  const [deliveryEnd, setDeliveryEnd] = useState('');
  
  const [photoStart, setPhotoStart] = useState('');
  const [photoEnd, setPhotoEnd] = useState('');

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // 1. Se clicar dentro do menu (que pode estar no Portal), não faz nada
      if (filterMenuRef.current && filterMenuRef.current.contains(target)) {
        return;
      }

      // 2. Se clicar em um botão de toggle de filtro, não faz nada aqui
      if (target.closest('button[data-action="filter-toggle"]')) {
        return;
      }

      // 3. Caso contrário, fecha o menu
      if (openFilterMenu) {
        setOpenFilterMenu(null);
        setFilterMenuPos(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterMenu]);

  // Helpers para labels consistentes
  const getPrazoLabel = (doc: Cte) => {
    if (doc.statusPrazo?.includes('NO PRAZO')) return 'NO PRAZO';
    if (doc.statusPrazo?.includes('FORA')) return 'FORA PRAZO';
    return 'AGUARDANDO';
  };

  const getEntregaLabel = (doc: Cte) => {
    const status = normalizeStatus(doc.statusEntrega);
    if (status === 'COM FOTO') return 'COM FOTO';
    if (status === 'SEM FOTO' || status.includes('NÃO BAIXADO')) return 'SEM FOTO';
    return 'SEM BAIXA';
  };

  const getMdfeLabel = (doc: Cte) => {
    if (doc.statusMdfe?.match(/COM MDFE|ENCERRADO|AUTORIZADO/i)) return 'MDFE OK';
    return 'SEM MDFE';
  };

  // Helper de Estilização Unificada das Tags
  const getTagStyle = (label: string, isSelected: boolean = false) => {
    const base = "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer select-none flex items-center justify-center";
    const activeRing = isSelected ? "ring-2 ring-offset-1 ring-blue-400 shadow-sm opacity-100" : "opacity-80 hover:opacity-100";
    
    // Verdes
    if (['NO PRAZO', 'MDFE OK', 'COM FOTO'].includes(label)) 
      return `${base} ${activeRing} text-green-600 bg-green-50/50 border-green-100`;
    
    // Vermelhos
    if (['FORA PRAZO', 'SEM MDFE', 'SEM FOTO'].includes(label))
      return `${base} ${activeRing} text-red-600 bg-red-50/50 border-red-200`;
    
    // Amarelos (Default)
    return `${base} ${activeRing} text-yellow-600 bg-yellow-50/50 border-yellow-200`;
  };

  // Opções disponíveis para os filtros
  const filterOptions = {
    prazo: ['NO PRAZO', 'FORA PRAZO', 'AGUARDANDO'],
    entrega: ['COM FOTO', 'SEM FOTO', 'SEM BAIXA'],
    mdfe: ['MDFE OK', 'SEM MDFE']
  };

  const toggleColumnFilter = (column: keyof ColumnFilters, value: string) => {
    setColumnFilters(prev => {
      const current = prev[column];
      const exists = current.includes(value);
      if (exists) {
        return { ...prev, [column]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [column]: [...current, value] };
      }
    });
  };

  const toggleFilterMenu = (e: React.MouseEvent, key: keyof ColumnFilters) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (openFilterMenu === key) {
        setOpenFilterMenu(null);
        setFilterMenuPos(null);
    } else {
        const button = e.currentTarget as HTMLButtonElement;
        const rect = button.getBoundingClientRect();
        
        // Ajusta se estiver muito perto da borda direita
        let left = rect.left;
        const menuWidth = 200; // largura estimada
        if (left + menuWidth > window.innerWidth) {
            left = window.innerWidth - (menuWidth + 10); 
        }
        
        // Verifica se cabe abaixo, senão abre acima
        let top = rect.bottom + 5;
        if (top + 250 > window.innerHeight) {
            top = rect.top - 210; // abre acima
        }

        setOpenFilterMenu(key);
        setFilterMenuPos({ top, left });
    }
  };

  const clearAllFilters = () => {
    setColumnFilters({ prazo: [], entrega: [], mdfe: [] });
  };

  const getBaseDocuments = (): Cte[] => {
    let docs: Cte[] = [];
    switch (activeTab) {
      case 'vendas': 
        docs = [...stats.docsVendas]; 
        break;
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
        if (fotoFilter === 'all') docs = [...stats.docsComFoto, ...stats.docsSemFoto, ...stats.docsSemBaixaEntrega];
        else if (fotoFilter === 'comFoto') docs = [...stats.docsComFoto];
        else if (fotoFilter === 'semFoto') docs = [...stats.docsSemFoto];
        else if (fotoFilter === 'semBaixaEntrega') docs = [...stats.docsSemBaixaEntrega];
        break;
    }
    return docs;
  };

  const currentDocs = useMemo(() => {
    let docs = getBaseDocuments();

    // Aplica Filtros de Coluna (Lógica AND entre colunas, OR dentro da coluna)
    if (columnFilters.prazo.length > 0) {
      docs = docs.filter(d => columnFilters.prazo.includes(getPrazoLabel(d)));
    }
    if (columnFilters.entrega.length > 0) {
      docs = docs.filter(d => columnFilters.entrega.includes(getEntregaLabel(d)));
    }
    if (columnFilters.mdfe.length > 0) {
      docs = docs.filter(d => columnFilters.mdfe.includes(getMdfeLabel(d)));
    }

    return docs.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortConfig.key === 'id') { aVal = parseInt(a.id) || 0; bVal = parseInt(b.id) || 0; }
      else { aVal = a[sortConfig.key]; bVal = b[sortConfig.key]; }
      if (aVal === bVal) return 0;
      const res = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  }, [activeTab, baixaFilter, mdfeFilter, fotoFilter, stats, sortConfig, columnFilters]);


  const unitDeliveryStats = useMemo(() => {
    let countNoPrazo = 0, countForaPrazo = 0, countSemBaixa = 0;
    const start = deliveryStart ? new Date(deliveryStart + 'T00:00:00') : null;
    const end = deliveryEnd ? new Date(deliveryEnd + 'T23:59:59') : null;

    allCtes.forEach(cte => {
      if (cte.unidadeEntrega !== stats.unidade) return;
      if (!cte.prazoBaixa) return;
      if (start && cte.prazoBaixa < start) return;
      if (end && cte.prazoBaixa > end) return;
      
      const status = normalizeStatus(cte.statusPrazo);
      const statusEntrega = normalizeStatus(cte.statusEntrega);
      const isSemBaixa = status === '' || status === 'SEM DATA' || statusEntrega === 'SEM BAIXA' || statusEntrega.includes('NÃO BAIXADO');

      if (isSemBaixa) countSemBaixa++;
      else if (status === 'NO PRAZO') countNoPrazo++;
      else countForaPrazo++;
    });

    const total = countNoPrazo + countForaPrazo + countSemBaixa;
    return { 
      total, noPrazo: countNoPrazo, foraPrazo: countForaPrazo, semBaixa: countSemBaixa, 
      pctNoPrazo: total > 0 ? (countNoPrazo / total) * 100 : 0,
      pctSemBaixa: total > 0 ? (countSemBaixa / total) * 100 : 0,
      pctForaPrazo: total > 0 ? (countForaPrazo / total) * 100 : 0
    };
  }, [allCtes, deliveryStart, deliveryEnd, stats.unidade]);

  const unitPhotoStats = useMemo(() => {
    let com = 0, sem = 0;
    const start = photoStart ? new Date(photoStart + 'T00:00:00') : null;
    const end = photoEnd ? new Date(photoEnd + 'T23:59:59') : null;

    if (photoStart || photoEnd) {
      allCtes.forEach(cte => {
        if (cte.unidadeEntrega !== stats.unidade) return;
        if (!cte.dataBaixa) return;
        if (start && cte.dataBaixa < start) return;
        if (end && cte.dataBaixa > end) return;

        const statusEntrega = normalizeStatus(cte.statusEntrega);
        if (statusEntrega.includes('COM FOTO')) com++;
        else if (statusEntrega.includes('SEM FOTO')) sem++;
      });
      const total = com + sem;
      return { com, sem, pctCom: total > 0 ? (com / total) * 100 : 0, pctSem: total > 0 ? (sem / total) * 100 : 0 };
    }
    
    const totalBase = stats.comFoto + stats.semFoto;
    return { 
      com: stats.comFoto, 
      sem: stats.semFoto, 
      pctCom: totalBase > 0 ? (stats.comFoto / totalBase) * 100 : 0,
      pctSem: totalBase > 0 ? (stats.semFoto / totalBase) * 100 : 0
    };
  }, [allCtes, photoStart, photoEnd, stats.unidade, stats.comFoto, stats.semFoto]);

  const handleSort = (key: SortKey) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));

  const filterAndSortByDate = (tab: TabType, filterType: any) => {
    setActiveTab(tab);
    if (tab === 'baixas') setBaixaFilter(filterType);
    if (tab === 'manifestos') setMdfeFilter(filterType);
    if (tab === 'fotos') setFotoFilter(filterType);
    setSortConfig({ key: 'data', direction: 'asc' });
    // Limpa filtros de coluna ao mudar filtros macro para evitar confusão
    setColumnFilters({ prazo: [], entrega: [], mdfe: [] });
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-2.5 h-2.5 ml-0.5 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-2.5 h-2.5 ml-0.5 text-sle-primary" /> : <ArrowDown className="w-2.5 h-2.5 ml-0.5 text-sle-primary" />;
  };

  const remainingDays = Math.max(1, fixedDays.total - fixedDays.elapsed);
  const metaDoDiaUnit = Math.max(0, stats.meta - stats.faturamento) / remainingDays;
  const filterEndDate = dateRange.end ? new Date(dateRange.end + 'T12:00:00') : lastUpdate;
  const effectiveDate = filterEndDate > lastUpdate ? lastUpdate : filterEndDate;
  const salesLabelDate = new Date(effectiveDate);

  const chartStart = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : undefined;
  const chartEnd = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : undefined;

  // Função para renderizar o cabeçalho com filtro
  const renderFilterHeader = (title: string, columnKey: keyof ColumnFilters, sortKey: SortKey) => {
    const isActive = columnFilters[columnKey].length > 0;
    
    return (
      <div className="flex items-center justify-center space-x-1 relative group">
        <span className="cursor-pointer select-none" onClick={() => handleSort(sortKey)}>{title}</span>
        <SortIcon column={sortKey} />
        <button 
          type="button"
          data-action="filter-toggle"
          onClick={(e) => toggleFilterMenu(e, columnKey)}
          className={`p-1 rounded-md transition-all ${isActive ? 'text-sle-primary bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
        >
          <Filter className="w-3 h-3" strokeWidth={isActive ? 3 : 2} />
        </button>

        {openFilterMenu === columnKey && filterMenuPos && createPortal(
          <div 
            ref={filterMenuRef} 
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-[9999] min-w-[200px] animate-fade-in text-left"
            style={{ top: filterMenuPos.top, left: filterMenuPos.left }}
            onClick={(e) => e.stopPropagation()} 
          >
             <div className="flex justify-between items-center mb-2.5 px-1 pb-2 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filtrar (Multi):</span>
                <span className="text-[9px] text-gray-300 font-semibold">{columnFilters[columnKey].length} sel.</span>
             </div>
             <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                {filterOptions[columnKey].map(opt => {
                   const selected = columnFilters[columnKey].includes(opt);
                   return (
                     <div 
                        key={opt} 
                        onClick={(e) => { e.stopPropagation(); toggleColumnFilter(columnKey, opt); }}
                        className={getTagStyle(opt, selected) + " w-full justify-between !py-2.5 !text-xs mb-1 hover:shadow-md"}
                     >
                        <span className="flex-1 text-center">{opt}</span>
                        {selected && <Check className="w-3.5 h-3.5 ml-1 absolute right-2" />}
                     </div>
                   );
                })}
             </div>
             {isActive && (
               <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setColumnFilters(p => ({...p, [columnKey]: []})); }}
                className="w-full mt-2 pt-2 border-t border-gray-100 text-[10px] text-red-500 font-bold hover:text-red-600 text-center uppercase tracking-wide"
               >
                 Limpar Filtros
               </button>
             )}
          </div>,
          document.body
        )}
      </div>
    );
  };

  const hasActiveFilters = Object.values(columnFilters).some((arr) => (arr as string[]).length > 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col gap-4 px-2 sm:px-0 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
             <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0F103A] tracking-tight">Painel: {stats.unidade}</h2>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1">Gestão Unidade</p>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 sm:px-0">
        <Card title="PENDÊNCIAS DE ENTREGA" icon={<Truck className="w-5 h-5 text-warning opacity-40" />} className="border-l-warning">
           <div className="flex flex-col gap-4">
              <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-widest leading-none">Filtrar Prazo (F):</span>
                  <div className="flex items-center gap-1">
                      <input type="date" value={deliveryStart} onChange={(e) => setDeliveryStart(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-26 font-bold shadow-sm" />
                      <span className="text-gray-300">-</span>
                      <input type="date" value={deliveryEnd} onChange={(e) => setDeliveryEnd(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-26 font-bold shadow-sm" />
                  </div>
              </div>
              <div className="flex gap-2 h-[85px]">
                <div onClick={() => filterAndSortByDate('baixas', 'noPrazo')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer ${baixaFilter === 'noPrazo' ? 'border-green-400 bg-green-50 shadow-inner' : 'border-green-100 bg-green-50/30'}`}>
                  <span className="text-2xl font-semibold text-green-700 leading-none">{unitDeliveryStats.noPrazo}</span>
                  <span className="text-[9px] font-bold text-green-600 uppercase mt-2">{unitDeliveryStats.pctNoPrazo.toFixed(0)}% NO PRAZO</span>
                </div>
                <div onClick={() => filterAndSortByDate('baixas', 'semBaixa')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer z-20 ${baixaFilter === 'semBaixa' ? 'border-yellow-400 bg-yellow-50 shadow-md ring-2 ring-yellow-100' : 'border-yellow-200 bg-yellow-50/50'}`}>
                  <span className="text-2xl font-semibold text-yellow-700 leading-none">{unitDeliveryStats.semBaixa}</span>
                  <span className="text-[9px] font-bold text-yellow-600 uppercase mt-2">{unitDeliveryStats.pctSemBaixa.toFixed(0)}% SEM BAIXA</span>
                </div>
                <div onClick={() => filterAndSortByDate('baixas', 'foraPrazo')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer ${baixaFilter === 'foraPrazo' ? 'border-red-400 bg-red-50 shadow-inner' : 'border-red-100 bg-red-50/30'}`}>
                  <span className="text-2xl font-semibold text-red-700 leading-none">{unitDeliveryStats.foraPrazo}</span>
                  <span className="text-[9px] font-bold text-red-600 uppercase mt-2">{unitDeliveryStats.pctForaPrazo.toFixed(0)}% FORA PRAZO</span>
                </div>
              </div>
           </div>
        </Card>

        <Card title="STATUS ENTREGA (FOTO)" icon={<Camera className="w-5 h-5 text-green-600 opacity-40" />} className="border-l-green-600">
           <div className="flex flex-col gap-4">
              <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-widest leading-none">Filtrar Baixa (D):</span>
                  <div className="flex items-center gap-1">
                      <input type="date" value={photoStart} onChange={(e) => setPhotoStart(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-26 font-bold shadow-sm" />
                      <span className="text-gray-300">-</span>
                      <input type="date" value={photoEnd} onChange={(e) => setPhotoEnd(e.target.value)} className="bg-white border border-gray-200 text-[10px] p-1.5 rounded-lg outline-none w-26 font-bold shadow-sm" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-3 h-[85px] items-center text-center">
                 <div onClick={() => filterAndSortByDate('fotos', 'comFoto')} className={`flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer h-full ${fotoFilter === 'comFoto' ? 'border-green-400 bg-green-50 shadow-inner' : 'border-green-100 bg-green-50/20'}`}>
                    <span className="text-2xl font-semibold text-green-700 leading-none">{unitPhotoStats.com}</span>
                    <span className="text-[9px] font-bold text-green-600 uppercase mt-2">{unitPhotoStats.pctCom.toFixed(0)}% OK</span>
                 </div>
                 <div onClick={() => filterAndSortByDate('fotos', 'semFoto')} className={`flex-1 flex flex-col items-center justify-center border rounded-xl transition-all cursor-pointer h-full z-20 ${fotoFilter === 'semFoto' ? 'border-red-400 bg-red-50 shadow-md scale-105 ring-2 ring-red-100' : 'border-red-200 bg-red-50/40'}`}>
                    <CameraOff className="w-3.5 h-3.5 text-red-600 mb-1 opacity-70" />
                    <span className="text-2xl font-semibold text-red-700 leading-none">{unitPhotoStats.sem}</span>
                    <span className="text-[9px] font-bold text-red-600 uppercase mt-1.5 tracking-tighter">{unitPhotoStats.pctSem.toFixed(0)}% S/ FOTO</span>
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

      <div id="listagem-documentos" className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mt-8 mx-2 sm:mx-0">
        <div className="px-8 py-6 bg-[#F8F9FE] border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-5">
          <div className="flex items-center">
            <div className="w-1.5 h-6 bg-sle-primary rounded-full mr-4 opacity-50"></div>
            <h3 className="font-bold text-[#0F103A] uppercase text-xs sm:text-sm tracking-[0.2em]">Listagem de Documentos</h3>
            
            <button 
                onClick={() => downloadXLS(currentDocs, `Relatorio_${stats.unidade}`)} 
                className="ml-4 p-2 bg-green-100/50 text-green-700 rounded-lg hover:bg-green-100 transition-all border border-green-200/50 shadow-sm active:scale-95 group"
                title="Exportar Excel"
            >
                <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
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
                  if (t.key === 'fotos') setFotoFilter('all');
                  setSortConfig({ key: 'data', direction: 'desc' });
                  setColumnFilters({ prazo: [], entrega: [], mdfe: [] });
                }} 
                className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === t.key ? 'bg-sle-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:bg-white/90'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Barra de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="px-8 py-3 bg-blue-50/50 border-b border-blue-100 flex flex-wrap items-center gap-2 animate-fade-in">
             <div className="flex items-center text-sle-primary mr-2">
               <Filter className="w-3.5 h-3.5 mr-1.5" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Filtros Ativos:</span>
             </div>
             {Object.entries(columnFilters).map(([key, values]) => 
                (values as string[]).map(val => (
                  <div key={`${key}-${val}`} className="flex items-center bg-white border border-blue-200 text-blue-800 px-3 py-1 rounded-full shadow-sm text-[10px] font-bold uppercase">
                     {val}
                     <button onClick={() => toggleColumnFilter(key as keyof ColumnFilters, val)} className="ml-2 hover:bg-red-50 hover:text-red-500 rounded-full p-0.5 transition-colors">
                        <X className="w-3 h-3" />
                     </button>
                  </div>
                ))
             )}
             <button onClick={clearAllFilters} className="ml-auto text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider hover:underline">
               Limpar Todos
             </button>
          </div>
        )}

        <div className="w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-[11px] sm:text-sm text-left table-fixed min-w-[800px]">
            <thead className="bg-[#F8F9FE] text-[#24268B]">
              <tr>
                <th className="w-[10%] px-5 py-5 font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('data')}>DATA <SortIcon column="data" /></th>
                <th className="w-[12%] px-3 py-5 font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('id')}>CTE <SortIcon column="id" /></th>
                <th className="w-[18%] px-3 py-5 font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('unidadeEntrega')}>DESTINO <SortIcon column="unidadeEntrega" /></th>
                <th className="w-[15%] px-3 py-5 text-right font-bold uppercase truncate cursor-pointer" onClick={() => handleSort('valor')}>VALOR <SortIcon column="valor" /></th>
                <th className="w-[15%] px-3 py-5 text-center font-bold uppercase">
                  {renderFilterHeader('PRAZO', 'prazo', 'statusPrazo')}
                </th>
                <th className="w-[15%] px-3 py-5 text-center font-bold uppercase">
                  {renderFilterHeader('COMPR. (M)', 'entrega', 'statusEntrega')}
                </th>
                <th className="w-[15%] px-3 py-5 text-center font-bold uppercase">
                   {renderFilterHeader('MDFE', 'mdfe', 'statusMdfe')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentDocs.map((doc, idx) => {
                const prazoLabel = getPrazoLabel(doc);
                const entregaLabel = getEntregaLabel(doc);
                const mdfeLabel = getMdfeLabel(doc);

                return (
                <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-5 py-5 text-gray-500 font-bold">{doc.data.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</td>
                  <td className="px-3 py-5 text-sle-primary font-bold">{doc.id}</td>
                  <td className="px-3 py-5 text-gray-600 truncate font-semibold uppercase">{doc.unidadeEntrega}</td>
                  <td className="px-3 py-5 text-right text-gray-700 font-bold">R$ {doc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-5 text-center">
                    <span 
                      onClick={(e) => { e.stopPropagation(); toggleColumnFilter('prazo', prazoLabel); }}
                      className={getTagStyle(prazoLabel, columnFilters.prazo.includes(prazoLabel))}
                    >
                      {prazoLabel}
                    </span>
                  </td>
                  <td className="px-3 py-5 text-center">
                    <span 
                      onClick={(e) => { e.stopPropagation(); toggleColumnFilter('entrega', entregaLabel); }}
                      className={getTagStyle(entregaLabel, columnFilters.entrega.includes(entregaLabel))}
                    >
                      {entregaLabel}
                    </span>
                  </td>
                  <td className="px-3 py-5 text-center">
                    <span 
                      onClick={(e) => { e.stopPropagation(); toggleColumnFilter('mdfe', mdfeLabel); }}
                      className={getTagStyle(mdfeLabel, columnFilters.mdfe.includes(mdfeLabel))}
                    >
                      {mdfeLabel}
                    </span>
                  </td>
                </tr>
              )})}
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
