
import React, { useState, useEffect } from 'react';
import { getHistory, getHistoryByType, clearHistory } from './services/historyService';
import { HistoryItem } from '../types';
import ResultGallery from './ResultGallery';
import { upscaleImage } from './services/gemini';

const HistoryView: React.FC = () => {
  const [filter, setFilter] = useState('ALL');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});
  
  // Refresh data on mount and filter change
  useEffect(() => {
    setItems([...getHistoryByType(filter)]);
  }, [filter]);

  const filters = [
    { label: 'Tất cả', value: 'ALL' },
    { label: 'Ngoại thất', value: 'Ngoại thất' },
    { label: 'Nội thất', value: 'Nội thất' },
    { label: 'Chỉnh sửa', value: 'Chỉnh sửa' },
    { label: 'Tiện ích', value: 'Tiện ích' },
  ];

  const handleUpscale = async (src: string, resolution: '2K' | '4K') => {
    setUpscalingStatus(prev => ({ ...prev, [src]: 'Đang nâng cấp...' }));
    
    try {
      const [header, base64Data] = src.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
      
      const newSrc = await upscaleImage(
        { base64: base64Data, mimeType },
        resolution.toLowerCase() as '2k' | '4k',
        (attempt) => setUpscalingStatus(prev => ({ ...prev, [src]: `Đang thử lại (${attempt}/3)...` }))
      );
      
      if (newSrc) {
        // Update local state to show new image
        const updatedItems = items.map(img => 
          img.src === src ? { ...img, src: newSrc, resolution } : img
        );
        setItems(updatedItems);
      }
    } catch (e) {
      console.error("Upscaling failed:", e);
    } finally {
      setUpscalingStatus(prev => {
        const newState = { ...prev };
        delete newState[src];
        return newState;
      });
    }
  };

  const handleClear = () => {
      if(window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử phiên làm việc này?")) {
          clearHistory();
          setItems([]);
      }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 pb-4 border-b border-[#B1ADA1]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-xl font-bold text-[#C15F3C]">Lịch sử Hoạt động</h2>
            <p className="text-sm text-gray-500">Xem lại các hình ảnh đã tạo trong phiên làm việc này.</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
             {filters.map(f => (
                 <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                        filter === f.value 
                        ? 'bg-[#C15F3C] text-white border-[#C15F3C]' 
                        : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
                    }`}
                 >
                     {f.label}
                 </button>
             ))}
             {items.length > 0 && (
                 <button 
                    onClick={handleClear}
                    className="ml-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                 >
                     Xóa tất cả
                 </button>
             )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden pt-6">
           <ResultGallery 
              status="idle"
              latestImages={items}
              historyImages={[]}
              imageCount={0}
              generationTime={0}
              aspectRatio="16:9" // Just a default, gallery handles fitting
              onUpscale={handleUpscale}
              upscalingStatus={upscalingStatus}
              resultGridClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              className="w-full h-full flex flex-col overflow-hidden"
           />
      </div>
    </div>
  );
};

export default HistoryView;
