import React from 'react';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ title, icon, children, className = '', onClick }) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-5 border-l-4 transition-all ${className} ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01]' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-[#2E31B4]">{icon}</div>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
};

export default Card;
