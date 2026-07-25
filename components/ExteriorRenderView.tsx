
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import ResultGallery from './ResultGallery';
import ImageUploader from './ImageUploader';
import { generateArchitecturalRender, fileToBase64, upscaleImage } from './services/gemini';
import { addToHistory } from './services/historyService';
import { LoadingState, GeneratedImage } from '../types';
import { AspectRatioSelector, ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const ExteriorRenderView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  
  // State for Form
  const [customDescription, setCustomDescription] = useState('');
  const [style, setStyle] = useState('Modern (Hiện đại)');
  const [context, setContext] = useState('trên một đường phố Việt Nam');
  const [lighting, setLighting] = useState('sáng');
  const [weather, setWeather] = useState('trong xanh');
  const [negativePrompt, setNegativePrompt] = useState('chữ, dầu mờ, mờ, chất lượng thấp');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');
  
  // Full constructed prompt
  const [fullPrompt, setFullPrompt] = useState('');
  
  // Results & Status
  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Timer & Upscaling
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

  // Auto-construct full prompt
  useEffect(() => {
    const descriptionPart = customDescription ? `${customDescription}, ` : '';
    
    // Requirement: Output must have same dimensions as source image.
    // Requirement: Output must NOT have dimensions of reference image.
    
    let promptIntro = `Tạo một bản render kiến trúc chất lượng cao.`;
    let refInstruction = "";

    if (referenceFile) {
      promptIntro = `Tạo một hình ảnh mới dựa trên bố cục của Ảnh Gốc (Ảnh 1) và phong cách của Ảnh Tham Chiếu (Ảnh 2).`;
      refInstruction = "KHÔNG được lấy kích thước hoặc tỉ lệ khung hình của Ảnh Tham Chiếu (Ảnh 2).";
    } else {
      promptIntro = "Tạo một bản render kiến trúc chân thực dựa trên Ảnh Gốc (Ảnh 1).";
    }

    // Ràng buộc kích thước — yêu cầu TUYỆT ĐỐI
    const dimensionConstraint = `LƯU Ý QUAN TRỌNG: Hình ảnh đầu ra PHẢI có kích thước pixel và tỉ lệ khung hình GIỐNG Y HỆT so với Ảnh Gốc (Ảnh 1). KHÔNG được lấy kích thước hoặc tỉ lệ khung hình của Ảnh Tham Chiếu (Ảnh 2).`;

    // Lưu ý: Chúng tôi gần như bỏ qua trạng thái 'aspectRatio' trong prompt 
    // để ưu tiên tuyệt đối kích thước của ảnh gốc theo yêu cầu.
    const constructedPrompt = `${promptIntro} ${dimensionConstraint} ${refInstruction} 
    Hướng dẫn sáng tạo chính là: ${descriptionPart}một bản render chân thực của tòa nhà theo phong cách ${style}, 
    nằm trong bối cảnh ${context}, với ánh sáng ${lighting}, và thời tiết ${weather}. 
    Hãy tránh các yếu tố sau: ${negativePrompt}.`;

    setFullPrompt(constructedPrompt);
  }, [aspectRatio, negativePrompt, customDescription, style, context, lighting, weather, referenceFile]);

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
      const refBase64 = referenceFile ? await fileToBase64(referenceFile) : null;

      const results = await generateArchitecturalRender(
        sourceBase64,
        refBase64,
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
              type: 'Ngoại thất',
          });
      });

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
        
        // Note: We don't update global history on upscale to keep it simple, 
        // or we could push a new item.
      }
    } catch (e) {
      console.error("Upscaling failed:", e);
      // Could set a transient error state here if desired
    } finally {
      setUpscalingStatus(prev => {
        const newState = { ...prev };
        delete newState[src];
        return newState;
      });
    }
  };

  const renderDropdown = (label: string, value: string, onChange: (val: string) => void, options: string[]) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Render Ngoại thất</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <ImageUploader 
            title="Tải ảnh lên" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
          <ImageUploader 
            title="Ảnh tham khảo" 
            required={false} 
            selectedFile={referenceFile} 
            onFileSelect={setReferenceFile} 
          />
        </div>

        <div className="space-y-4 mb-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Mô tả chi tiết (Tùy chọn)</label>
            <input 
              type="text" 
              value={customDescription} 
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Ví dụ: Một căn biệt thự màu trắng..."
              className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
            />
          </div>

          {renderDropdown('Phong cách kiến trúc', style, setStyle, [
            'Modern (Hiện đại)', 'Neoclassical (Tân cổ điển)', 'Minimalist (Tối giản)', 
            'Indochine (Đông Dương)', 'Scandinavian (Bắc Âu)', 'Wabi Sabi', 
            'Industrial (Công nghiệp)', 'Tropical (Nhiệt đới)', 'Classical (Cổ điển)', 
            'Rustic (Mộc mạc)', 'Bohemian / Boho (Phóng khoáng)'
          ])}

          {renderDropdown('Vị trí', context, setContext, [
            'trên một đường phố Việt Nam', 'ở một làng quê Việt Nam', 
            'trong một khu đô thị hiện đại Việt Nam', 'tại một ngã ba đường phố Việt Nam', 
            'tại một ngã tư đường phố Việt Nam'
          ])}

          {renderDropdown('Ánh sáng', lighting, setLighting, ['sáng', 'trưa', 'tối', 'ban đêm'])}
          
          {renderDropdown('Thời tiết', weather, setWeather, ['trong xanh', 'mưa bão', 'mưa nhỏ', 'âm u'])}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt loại trừ</label>
            <input 
              type="text" 
              value={negativePrompt} 
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
            />
          </div>

          <div className="opacity-50 pointer-events-none">
            <AspectRatioSelector 
              value={aspectRatio} 
              onChange={setAspectRatio} 
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

          <div className="space-y-1.5">
             <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt đầy đủ</label>
             <textarea 
               value={fullPrompt} 
               onChange={(e) => setFullPrompt(e.target.value)}
               className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-32 resize-none text-gray-600 leading-relaxed"
             />
          </div>

          <Button 
            onClick={handleGenerate} 
            isLoading={status === 'generating'} 
            className="w-full mt-4 bg-[#C15F3C] hover:bg-[#A04B2D] py-3 text-lg shadow-lg"
          >
            RENDER NGOẠI THẤT
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

export default ExteriorRenderView;
