
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { generate3DSectionPerspective, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const SectionPerspectiveView: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');

  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

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
      setError("Vui lòng tải ảnh công trình.");
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
      
      const results = await generate3DSectionPerspective(base64, imageCount);

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: '3D Section Perspective',
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Tạo ảnh thất bại. Vui lòng thử lại.');
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
        setLatestImages(prev => prev.map(img => img.src === src ? { ...img, src: newSrc, resolution } : img));
        setHistoryImages(prev => prev.map(img => img.src === src ? { ...img, src: newSrc, resolution } : img));
      }
    } catch (e) {
      console.error(e);
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
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">3D Section Perspective</h2>
        <p className="text-sm text-gray-500 mb-6">Tạo mặt cắt 3D Perspective với các chi tiết kỹ thuật và ghi chú rõ ràng.</p>

        <div className="mb-6">
          <ImageUploader title="Ảnh Công Trình" required={true} selectedFile={sourceFile} onFileSelect={setSourceFile} />
        </div>

        <div className="space-y-4 mb-6">
           {/* Display Full Prompt */}
           <div className="bg-gray-50 border border-[#B1ADA1] rounded-lg p-4">
               <label className="block text-xs font-bold text-gray-700 mb-2">Full Prompt được sử dụng:</label>
               <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[300px] overflow-y-auto scrollbar-thin">
{`Create a 3D sectional perspective cutaway of a modern house.

Remove part of the walls and roof to reveal all interior spaces clearly.

Show the structure: concrete pile foundation, basement utilities, reinforced concrete slab, tempered glass walls, engineered wood floor, plaster ceiling, thermal insulation layers, rooftop garden, wooden pergola, etc.

Include small technical annotation labels pointing to each component.

Use clean, modern infographic style—similar to the reference image.

High detail, sharp lines, crisp edges, 2K resolution.

Highlight the cut plane with a darker section cut fill.

Bright daylight lighting, realistic but still presentation-friendly.

Avoid incorrect text, avoid blur, avoid watermark, avoid distortion

Tất cả các chữ cần là tiếng việt. nếu là từ chuyên ngành thì có thể giữ tiếng anh

- Use font: Inter (primary), Roboto or Open Sans (fallback).
- Use advanced text renderer engine.
- Enable full Unicode glyph support.
- Do not detach accents from base characters.
- Preserve glyph integrity when vectorizing or resizing.
- Kerning/spacing optimized for Vietnamese.
- Ensure typography is clear and legible.
- Ensure accurate Vietnamese diacritics for all text.
- Ensure accurate Vietnamese diacritic placement even in stylized text.
- Do not replace glyphs with random symbols unless specified.
- Required characters must display correctly: ă, â, ê, ô, ơ, ư, đ and tone marks.
- Ensure accurate Vietnamese diacritics. Typography is clear and legible.

Accuracy validation:
Ensure accurate Vietnamese diacritics. Typography is clear and legible.`}
               </div>
           </div>
           
           <ImageCountSelector 
             value={imageCount} 
             onChange={setImageCount} 
           />

           <ImageQualitySelector 
             value={imageQuality} 
             onChange={setImageQuality} 
           />

           <Button onClick={handleGenerate} isLoading={status === 'generating'} className="w-full py-3 mt-2">TẠO MẶT CẮT 3D</Button>
           {error && <div className="text-xs text-red-500 text-center mt-2">{error}</div>}
        </div>
      </div>
      <div className="flex-1 h-full">
         <ResultGallery 
           status={status} latestImages={latestImages} historyImages={historyImages} 
           imageCount={imageCount} generationTime={generationTime} aspectRatio="16:9" 
           onUpscale={handleUpscale} upscalingStatus={upscalingStatus} 
         />
      </div>
    </div>
  );
};

export default SectionPerspectiveView;

