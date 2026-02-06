import React from 'react';

export type CardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  tooltip?: string;
  variant?: CardVariant;
}

const getVariantColor = (variant: CardVariant = 'default') => {
  switch (variant) {
    case 'primary': return '#2E31B4';
    case 'success': return '#059669';
    case 'warning': return '#EAB308';
    case 'danger': return '#EC1B23';
    default: return '#0F103A';
  }
};

const Card: React.FC<CardProps> = ({ title, icon, children, className = '', onClick, tooltip, variant = 'default' }) => {
  const accentColor = getVariantColor(variant as CardVariant);

  return (
    <div 
      className={`bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 p-6 relative overflow-hidden group transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Top Gradient Line (Subtle) */}
      <div 
        className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3 relative">
          {/* Pill Indicator (Matching Login Style) */}
          <span 
            className="w-1.5 h-5 rounded-full shadow-sm"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}40` }}
          ></span>
          
          <h3 className="text-[#0F103A] text-xs font-bold uppercase tracking-[0.15em] leading-none select-none">
            {title}
          </h3>
          
          {tooltip && (
            <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-[#0F103A] text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-medium z-20 border border-white/10">
              {tooltip}
            </div>
          )}
        </div>
        
        {icon && (
          <div 
            className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-400 group-hover:text-gray-600 transition-colors"
          >
            {icon}
          </div>
        )}
      </div>
      
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default Card;