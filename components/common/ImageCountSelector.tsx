import React from 'react';

interface ImageCountSelectorProps {
  value: number;
  onChange: (count: number) => void;
  counts?: number[];
  label?: string;
  className?: string;
}

const ImageCountSelector: React.FC<ImageCountSelectorProps> = ({ 
  value, 
  onChange, 
  counts = [1, 2, 3, 4],
  label = 'Số lượng ảnh',
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">{label}</label>
      <div className="grid grid-cols-4 gap-2">
        {counts.map((count) => (
          <button
            key={count}
            onClick={() => onChange(count)}
            className={`py-2 text-xs font-medium rounded border transition-colors ${
              value === count 
              ? 'bg-[#EAE8E0] text-[#C15F3C] border-[#C15F3C]' 
              : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
            }`}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageCountSelector;

