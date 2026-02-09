
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Cte } from '../types';
import { normalizeUnitName } from '../services/calculationService';

interface DailyRevenueChartProps {
  ctes: Cte[];
  unitName?: string;
  startDate?: Date;
  endDate?: Date;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload, average } = props;
  if (!cx || !cy) return null;
  
  const val = payload.value;
  let fill = '#EAB308'; // Yellow (Na média)
  if (val > average * 1.05) fill = '#22c55e'; // Green (Acima)
  else if (val < average * 0.95) fill = '#ef4444'; // Red (Abaixo)

  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={fill} opacity={0.2} />
      <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#fff" strokeWidth={2} />
    </g>
  );
};

const DailyRevenueChart: React.FC<DailyRevenueChartProps> = ({ ctes, unitName, startDate, endDate }) => {
  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { value: number; count: number }>();
    const targetUnit = unitName ? normalizeUnitName(unitName) : null;
    
    const startFilter = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0) : null;
    const endFilter = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59) : null;

    ctes.forEach(cte => {
        if (targetUnit && normalizeUnitName(cte.unidadeColeta) !== targetUnit) return;
        if (startFilter && cte.data < startFilter) return;
        if (endFilter && cte.data > endFilter) return;

        const dateStr = cte.data.toISOString().split('T')[0];
        const current = dailyMap.get(dateStr) || { value: 0, count: 0 };
        
        dailyMap.set(dateStr, { 
            value: current.value + cte.valor,
            count: current.count + 1
        });
    });

    const data = Array.from(dailyMap.entries())
      .map(([date, info]) => ({ 
        date, 
        value: info.value,
        count: info.count,
        dayObj: new Date(date + 'T12:00:00') 
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => a.dayObj.getTime() - b.dayObj.getTime());

    const totalVal = data.reduce((acc, curr) => acc + curr.value, 0);
    const average = data.length > 0 ? totalVal / data.length : 0;

    return { data, average };
  }, [ctes, unitName, startDate, endDate]);

  if (chartData.data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-lg mr-3">
                    <TrendingUp className="w-5 h-5 text-sle-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-sle-dark uppercase tracking-wider">
                        Receita Diária {unitName ? `- ${unitName}` : 'Geral'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-tight">Análise de tendência do período</p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-[9px] font-bold uppercase tracking-wider bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1.5 shadow-sm"></div>Acima</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-yellow-400 mr-1.5 shadow-sm"></div>Na Média</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1.5 shadow-sm"></div>Abaixo</div>
            </div>
        </div>

        <div className="h-[360px] w-full pt-6">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.data} margin={{ top: 60, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2E31B4" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#2E31B4" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => {
                            const [y, m, d] = val.split('-');
                            return `${d}/${m}`;
                        }}
                        tick={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 700 }} 
                        padding={{ left: 20, right: 20 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis 
                        hide={true}
                        domain={[0, (dataMax: number) => dataMax * 1.4]}
                    />
                    <Tooltip 
                        cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const performance = data.value > chartData.average * 1.05 ? 'ACIMA DA MÉDIA' : 
                                              data.value < chartData.average * 0.95 ? 'ABAIXO DA MÉDIA' : 'NA MÉDIA';
                                const perfColor = performance === 'ACIMA DA MÉDIA' ? 'text-green-600' : 
                                                performance === 'ABAIXO DA MÉDIA' ? 'text-red-600' : 'text-yellow-600';

                                return (
                                    <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 shadow-2xl rounded-xl text-xs z-50 min-w-[180px]">
                                        <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                                            <div>
                                                <p className="font-bold text-sle-dark text-sm">
                                                    {new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric'})}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR', {weekday: 'long'})}
                                                </p>
                                            </div>
                                            <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${perfColor} bg-gray-50`}>
                                                {performance}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 font-bold text-[10px] uppercase">Receita</span>
                                                <span className="text-sm font-black text-sle-primary">
                                                    {Number(data.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 font-bold text-[10px] uppercase">Documentos</span>
                                                <span className="font-bold text-gray-700">{data.count}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2E31B4" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        dot={<CustomDot average={chartData.average} />}
                    >
                        <LabelList 
                            dataKey="value" 
                            position="top" 
                            offset={20}
                            formatter={(val: number) => {
                                const kVal = val / 1000;
                                // Se for menor que 10k (ex: 0,4k, 2,1k), mostra 1 casa decimal.
                                // Se for maior ou igual a 10k (ex: 44k), mostra 0 casas decimais.
                                const digits = kVal < 10 ? 1 : 0;
                                return `${kVal.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}k`;
                            }}
                            style={{ 
                                fontSize: '13px', 
                                fontWeight: '700', 
                                fill: '#1f2937', 
                                fontFamily: 'inherit',
                                paintOrder: 'stroke',
                                stroke: '#fff',
                                strokeWidth: '3px'
                            }}
                        />
                    </Area>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default DailyRevenueChart;
