
import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import ImageComparison from './ImageComparison';
import { generate2DElevation, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const Elevation2DView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBase64, setSourceBase64] = useState<string | null>(null);

  // State for Form
  const [selectedView, setSelectedView] = useState('Mặt trước (Front View)');
  const [customPrompt, setCustomPrompt] = useState('');
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');

  // Results & Status
  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Timer & Upscaling
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

  useEffect(() => {
      if (sourceFile) {
          fileToBase64(sourceFile).then(base64 => {
              setSourceBase64(`data:image/jpeg;base64,${base64}`);
          });
      } else {
          setSourceBase64(null);
      }
  }, [sourceFile]);

  const viewOptions = [
    { label: 'Mặt trước (Front View)', value: 'Front Elevation' },
    { label: 'Mặt sau (Rear View)', value: 'Rear Elevation' },
    { label: 'Mặt trái (Left View)', value: 'Left Side Elevation' },
    { label: 'Mặt phải (Right View)', value: 'Right Side Elevation' },
    { label: 'Mặt trên (Top/Plan View)', value: 'Roof Plan' },
  ];

  const startTimer = () => {
    setGenerationTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setGenerationTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!sourceFile) {
      setError("Vui lòng tải lên ảnh 3D công trình.");
      return;
    }

    if (latestImages.length > 0) {
      setHistoryImages(prev => [...latestImages, ...prev]);
      setLatestImages([]);
    }

    setStatus('generating');
    setError(null);
    startTimer();

    try {
      const base64 = await fileToBase64(sourceFile);

      // Find label for prompt
      const viewLabel = viewOptions.find(v => v.label === selectedView)?.value || selectedView;

      const results = await generate2DElevation(
        base64,
        viewLabel,
        customPrompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `2D Elevation: ${viewLabel}. ${customPrompt}`,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Có lỗi xảy ra khi tạo bản vẽ. Vui lòng thử lại.');
      setStatus('error');
    } finally {
      stopTimer();
    }
  };

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
        const updateImage = (img: GeneratedImage) => 
          img.src === src ? { ...img, src: newSrc, resolution } : img;

        setLatestImages(prev => prev.map(updateImage));
        setHistoryImages(prev => prev.map(updateImage));
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

  const getAspectRatio = () => '16:9'; // Default fallback

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Biến Ảnh 3D thành Bản Vẽ 2D</h2>

        {/* Uploads */}
        <div className="mb-6">
          <ImageUploader 
            title="1. Tải Ảnh 3D Công Trình" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">
            
            {/* View Selector */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">2. Chọn Góc Nhìn (View)</label>
                <div className="relative">
                  <select
                    value={selectedView}
                    onChange={(e) => setSelectedView(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
                  >
                    {viewOptions.map((opt, idx) => (
                        <option key={idx} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">3. Ghi chú thêm (Tùy chọn)</label>
                <textarea 
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ví dụ: Chỉ giữ lại đường nét kiến trúc chính, bỏ cây cối..."
                    className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-28 resize-none text-gray-700 leading-relaxed"
                />
            </div>

            <ImageCountSelector 
              value={imageCount} 
              onChange={setImageCount} 
            />

            <ImageQualitySelector 
              value={imageQuality} 
              onChange={setImageQuality} 
            />

            <Button 
                onClick={handleGenerate} 
                isLoading={status === 'generating'} 
                className="w-full mt-4 bg-[#C15F3C] hover:bg-[#A04B2D] py-3 text-lg shadow-lg"
            >
                THỰC HIỆN
            </Button>

            {error && (
                <div className="text-xs text-red-500 mt-2 text-center">{error}</div>
            )}
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 h-full flex flex-col bg-white border-l border-[#B1ADA1]/20">
         
         {/* Comparison Slider Area (Only shows if we have a result and a source) */}
         {latestImages.length > 0 && sourceBase64 && (
             <div className="h-[60%] p-4 bg-[#1a1a1a] flex flex-col">
                 <div className="flex justify-between items-center mb-2">
                     <h3 className="text-white text-sm font-bold">So sánh Gốc vs Kết quả</h3>
                 </div>
                 <div className="flex-1 relative border border-gray-700 rounded-lg overflow-hidden">
                     <ImageComparison 
                        beforeImage={sourceBase64}
                        afterImage={latestImages[0].src}
                        labelBefore="Ảnh 3D Gốc"
                        labelAfter="Bản vẽ 2D"
                     />
                 </div>
             </div>
         )}

         {/* History / List Area */}
         <div className="flex-1 min-h-0 border-t border-[#B1ADA1]/20">
            <ResultGallery 
                status={status}
                latestImages={latestImages}
                historyImages={historyImages}
                imageCount={imageCount}
                generationTime={generationTime}
                aspectRatio={getAspectRatio()}
                onUpscale={handleUpscale}
                upscalingStatus={upscalingStatus}
                className="w-full h-full flex flex-col bg-white overflow-hidden"
            />
         </div>
      </div>
    </div>
  );
};

export default Elevation2DView;
