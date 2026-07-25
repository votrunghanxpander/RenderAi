
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import ResultGallery from './ResultGallery';
import ImageUploader from './ImageUploader';
import { generateArchitecturalRender, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { AspectRatioSelector, ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const FloorPlanTo3DView: React.FC = () => {
  // State for Uploads
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  
  // State for Form
  const [style, setStyle] = useState('Modern (Hiện đại)');
  const [lighting, setLighting] = useState('Ánh sáng tự nhiên');
  const [cameraAngle, setCameraAngle] = useState('Ngang tầm mắt (Eye-level)');
  const [negativePrompt, setNegativePrompt] = useState('mờ, chất lượng thấp, biến dạng, sai phối cảnh, text, chữ');
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
    // Determine perspective instructions based on camera angle
    let viewDescription = "interior eye-level perspective view";
    let perspectiveDetail = "Eye-level shot, human perspective";

    if (cameraAngle.includes("trên xuống")) {
      viewDescription = "3D top-down floor plan view (Bird's eye view)";
      perspectiveDetail = "Top-down view looking straight down or slightly angled to show layout clearly, axonometric style";
    } else if (cameraAngle.includes("chéo") || cameraAngle.includes("Isometric")) {
      viewDescription = "3D isometric interior view";
      perspectiveDetail = "Isometric view (Diagonal angle) from a high corner, showing depth and 3D volume of furniture";
    } else if (cameraAngle.includes("rộng")) {
      viewDescription = "wide-angle interior perspective view";
      perspectiveDetail = "Wide-angle shot capturing the entire room context";
    }

    // Constructing a specific prompt for Plan to 3D
    const baseInstruction = `Task: Convert the provided 2D floor plan (Image 1) into a realistic ${viewDescription}.`;
    const refInstruction = referenceFile 
        ? `Style Reference: Use Image 2 strictly as the style guide for furniture design, materials, color palette, and overall atmosphere.` 
        : `Style: Generate a ${style} design.`;
    
    const details = `
      Lighting: ${lighting}.
      Layout Requirement: Strictly follow the furniture arrangement, door/window positions, and room structure shown in the floor plan (Image 1). Do not change the layout.
      Perspective: ${perspectiveDetail}, photorealistic, 8k resolution, architectural photography.
      Negative Prompt: ${negativePrompt}.
      Aspect Ratio: ${aspectRatio}.
    `;

    setFullPrompt(`${baseInstruction} ${refInstruction} ${details}`);
  }, [planFile, referenceFile, style, lighting, cameraAngle, negativePrompt, aspectRatio]);

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
    if (!planFile) {
      setError("Vui lòng tải lên ảnh mặt bằng nội thất.");
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
      const planBase64 = await fileToBase64(planFile);
      const refBase64 = referenceFile ? await fileToBase64(referenceFile) : null;

      const results = await generateArchitecturalRender(
        planBase64,
        refBase64,
        fullPrompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: fullPrompt,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Tạo phối cảnh thất bại. Vui lòng thử lại.');
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
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Render 3D từ Mặt bằng</h2>

        <div className="space-y-6 mb-6">
          <ImageUploader 
            title="1. Tải Ảnh Mặt Bằng (2D Floor Plan)" 
            required={true} 
            selectedFile={planFile} 
            onFileSelect={setPlanFile} 
          />
          <ImageUploader 
            title="2. Ảnh Phong Cách Tham Khảo (Reference)" 
            required={false} 
            selectedFile={referenceFile} 
            onFileSelect={setReferenceFile} 
          />
        </div>

        <div className="space-y-4 mb-6">
          
          {renderDropdown('Phong cách', style, setStyle, [
            'Modern (Hiện đại)', 'Minimalist (Tối giản)', 'Scandinavian (Bắc Âu)',
            'Indochine (Đông Dương)', 'Neoclassical (Tân cổ điển)', 'Industrial (Công nghiệp)',
            'Luxury (Sang trọng)', 'Wabi Sabi', 'Japandi'
          ])}

          {renderDropdown('Ánh sáng', lighting, setLighting, [
            'Ánh sáng tự nhiên (Natural Light)', 'Ánh sáng vàng ấm (Warm)', 'Ánh sáng trắng (Cool)',
            'Dramatic (Tương phản cao)', 'Ban đêm (Night mode)', 'Hoàng hôn (Sunset)'
          ])}

          {renderDropdown('Góc nhìn (Camera)', cameraAngle, setCameraAngle, [
            'Ngang tầm mắt (Eye-level)',
            'Từ trên xuống (Top-down / Bird\'s eye)',
            'Góc chéo (Isometric / Diagonal)',
            'Góc rộng (Wide Angle)'
          ])}
          
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt loại trừ</label>
            <textarea 
              value={negativePrompt} 
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-16 resize-none"
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

          <div className="space-y-1.5">
             <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt đầy đủ (Preview)</label>
             <textarea 
               value={fullPrompt} 
               readOnly
               className="w-full p-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-xs text-gray-500 outline-none h-24 resize-none"
             />
          </div>

          <Button 
            onClick={handleGenerate} 
            isLoading={status === 'generating'} 
            className="w-full mt-4 bg-[#C15F3C] hover:bg-[#A04B2D] py-3 text-lg shadow-lg"
          >
            RENDER 3D
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

export default FloorPlanTo3DView;
