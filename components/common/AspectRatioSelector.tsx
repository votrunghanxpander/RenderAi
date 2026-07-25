import React from 'react';

interface AspectRatioSelectorProps {
  value: string;
  onChange: (ratio: string) => void;
  ratios?: string[];
  label?: string;
  className?: string;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ 
  value, 
  onChange, 
  ratios = ['16:9', '9:16', '4:3', '3:4', '1:1'],
  label = 'Tỷ lệ khung hình',
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">{label}</label>
      <div className="grid grid-cols-5 gap-2">
        {ratios.map((ratio) => (
          <button
            key={ratio}
            onClick={() => onChange(ratio)}
            className={`py-2 text-[10px] font-medium rounded border transition-colors ${
              value === ratio 
              ? 'bg-[#EAE8E0] text-[#C15F3C] border-[#C15F3C]' 
              : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
            }`}
          >
            {ratio}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AspectRatioSelector;

