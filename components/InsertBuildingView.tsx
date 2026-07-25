
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { insertBuildingIntoSite, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const InsertBuildingView: React.FC = () => {
  // State for Uploads
  const [siteFile, setSiteFile] = useState<File | null>(null);
  const [buildingFile, setBuildingFile] = useState<File | null>(null);

  // State for Form
  const [selectedPrompt, setSelectedPrompt] = useState('');
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

  const samplePrompts = [
    "Đặt công trình vào vị trí đất trống, điều chỉnh ánh sáng và bóng đổ cho phù hợp với môi trường xung quanh.",
    "Ghép tòa nhà vào phối cảnh đường phố, giữ nguyên tỷ lệ, góc nhìn và không khí chung của ảnh hiện trạng.",
    "Hòa nhập kiến trúc này vào bối cảnh thiên nhiên, tạo cảm giác chân thực và sống động.",
    "Thay thế công trình cũ trong ảnh hiện trạng bằng công trình mới này, giữ lại cây xanh và đường sá."
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

  const handleSamplePromptChange = (val: string) => {
      setSelectedPrompt(val);
      setCustomPrompt(val); // Auto-fill custom prompt
  };

  const handleGenerate = async () => {
    if (!siteFile) {
      setError("Vui lòng tải lên ảnh hiện trạng (Background).");
      return;
    }
    if (!buildingFile) {
      setError("Vui lòng tải lên ảnh công trình (Foreground).");
      return;
    }
    if (!customPrompt.trim()) {
      setError("Vui lòng nhập mô tả.");
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
      const siteBase64 = await fileToBase64(siteFile);
      const buildingBase64 = await fileToBase64(buildingFile);

      const results = await insertBuildingIntoSite(
        siteBase64,
        buildingBase64,
        customPrompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: customPrompt,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Có lỗi xảy ra khi tạo ảnh. Vui lòng thử lại.');
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

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Chèn Công Trình Vào Hiện Trạng</h2>

        {/* Uploads */}
        <div className="space-y-6 mb-6">
          <ImageUploader 
            title="1. Ảnh Hiện Trạng (Background)" 
            required={true} 
            selectedFile={siteFile} 
            onFileSelect={setSiteFile} 
          />
          <ImageUploader 
            title="2. Ảnh Công Trình (Object)" 
            required={true} 
            selectedFile={buildingFile} 
            onFileSelect={setBuildingFile} 
          />
        </div>

        {/* Prompt Selection */}
        <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt Mẫu</label>
                <div className="relative">
                  <select
                    value={selectedPrompt}
                    onChange={(e) => handleSamplePromptChange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
                  >
                    <option value="">-- Chọn yêu cầu --</option>
                    {samplePrompts.map((p, idx) => (
                        <option key={idx} value={p}>{p}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Mô tả chi tiết (Prompt)</label>
                <textarea 
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Mô tả chi tiết cách chèn công trình..."
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
                TẠO ẢNH PHỐI CẢNH
            </Button>

            {error && (
                <div className="text-xs text-red-500 mt-2 text-center">{error}</div>
            )}
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 h-full">
         <ResultGallery 
           status={status}
           latestImages={latestImages}
           historyImages={historyImages}
           imageCount={imageCount}
           generationTime={generationTime}
           aspectRatio="16:9" // Default aspect ratio for this view
           onUpscale={handleUpscale}
           upscalingStatus={upscalingStatus}
         />
      </div>
    </div>
  );
};

export default InsertBuildingView;
