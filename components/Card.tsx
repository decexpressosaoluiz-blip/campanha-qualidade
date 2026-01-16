
import React from 'react';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  tooltip?: string;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = '', onClick, tooltip }) => {
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm p-6 border-l-4 transition-all ${className} ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2 group relative">
          <h3 className="text-gray-400 text-[11px] font-semibold uppercase tracking-[0.15em] leading-none">{title}</h3>
          {tooltip && (
            <>
              <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-medium z-20">
                {tooltip}
              </div>
            </>
          )}
        </div>
        {icon && <div className="text-sle-primary opacity-60">{icon}</div>}
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default Card;
