
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import ResultGallery from './ResultGallery';
import ImageUploader from './ImageUploader';
import { generateArchitecturalRender, generatePromptSuggestions, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { AspectRatioSelector, ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const PlanningRenderView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  
  // Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  
  // Generation State
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
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

  // Clear suggestions when new file is uploaded
  useEffect(() => {
    setSuggestedPrompts([]);
    setSelectedPrompt('');
  }, [sourceFile]);

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

  const handleAnalyze = async () => {
    if (!sourceFile) {
        setError("Vui lòng tải ảnh quy hoạch lên.");
        return;
    }
    setAnalyzing(true);
    setError(null);
    
    try {
        const base64 = await fileToBase64(sourceFile);
        const suggestions = await generatePromptSuggestions(base64);
        setSuggestedPrompts(suggestions);
    } catch (e) {
        console.error(e);
        setError("Không thể phân tích ảnh. Vui lòng thử lại.");
    } finally {
        setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!sourceFile) {
      setError("Vui lòng tải ảnh quy hoạch lên.");
      return;
    }
    if (!selectedPrompt.trim()) {
        setError("Vui lòng chọn hoặc nhập prompt.");
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
      const sourceBase64 = await fileToBase64(sourceFile);
      
      // Combine user prompt with aspect ratio instruction
      const fullPrompt = `Strict aspect ratio ${aspectRatio}. ${selectedPrompt} Maintain the structural layout of the provided master plan image.`;

      const results = await generateArchitecturalRender(
        sourceBase64,
        null, // No separate reference image usually for planning, or could add one later
        fullPrompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: selectedPrompt,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Render generation failed. Please try again.');
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
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Render Quy hoạch 3D</h2>

        {/* Step 1: Upload */}
        <div className="mb-6">
          <ImageUploader 
            title="Tải ảnh quy hoạch (2D/Plan)" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        {/* Step 2: Analysis */}
        <div className="mb-6 pb-6 border-b border-[#EAE8E0]">
            <Button 
                onClick={handleAnalyze} 
                disabled={!sourceFile || analyzing}
                isLoading={analyzing}
                variant="secondary"
                className="w-full"
            >
                {analyzing ? 'Gemini đang phân tích...' : '✨ Phân tích & Gợi ý Prompt'}
            </Button>
        </div>

        {/* Step 3: Prompt Selection */}
        {suggestedPrompts.length > 0 && (
            <div className="space-y-4 mb-6">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Gợi ý từ AI (Chọn 1)</label>
                <div className="space-y-2">
                    {suggestedPrompts.map((p, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setSelectedPrompt(p)}
                            className={`p-3 text-sm border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                selectedPrompt === p 
                                ? 'bg-[#C15F3C]/10 border-[#C15F3C] text-[#C15F3C]' 
                                : 'bg-white border-[#B1ADA1] text-gray-700 hover:border-[#C15F3C]'
                            }`}
                        >
                            <div className="font-bold text-xs mb-1 uppercase opacity-70">Style {idx + 1}</div>
                            <div className="line-clamp-2">{p}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Step 4: Prompt Editing & Controls */}
        <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt chi tiết</label>
                <textarea 
                    value={selectedPrompt} 
                    onChange={(e) => setSelectedPrompt(e.target.value)}
                    placeholder="Mô tả hoặc chọn gợi ý ở trên..."
                    className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-32 resize-none text-gray-600 leading-relaxed"
                />
            </div>

            <AspectRatioSelector 
              value={aspectRatio} 
              onChange={setAspectRatio} 
            />

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
                disabled={!selectedPrompt}
            >
                RENDER QUY HOẠCH
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
           aspectRatio={aspectRatio}
           onUpscale={handleUpscale}
           upscalingStatus={upscalingStatus}
         />
      </div>
    </div>
  );
};

export default PlanningRenderView;