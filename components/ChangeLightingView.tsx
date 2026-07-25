
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { changeImageLighting, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

type LightingCategory = 'interior' | 'exterior';

const ChangeLightingView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  // State for Form
  const [category, setCategory] = useState<LightingCategory>('interior');
  const [selectedLighting, setSelectedLighting] = useState('');
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

  // Lighting Suggestions
  const lightingOptions = {
    interior: [
        { label: 'Ánh sáng tự nhiên (Ban ngày)', prompt: 'Soft natural daylight streaming through windows, bright and airy atmosphere, clear visibility.' },
        { label: 'Nắng vàng (Golden Hour)', prompt: 'Warm golden hour sunlight casting long dramatic shadows into the room, cozy and nostalgic feel.' },
        { label: 'Ban đêm (Đèn vàng ấm)', prompt: 'Night time interior, warm artificial lighting (3000K) from lamps and ceiling lights, cozy and intimate.' },
        { label: 'Ban đêm (Sang trọng/Lạnh)', prompt: 'Night time interior, cool and modern lighting, moody contrast, high-end atmosphere.' },
        { label: 'Ánh sáng nến (Lãng mạn)', prompt: 'Dimly lit room by candlelight, soft warm glow, romantic and mysterious ambiance.' },
        { label: 'Cyberpunk / Neon', prompt: 'Futuristic lighting with neon blue and pink accents, cinematic and high contrast.' },
        { label: 'Trời âm u (Moody)', prompt: 'Overcast daylight, soft diffused light, no harsh shadows, moody and calm atmosphere.' }
    ],
    exterior: [
        { label: 'Ban ngày (Trời trong xanh)', prompt: 'Bright sunny day, clear blue sky, sharp shadows, high visibility, vibrant colors.' },
        { label: 'Hoàng hôn / Bình minh', prompt: 'Dramatic sunset with purple and orange sky, warm golden lighting on the building facade.' },
        { label: 'Ban đêm (Đèn đường/Thành phố)', prompt: 'Night scene with glowing city lights, street lamps illuminating the building, dark sky.' },
        { label: 'Trời mưa (Ướt át)', prompt: 'Rainy weather, wet reflective ground surfaces, overcast sky, moody atmosphere.' },
        { label: 'Sương mù (Huyền bí)', prompt: 'Foggy and misty atmosphere, soft diffused light, mysterious and ethereal look.' },
        { label: 'Mùa đông (Tuyết)', prompt: 'Winter scene with snow, cold blue lighting, overcast sky, soft white ambient light.' },
        { label: 'Giờ xanh (Blue Hour)', prompt: 'Blue hour twilight, deep blue sky, artificial lights just turning on, balanced exposure.' }
    ]
  };

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

  const handleLightingSelect = (val: string) => {
      setSelectedLighting(val);
      // Find the prompt associated with the label
      const option = lightingOptions[category].find(opt => opt.label === val);
      if (option) {
          setCustomPrompt(option.prompt);
      }
  };

  const handleGenerate = async () => {
    if (!sourceFile) {
      setError("Vui lòng tải lên ảnh cần đổi ánh sáng.");
      return;
    }
    if (!customPrompt.trim()) {
      setError("Vui lòng chọn hoặc nhập mô tả ánh sáng.");
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

      const results = await changeImageLighting(
        base64,
        customPrompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `Change lighting: ${selectedLighting} - ${customPrompt}`,
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

  const getAspectRatio = () => '16:9'; // Default fallback, user can view full image in lightbox

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Thay Đổi Ánh Sáng</h2>

        {/* Uploads */}
        <div className="mb-6">
          <ImageUploader 
            title="Ảnh Cần Xử Lý" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">
            
            {/* Category Selector */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Loại không gian</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setCategory('interior'); setSelectedLighting(''); setCustomPrompt(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            category === 'interior' 
                            ? 'bg-[#C15F3C] text-white border-[#C15F3C]' 
                            : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
                        }`}
                    >
                        Nội thất (Interior)
                    </button>
                    <button
                        onClick={() => { setCategory('exterior'); setSelectedLighting(''); setCustomPrompt(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                            category === 'exterior' 
                            ? 'bg-[#C15F3C] text-white border-[#C15F3C]' 
                            : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
                        }`}
                    >
                        Ngoại thất (Exterior)
                    </button>
                </div>
            </div>

            {/* Lighting Style Dropdown */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Chọn kiểu ánh sáng</label>
                <div className="relative">
                  <select
                    value={selectedLighting}
                    onChange={(e) => handleLightingSelect(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
                  >
                    <option value="">-- Chọn kiểu ánh sáng --</option>
                    {lightingOptions[category].map((opt, idx) => (
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
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Mô tả chi tiết (Prompt)</label>
                <textarea 
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Mô tả chi tiết ánh sáng bạn muốn..."
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
                THAY ĐỔI ÁNH SÁNG
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
           aspectRatio={getAspectRatio()}
           onUpscale={handleUpscale}
           upscalingStatus={upscalingStatus}
         />
      </div>
    </div>
  );
};

export default ChangeLightingView;