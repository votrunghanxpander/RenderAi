
import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import { generateVirtualTourFrame, fileToBase64, TourAction } from './services/gemini';
import { PhotoProvider, PhotoView } from 'react-photo-view';

const VirtualTourView: React.FC = () => {
  // State
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]); // For Undo functionality
  const [isLoading, setIsLoading] = useState(false);
  const [stepSize, setStepSize] = useState(15);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload
  const handleFileSelect = async (selectedFile: File | null) => {
    if (selectedFile) {
      try {
        const base64 = await fileToBase64(selectedFile);
        setCurrentImage(`data:image/jpeg;base64,${base64}`);
        setHistory([]); // Reset history on new upload
        setError(null);
      } catch (e) {
        console.error("Failed to load image", e);
        setError("Không thể tải ảnh.");
      }
    } else {
      setCurrentImage(null);
      setHistory([]);
    }
  };

  // Action Handler
  const handleAction = async (action: TourAction) => {
    if (!currentImage) return;

    setIsLoading(true);
    setError(null);

    try {
      // Save current state to history before changing
      setHistory(prev => [...prev, currentImage]);

      const base64Raw = currentImage.split(',')[1];
      const newImage = await generateVirtualTourFrame(base64Raw, action, stepSize);
      
      setCurrentImage(newImage);
    } catch (e) {
      console.error(e);
      setError("Không thể thực hiện thao tác. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousImage = history[history.length - 1];
    setCurrentImage(previousImage);
    setHistory(prev => prev.slice(0, -1));
  };

  // Control Button Component
  const ControlButton = ({ 
    onClick, 
    icon, 
    label,
    className = '',
    disabled = false
  }: { 
    onClick: () => void, 
    icon: React.ReactNode, 
    label?: string,
    className?: string,
    disabled?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`p-3 bg-white border border-[#B1ADA1] rounded-xl shadow-sm transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
        !disabled && !isLoading ? 'hover:bg-[#C15F3C] hover:text-white hover:border-[#C15F3C] active:scale-95' : ''
      } ${className}`}
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Controls */}
      <div className="w-full md:w-[350px] shrink-0 flex flex-col overflow-y-auto pb-12 pr-2 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-4">Thăm quan ảo AI</h2>
        <p className="text-sm text-gray-500 mb-6">Di chuyển camera ảo trong không gian 3D từ một bức ảnh duy nhất nhờ sức mạnh của AI.</p>

        <div className="space-y-6">
          {/* Step 1: Upload */}
          {!currentImage && (
            <ImageUploader 
              title="Tải ảnh bắt đầu" 
              selectedFile={null}
              onFileSelect={handleFileSelect} 
              required 
            />
          )}

          {/* Controls Container */}
          {currentImage && (
             <div className="bg-white p-6 rounded-2xl border border-[#B1ADA1]/30 shadow-sm space-y-6">
                
                {/* Step Size Slider */}
                <div>
                   <div className="flex justify-between text-xs font-bold text-[#B1ADA1] uppercase mb-2">
                      <span>Góc quay / Bước nhảy</span>
                      <span>{stepSize}°</span>
                   </div>
                   <input 
                      type="range" 
                      min="5" 
                      max="45" 
                      step="5"
                      value={stepSize}
                      onChange={(e) => setStepSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C15F3C]"
                   />
                </div>

                {/* Pan & Tilt (D-Pad) */}
                <div>
                   <div className="text-xs font-bold text-[#B1ADA1] uppercase mb-3 text-center">Xoay Camera (Pan/Tilt)</div>
                   <div className="flex flex-col items-center gap-2">
                      <ControlButton 
                         onClick={() => handleAction('tilt-up')}
                         icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>}
                         label="Ngước Lên (Tilt Up)"
                      />
                      <div className="flex gap-4">
                         <ControlButton 
                            onClick={() => handleAction('pan-left')}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>}
                            label="Quay Trái (Pan Left)"
                         />
                         <div className="w-12 h-12 rounded-full bg-[#F4F3EE] flex items-center justify-center text-[#B1ADA1]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                         </div>
                         <ControlButton 
                            onClick={() => handleAction('pan-right')}
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>}
                            label="Quay Phải (Pan Right)"
                         />
                      </div>
                      <ControlButton 
                         onClick={() => handleAction('tilt-down')}
                         icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>}
                         label="Cúi Xuống (Tilt Down)"
                      />
                   </div>
                </div>

                <div className="border-t border-[#EAE8E0]"></div>

                {/* Orbit */}
                <div>
                   <div className="text-xs font-bold text-[#B1ADA1] uppercase mb-3 text-center">Di Chuyển Vòng Quanh (Orbit)</div>
                   <div className="flex gap-3">
                      <button
                         onClick={() => handleAction('orbit-left')}
                         disabled={isLoading}
                         className="flex-1 py-2 px-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                         Trái
                      </button>
                      <button
                         onClick={() => handleAction('orbit-right')}
                         disabled={isLoading}
                         className="flex-1 py-2 px-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         Phải
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                      </button>
                   </div>
                </div>

                {/* Zoom */}
                <div>
                   <div className="text-xs font-bold text-[#B1ADA1] uppercase mb-3 text-center">Thu / Phóng (Zoom)</div>
                   <div className="flex gap-3">
                      <button
                         onClick={() => handleAction('zoom-out')}
                         disabled={isLoading}
                         className="flex-1 py-2 px-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                         Ra xa
                      </button>
                      <button
                         onClick={() => handleAction('zoom-in')}
                         disabled={isLoading}
                         className="flex-1 py-2 px-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                         Lại gần
                      </button>
                   </div>
                </div>

                {/* Actions: Undo & Reset */}
                <div className="flex gap-3 pt-2 border-t border-[#EAE8E0]">
                   <button
                      onClick={handleUndo}
                      disabled={history.length === 0 || isLoading}
                      className="flex-1 py-2 text-xs font-bold text-gray-500 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                   >
                      ↩ Hoàn tác
                   </button>
                   <button
                      onClick={() => { setCurrentImage(null); setHistory([]); }}
                      className="flex-1 py-2 text-xs font-bold text-red-500 border border-dashed border-red-200 rounded-lg hover:bg-red-50"
                   >
                      🗑️ Xóa ảnh
                   </button>
                </div>

             </div>
          )}
          
          {error && <div className="text-xs text-red-500 text-center bg-red-50 p-2 rounded border border-red-100">{error}</div>}
        </div>
      </div>

      {/* Right Panel: Viewer */}
      <div className="flex-1 bg-[#1a1a1a] rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center border border-[#B1ADA1]">
        {!currentImage ? (
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4 opacity-20">📷</div>
            <p>Tải ảnh lên để bắt đầu khám phá</p>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
              {isLoading && (
                  <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <svg className="animate-spin h-10 w-10 mb-4 text-[#C15F3C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="font-light text-lg tracking-wide">AI đang tạo góc nhìn mới...</p>
                      <p className="text-xs text-gray-400 mt-2">Vui lòng chờ trong giây lát</p>
                  </div>
              )}
              
              <PhotoProvider>
                 <PhotoView src={currentImage}>
                    <img 
                      src={currentImage} 
                      alt="Virtual Tour View" 
                      className="max-w-full max-h-full object-contain shadow-2xl cursor-zoom-in"
                    />
                 </PhotoView>
              </PhotoProvider>

              {/* Download Button Overlay */}
              <a 
                href={currentImage} 
                download={`virtual-tour-${Date.now()}.png`}
                className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-[#C15F3C] hover:border-[#C15F3C] transition-all shadow-lg"
                title="Tải ảnh về"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualTourView;
