
import React, { useState, useEffect, useRef } from 'react';
import { editImage, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import Button from './Button';
import ImageUploader from './ImageUploader';
import ResultGallery from './ResultGallery';

const MaterialEditor: React.FC = () => {
  // --- State ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  // Generation
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [prompt, setPrompt] = useState('');
  const [imageCount, setImageCount] = useState(1);
  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Timer & Upscaling
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

  // Prompt Templates
  const promptTemplates: Record<string, string> = {
    'sàn nhà': "Thay vật liệu sàn ở ảnh 1 bằng vật liệu mới trong ảnh 2, chia thành từng viên gạch theo tỉ lệ 800x800.",
    'bề mặt tường': "Thay vật liệu bề mặt tường ở ảnh 1 bằng vật liệu mới trong ảnh 2, giữ nguyên ánh sáng và bóng đổ hiện có.",
    'rèm cửa': "Thay vật liệu rèm cửa ở ảnh 1 bằng vật liệu mới trong ảnh 2, giữ nguyên các nếp gấp vải mềm mại.",
    'ghế sofa': "Thay vật liệu ghế sofa ở ảnh 1 bằng vật liệu mới trong ảnh 2, giữ nguyên phom dáng và nếp nhăn của đệm.",
    'tủ bếp': "Thay vật liệu tủ bếp ở ảnh 1 bằng vật liệu mới trong ảnh 2, giữ nguyên tay nắm và chi tiết cánh tủ.",
    'trần nhà': "Thay vật liệu trần nhà ở ảnh 1 bằng vật liệu mới trong ảnh 2, giữ nguyên hệ thống đèn chiếu sáng.",
    'thảm': "Thay vật liệu thảm sàn ở ảnh 1 bằng vật liệu mới trong ảnh 2, giữ nguyên texture lông mềm."
  };

  // --- Initialization ---
  
  useEffect(() => {
    if (sourceFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setOriginalImageSrc(result);
      };
      reader.readAsDataURL(sourceFile);
    } else {
      setOriginalImageSrc(null);
      setOriginalImage(null);
      setLatestImages([]);
      setHistoryImages([]);
    }
  }, [sourceFile]);

  useEffect(() => {
      if (originalImageSrc) {
          const img = new Image();
          img.src = originalImageSrc;
          img.onload = () => setOriginalImage(img);
      }
  }, [originalImageSrc]);

  // --- Actions ---

  const handleMaterialChange = (material: string) => {
    setSelectedMaterial(material);
    if (material && promptTemplates[material]) {
      setPrompt(promptTemplates[material]);
    }
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

  const handleGenerate = async () => {
    if (!originalImageSrc) {
        setError("Vui lòng tải ảnh gốc.");
        return;
    }
    if (!referenceFile) {
        setError("Vui lòng tải ảnh vật liệu tham khảo.");
        return;
    }
    if (!prompt.trim()) {
        setError("Vui lòng nhập mô tả thay đổi vật liệu.");
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
        const base64Original = originalImageSrc.split(',')[1];
        const base64Ref = await fileToBase64(referenceFile);
        
        // Enforce dimension constraints
        const dimensionInstruction = "CRITICAL: The output image must have the EXACT same pixel dimensions and aspect ratio as the Source Image (Image 1). Do NOT adopt the dimensions or aspect ratio of the Reference Image (Image 2).";
        const finalPrompt = `${dimensionInstruction} ${prompt}`;

        const results = await editImage(
            base64Original,
            finalPrompt,
            base64Ref,
            null, // No mask used for whole-surface material replacement
            imageCount
        );
        
        const newImages: GeneratedImage[] = results.map(url => ({
            src: url,
            prompt: finalPrompt,
            timestamp: new Date(),
        }));

        setLatestImages(newImages);
        setStatus('success');
    } catch (e) {
        console.error(e);
        setError("Có lỗi xảy ra khi thay vật liệu.");
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

  const getAspectRatio = () => {
      if (originalImage) {
          return `${originalImage.naturalWidth}:${originalImage.naturalHeight}`;
      }
      return '16:9';
  }

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden">
      {/* --- Left Panel: Inputs --- */}
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Thay Đổi Vật Liệu</h2>
        
        {/* 1. Source Image */}
        <div className="mb-4">
           <ImageUploader 
             title="Tải ảnh gốc (Ảnh 1)" 
             onFileSelect={setSourceFile} 
             selectedFile={sourceFile} 
             required 
           />
        </div>

        {/* 2. Reference Material Image */}
        <div className="mb-6">
           <ImageUploader 
             title="Ảnh vật liệu tham khảo (Ảnh 2)" 
             onFileSelect={setReferenceFile} 
             selectedFile={referenceFile} 
             required 
           />
        </div>

        {/* 3. Material Prompt */}
        <div className="mb-4 space-y-3">
             <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Vật liệu / Bề mặt cần thay</label>
                <div className="relative">
                  <select
                    value={selectedMaterial}
                    onChange={(e) => handleMaterialChange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
                  >
                    <option value="">-- Chọn bề mặt --</option>
                    {Object.keys(promptTemplates).map((mat) => (
                      <option key={mat} value={mat} className="capitalize">
                        {mat.charAt(0).toUpperCase() + mat.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
             </div>

             <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt đầy đủ (Có thể chỉnh sửa)</label>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Mô tả chi tiết yêu cầu thay đổi..."
                    className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-24 resize-none text-gray-700 leading-relaxed"
                />
             </div>
        </div>

        {/* 4. Count */}
        <div className="mb-6">
            <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-2">Số lượng phương án</label>
            <div className="grid grid-cols-4 gap-2">
               {[1, 2, 3, 4].map((count) => (
                 <button
                   key={count}
                   onClick={() => setImageCount(count)}
                   className={`py-2 text-xs font-medium rounded border transition-colors ${
                     imageCount === count 
                     ? 'bg-[#EAE8E0] text-[#C15F3C] border-[#C15F3C]' 
                     : 'bg-white text-gray-600 border-[#B1ADA1] hover:bg-gray-50'
                   }`}
                 >
                   {count}
                 </button>
               ))}
             </div>
        </div>

        <Button 
            onClick={handleGenerate}
            isLoading={status === 'generating'}
            className="w-full py-3 text-lg shadow-lg"
        >
            THAY VẬT LIỆU
        </Button>
        
        {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}
      </div>

      {/* --- Right Panel: Results --- */}
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

export default MaterialEditor;
