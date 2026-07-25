
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { generateAnnotatedRender, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const AnnotatedRenderView: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  
  const [focus, setFocus] = useState('');
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
      
      const results = await generateAnnotatedRender(base64, focus, imageCount);

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `Annotated Render: ${focus}`,
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
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Annotated Architectural Render</h2>
        <p className="text-sm text-gray-500 mb-6">Tạo hình ảnh phân tích kiến trúc với các ghi chú, đường dẫn và diagram.</p>

        <div className="mb-6">
          <ImageUploader title="Ảnh Công Trình" required={true} selectedFile={sourceFile} onFileSelect={setSourceFile} />
        </div>

        <div className="space-y-4 mb-6">
           <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Tập trung phân tích (Focus)</label>
               <textarea 
                  value={focus} 
                  onChange={e => setFocus(e.target.value)} 
                  placeholder="Ví dụ: Cấu trúc mái, vật liệu mặt tiền, hệ thống cửa sổ..." 
                  className="w-full p-2.5 border border-[#B1ADA1] rounded-lg text-sm outline-none focus:border-[#C15F3C] h-24 resize-none" 
               />
           </div>
           
           {/* Display Full Prompt */}
           <div className="bg-gray-50 border border-[#B1ADA1] rounded-lg p-4">
               <label className="block text-xs font-bold text-gray-700 mb-2">Full Prompt được sử dụng:</label>
               <div className="text-xs text-gray-600 whitespace-pre-wrap max-h-[300px] overflow-y-auto scrollbar-thin">
{`Analyze this architectural image and create an "Annotated Architectural Visualization".

Task:
1. Regenerate the image with a style that looks like a blend of photorealism and architectural sketching/diagramming.
2. Add graphical annotations, leader lines, and text labels pointing to key architectural features.
3. Focus primarily on highlighting: ${focus || "Key design elements, materials, and structure"}.
4. Style: Professional architectural presentation, clean lines, white or technical font for labels.
5. Tất cả các chữ cần là tiếng việt. nếu là từ chuyên ngành thì có thể giữ tiếng anh
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
Ensure accurate Vietnamese diacritics. Typography is clear and legible.

The output should look like a page from an architectural analysis portfolio.`}
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

           <Button onClick={handleGenerate} isLoading={status === 'generating'} className="w-full py-3 mt-2">TẠO ẢNH PHÂN TÍCH</Button>
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

export default AnnotatedRenderView;
