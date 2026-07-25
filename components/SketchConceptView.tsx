
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import ResultGallery from './ResultGallery';
import ImageUploader from './ImageUploader';
import { generateArchitecturalRender, fileToBase64, upscaleImage } from './services/gemini';
import { addToHistory } from './services/historyService';
import { LoadingState, GeneratedImage } from '../types';
import { ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const SketchConceptView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  
  // Results & Status
  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');
  
  // Timer & Upscaling
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

  const mainPrompt = `Transform the input architectural render into a clean black-and-white hand-drawn architectural sketch / conceptual elevation drawing.

Requirements:
- Preserve EXACT original building shape, proportions, camera angle, composition, perspective, façade details, openings, landscape positions, and all architectural elements.
- Do NOT redesign the architecture.
- Convert only the visual style from photorealistic render to architectural ink sketch.
- Style should look like:
  - hand-drawn architectural elevation
  - pen and ink line drawing
  - thin precise contour lines
  - monochrome black ink on white paper
  - subtle hatch shading and cross-hatching
  - conceptual architect presentation sketch
  - minimal grayscale tones
  - clean technical illustration
  - soft sketch imperfections
- Remove realistic materials, textures, reflections, and render lighting.
- Keep trees, plants, shadows, railings, windows, and façade curves as sketch linework.
- Background should remain simple white paper style.
- High detail architectural line art.
- Professional architect presentation board style.
- Ultra clean composition.
- No color.
- No watercolor.
- No comic style.
- No anime style.
- No extra buildings or modified geometry.`;

  const negativePrompt = `photorealistic, CGI, realistic texture, colored, watercolor, painting, cartoon, anime, blurry, low detail, distorted architecture, redesigned façade, changed proportions, extra windows, altered structure, messy sketch, heavy shadows`;

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
      setError("Please upload a source image.");
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
      const fullPrompt = `${mainPrompt}\nNegative prompt: ${negativePrompt}`;

      const results = await generateArchitecturalRender(
        sourceBase64,
        null,
        fullPrompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: fullPrompt,
        timestamp: new Date(),
      }));

      // Add to global history
      newImages.forEach(img => {
          addToHistory({
              src: img.src,
              prompt: img.prompt,
              type: 'Sketch Concept',
          });
      });

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Generation failed. Please try again.');
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
        <h2 className="text-xl font-bold text-[#C15F3C] mb-2">Phác thảo / Mặt đứng ý tưởng</h2>
        <p className="text-sm text-[#B1ADA1] mb-6">Chuyển đổi phối cảnh kiến trúc thành bản vẽ phác thảo đen trắng rõ nét.</p>

        <div className="mb-6">
          <ImageUploader 
            title="Tải ảnh phối cảnh cần chuyển đổi" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-4 bg-white/50 border border-[#B1ADA1]/30 rounded-xl space-y-3">
             <h3 className="text-xs font-bold text-[#C15F3C] uppercase tracking-wider">Thông tin quy trình</h3>
             <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
                <li>Giữ nguyên hình khối, tỉ lệ và góc nhìn gốc.</li>
                <li>Chuyển phong cách từ ảnh thật sang nét vẽ kiến trúc (Line art).</li>
                <li>Xóa bỏ vật liệu, ánh sáng render phức tạp.</li>
                <li>Phù hợp làm concept, bản vẽ trình bày ý tưởng.</li>
             </ul>
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
            TẠO BẢN VẼ PHÁC THẢO
          </Button>

          {error && (
            <div className="text-xs text-red-500 mt-2 text-center">{error}</div>
          )}
          
          <div className="mt-8 pt-6 border-t border-[#B1ADA1]/20">
              <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-2">Prompt (Review)</label>
              <div className="text-[10px] text-gray-400 bg-gray-50 p-3 rounded border border-gray-100 font-mono leading-relaxed max-h-40 overflow-y-auto">
                  {mainPrompt}
              </div>
          </div>
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
           aspectRatio="Original"
           onUpscale={handleUpscale}
           upscalingStatus={upscalingStatus}
         />
      </div>
    </div>
  );
};

export default SketchConceptView;
