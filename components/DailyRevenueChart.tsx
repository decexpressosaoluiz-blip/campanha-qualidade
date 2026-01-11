
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { DollarSign } from 'lucide-react';
import { Cte } from '../types';
import { normalizeUnitName } from '../services/calculationService';

interface DailyRevenueChartProps {
  ctes: Cte[];
  unitName?: string;
  startDate?: Date;
  endDate?: Date;
}

const DailyRevenueChart: React.FC<DailyRevenueChartProps> = ({ ctes, unitName, startDate, endDate }) => {
  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { value: number; count: number }>();
    const targetUnit = unitName ? normalizeUnitName(unitName) : null;
    
    // Normalizar datas de filtro para garantir comparação correta
    const startFilter = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0) : null;
    const endFilter = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59) : null;

    ctes.forEach(cte => {
        // Filtro de Unidade
        if (targetUnit && normalizeUnitName(cte.unidadeColeta) !== targetUnit) return;

        // Filtro de Data
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
      .filter(d => d.value > 0) // Remove dias zerados
      .sort((a, b) => a.dayObj.getTime() - b.dayObj.getTime());

    const totalVal = data.reduce((acc, curr) => acc + curr.value, 0);
    const average = data.length > 0 ? totalVal / data.length : 0;

    return { data, average };
  }, [ctes, unitName, startDate, endDate]);

  if (chartData.data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-sle-dark uppercase tracking-wider flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-sle-primary" /> Faturamento Diário {unitName ? `- ${unitName}` : ''}
            </h3>
            <div className="flex gap-2 text-[10px] font-semibold uppercase">
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>Acima da Média</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></div>Na Média (+/- 5%)</div>
                <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>Abaixo da Média</div>
            </div>
        </div>
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.data} margin={{top: 20, right: 5, left: 5, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => {
                            const [y, m, d] = val.split('-');
                            return `${d}/${m}`;
                        }}
                        tick={{fontSize: 10, fill: '#888'}} 
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip 
                        cursor={{fill: 'transparent'}}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                                const dayName = weekDays[data.dayObj.getDay()];
                                const ticketMedio = data.count > 0 ? data.value / data.count : 0;
                                
                                return (
                                    <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-xs z-50">
                                        <p className="font-bold text-sle-primary mb-1">{new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                        <p className="font-semibold text-gray-500 mb-2 uppercase">{dayName}</p>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-bold text-gray-800">
                                                {Number(payload[0].value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                            <p className="text-[10px] font-semibold text-gray-500">
                                                Docs: {data.count}
                                            </p>
                                            <p className="text-[10px] font-semibold text-blue-600 border-t border-gray-100 pt-1 mt-1">
                                                Ticket Médio: {ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        <LabelList 
                            dataKey="value" 
                            position="top" 
                            formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                            style={{ fontSize: '10px', fill: '#666', fontWeight: 'bold' }}
                        />
                        {chartData.data.map((entry, index) => {
                            const avg = chartData.average;
                            let fill = '#EAB308'; // Yellow
                            if (entry.value > avg * 1.05) fill = '#22c55e'; // Green
                            else if (entry.value < avg * 0.95) fill = '#ef4444'; // Red
                            
                            return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
  );
};

export default DailyRevenueChart;
