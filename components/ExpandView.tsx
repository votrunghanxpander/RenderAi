
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { expandImage, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { ImageQualitySelector, QualityOption } from './common';

const ExpandView: React.FC = () => {
  // State
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetAspectRatio, setTargetAspectRatio] = useState('16:9');
  const [prompt, setPrompt] = useState('');
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

  const aspectRatios = [
    { label: 'Vuông (1:1)', value: '1:1' },
    { label: 'Ngang (4:3)', value: '4:3' },
    { label: 'Dọc (3:4)', value: '3:4' },
    { label: 'Rộng (16:9)', value: '16:9' },
    { label: 'Story (9:16)', value: '9:16' },
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
      setError("Vui lòng tải ảnh cần mở rộng.");
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
      
      const results = await expandImage(
        base64,
        targetAspectRatio,
        prompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `Outpaint to ${targetAspectRatio}: ${prompt}`,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Có lỗi xảy ra khi mở rộng ảnh. Vui lòng thử lại.');
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

  const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      setSourceFile(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
       {/* Left Panel */}
       <div className="w-full lg:w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
          <h2 className="text-xl font-bold text-[#C15F3C] mb-2">Mở rộng View</h2>
          <p className="text-sm text-[#B1ADA1] mb-6">Mở rộng khung hình của ảnh theo tỉ lệ mong muốn bằng cách AI tự động vẽ thêm phần còn thiếu.</p>

          {/* 1. Upload */}
          <div className="mb-6">
             <label className="block text-xs font-bold text-gray-700 mb-2">1. Tải ảnh cần mở rộng</label>
             {!sourceFile ? (
                <ImageUploader 
                    title=""
                    selectedFile={sourceFile}
                    onFileSelect={setSourceFile}
                />
             ) : (
                 <div className="relative group">
                     <img 
                        src={URL.createObjectURL(sourceFile)} 
                        alt="Source" 
                        className="w-full h-48 object-contain bg-[#F4F3EE] border border-[#B1ADA1] rounded-lg"
                     />
                     <button 
                        onClick={handleRemove}
                        className="absolute top-2 right-2 bg-white/80 text-red-500 p-1 rounded-full shadow-sm hover:bg-white"
                     >
                         <span className="text-xs font-bold px-2">Xóa</span>
                     </button>
                 </div>
             )}
          </div>

          {/* 2. Aspect Ratio */}
          <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 mb-2">2. Chọn tỉ lệ khung hình mới</label>
              <div className="grid grid-cols-3 gap-2">
                  {aspectRatios.map(ratio => (
                      <button
                        key={ratio.value}
                        onClick={() => setTargetAspectRatio(ratio.value)}
                        className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                            targetAspectRatio === ratio.value
                            ? 'bg-[#C15F3C] text-white border-[#C15F3C]'
                            : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
                        }`}
                      >
                          {ratio.label}
                      </button>
                  ))}
              </div>
          </div>

          {/* 3. Prompt */}
          <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 mb-2">3. Mô tả phần mở rộng (Tùy chọn)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Bầu trời xanh, cây cối hai bên đường..."
                className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-24 resize-none"
              />
          </div>

          {/* 4. Count */}
          <div className="mb-6">
             <label className="block text-xs font-bold text-gray-700 mb-2">Số lượng ảnh</label>
             <div className="flex items-center justify-between bg-white border border-[#B1ADA1] rounded-lg p-1">
                <button 
                    onClick={() => setImageCount(Math.max(1, imageCount - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md"
                >
                    -
                </button>
                <span className="font-bold text-gray-800">{imageCount}</span>
                <button 
                    onClick={() => setImageCount(Math.min(4, imageCount + 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md"
                >
                    +
                </button>
             </div>
          </div>

          {/* 5. Image Quality */}
          <div className="mb-6">
            <ImageQualitySelector 
              value={imageQuality} 
              onChange={setImageQuality} 
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            isLoading={status === 'generating'} 
            className="w-full py-3 text-lg shadow-lg bg-[#C15F3C] hover:bg-[#A04B2D]"
          >
              {status === 'generating' ? 'Đang mở rộng...' : '✨ Mở rộng View'}
          </Button>
          
          {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}
       </div>

       {/* Right Panel: Results */}
       <div className="flex-1 h-full min-h-[400px]">
           <ResultGallery 
              status={status}
              latestImages={latestImages}
              historyImages={historyImages}
              imageCount={imageCount}
              generationTime={generationTime}
              aspectRatio={targetAspectRatio}
              onUpscale={handleUpscale}
              upscalingStatus={upscalingStatus}
           />
       </div>
    </div>
  );
};

export default ExpandView;