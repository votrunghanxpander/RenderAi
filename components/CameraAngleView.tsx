
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { changeCameraAngle, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { ImageQualitySelector, QualityOption } from './common';

const CameraAngleView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  // State for Form
  const [selectedAngle, setSelectedAngle] = useState('');
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

  // Angle Options
  const angleOptions = [
    { label: 'Chụp từ trên cao xuống (Bird\'s Eye / Top-down View)', prompt: 'Bird\'s eye view, top-down perspective looking down at the scene.' },
    { label: 'Góc thấp (Worm\'s Eye / Hùng vĩ)', prompt: 'Low angle shot, worm\'s eye view, looking up at the building to make it look grand and imposing.' },
    { label: 'Góc nhìn ngang tầm mắt (Eye Level)', prompt: 'Eye level view, human perspective, neutral and realistic straight-on angle.' },
    { label: 'Góc nhìn 3/4 từ bên trái', prompt: '3/4 view from the left side, revealing depth and dimension.' },
    { label: 'Góc nhìn 3/4 từ bên phải', prompt: '3/4 view from the right side, revealing depth and dimension.' },
    { label: 'Chụp toàn cảnh từ xa (Wide Angle)', prompt: 'Wide angle shot from a distance, capturing the entire structure and environment context.' },
    { label: 'Chụp cận cảnh chi tiết (Close-up)', prompt: 'Close-up architectural photography detail shot, focusing on texture and material.' },
    { label: 'Góc chụp chính diện, đối xứng (Frontal Elevation)', prompt: 'Direct frontal elevation view, symmetrical composition, flat lay style.' },
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
      setError("Vui lòng tải ảnh lên.");
      return;
    }
    if (!selectedAngle) {
      setError("Vui lòng chọn góc camera.");
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
      
      // Find prompt text associated with selected value
      const anglePrompt = angleOptions.find(opt => opt.label === selectedAngle)?.prompt || selectedAngle;

      const results = await changeCameraAngle(
        base64,
        anglePrompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `Camera Angle: ${selectedAngle}`,
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

  const getAspectRatio = () => '16:9'; 

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Góc Camera</h2>

        {/* 1. Upload */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-700 mb-2">1. Tải ảnh lên</label>
          <ImageUploader 
            title="" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        {/* 2. Camera Selection */}
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 mb-2">2. Chọn góc camera</label>
            <div className="relative">
                <select
                    value={selectedAngle}
                    onChange={(e) => setSelectedAngle(e.target.value)}
                    className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
                >
                    <option value="">-- Chọn góc camera --</option>
                    {angleOptions.map((opt, idx) => (
                        <option key={idx} value={opt.label}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>

        {/* 3. Image Count */}
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

        {/* 4. Image Quality */}
        <div className="mb-6">
            <ImageQualitySelector 
              value={imageQuality} 
              onChange={setImageQuality} 
            />
        </div>

        <Button 
            onClick={handleGenerate} 
            isLoading={status === 'generating'} 
            className="w-full mt-4 bg-[#C15F3C] hover:bg-[#A04B2D] py-3 text-lg shadow-lg"
        >
            TẠO ẢNH
        </Button>

        {error && (
            <div className="text-xs text-red-500 mt-2 text-center">{error}</div>
        )}
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

export default CameraAngleView;
