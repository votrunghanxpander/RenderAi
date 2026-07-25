import React from 'react';

type QualityOption = '1K' | '2K' | '4K';

interface ImageQualitySelectorProps {
  value: QualityOption;
  onChange: (quality: QualityOption) => void;
  qualities?: QualityOption[];
  label?: string;
  className?: string;
}

const ImageQualitySelector: React.FC<ImageQualitySelectorProps> = ({ 
  value, 
  onChange, 
  qualities = ['1K', '2K', '4K'],
  label = 'Chất lượng ảnh',
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {qualities.map((quality) => (
          <button
            key={quality}
            onClick={() => onChange(quality)}
            className={`py-2 text-xs font-medium rounded border transition-colors ${
              value === quality 
              ? 'bg-[#EAE8E0] text-[#C15F3C] border-[#C15F3C]' 
              : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
            }`}
          >
            {quality}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageQualitySelector;
export type { QualityOption };

