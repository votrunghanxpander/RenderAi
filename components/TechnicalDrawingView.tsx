
import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import ImageComparison from './ImageComparison';
import { generateArchitecturalRender, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';

const TechnicalDrawingView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBase64, setSourceBase64] = useState<string | null>(null);

  // State for Form
  const [drawingType, setDrawingType] = useState('Tổng hợp (Sheet)');
  const [customPrompt, setCustomPrompt] = useState('');
  const [fullPrompt, setFullPrompt] = useState('');
  const [imageCount, setImageCount] = useState(1);

  // Results & Status
  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Timer & Upscaling
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

  const drawingOptions = [
    { label: 'Tổng hợp (Sheet)', value: 'Composite Sheet' },
    { label: 'Mặt bằng (Floor Plan)', value: 'Floor Plan' },
    { label: 'Mặt cắt (Section)', value: 'Cross Section' },
    { label: 'Mặt đứng trái (Left Elevation)', value: 'Left Elevation' },
    { label: 'Mặt đứng phải (Right Elevation)', value: 'Right Elevation' },
    { label: 'Mặt đứng chính (Front Elevation)', value: 'Front Elevation' },
  ];

  useEffect(() => {
      if (sourceFile) {
          fileToBase64(sourceFile).then(base64 => {
              setSourceBase64(`data:image/jpeg;base64,${base64}`);
          });
      } else {
          setSourceBase64(null);
      }
  }, [sourceFile]);

  // Auto-construct prompt
  useEffect(() => {
      const selectedOption = drawingOptions.find(o => o.label === drawingType);
      const typeValue = selectedOption ? selectedOption.value : 'Composite Sheet';

      let prompt = '';
      
      if (typeValue === 'Composite Sheet') {
          prompt = `Create a comprehensive architectural technical drawing sheet for this building.
Content must include:
1. Ground Floor Plan (shows layout, walls, doors).
2. Cross Section (shows vertical structure, levels).
3. Left Elevation.
4. Right Elevation.
Layout: Arrange these 4 views on a single white sheet in a grid or professional presentation board layout.
Style: 2D CAD Blueprint, clean black lines on white background, technical annotations, scale bars. High contrast.
${customPrompt}`;
      } else {
          prompt = `Create a specific architectural technical drawing: ${typeValue}.
Translate the 3D geometry of the provided image into a precise 2D CAD drawing.
Style: Black line drawing on white background (Blueprint style).
Details: Show structural elements, windows, doors, and levels clearly. Remove perspective distortion (Orthographic).
${customPrompt}`;
      }
      setFullPrompt(prompt.trim());
  }, [drawingType, customPrompt]);

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
      setError("Vui lòng tải lên ảnh 3D công trình.");
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
      
      // Find label for prompt logging
      const selectedOption = drawingOptions.find(o => o.label === drawingType);
      const typeValue = selectedOption ? selectedOption.value : 'Composite Sheet';

      const results = await generateArchitecturalRender(
        base64,
        null,
        fullPrompt, // Use the full prompt from state (which might have been edited by user)
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `Tech Drawing: ${typeValue}`,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Có lỗi xảy ra khi tạo bản vẽ. Vui lòng thử lại.');
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
      if (drawingType === 'Tổng hợp (Sheet)') return '4:3'; // Sheets are usually landscape or close to A-series ratio
      return '16:9';
  };

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Tạo Bản Vẽ Kỹ Thuật</h2>
        <p className="text-sm text-gray-500 mb-6">Chuyển đổi ảnh phối cảnh 3D thành các bản vẽ kỹ thuật 2D (Mặt bằng, Mặt cắt, Mặt đứng).</p>

        {/* Uploads */}
        <div className="mb-6">
          <ImageUploader 
            title="1. Tải Ảnh 3D Công Trình" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">
            
            {/* Drawing Type Selector */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">2. Loại bản vẽ</label>
                <div className="relative">
                  <select
                    value={drawingType}
                    onChange={(e) => setDrawingType(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
                  >
                    {drawingOptions.map((opt, idx) => (
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
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">3. Yêu cầu chi tiết (Tùy chọn)</label>
                <textarea 
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ví dụ: Thêm kích thước, chú thích tiếng Anh, style bản vẽ phác thảo..."
                    className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-24 resize-none text-gray-700 leading-relaxed"
                />
            </div>

            {/* Image Count */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Số lượng phương án</label>
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

            {/* Full Prompt Display (Editable) */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt Đầy Đủ (Có thể chỉnh sửa)</label>
                <textarea 
                    value={fullPrompt}
                    onChange={(e) => setFullPrompt(e.target.value)}
                    className="w-full p-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-xs text-gray-600 outline-none h-40 resize-none font-mono leading-relaxed"
                />
            </div>

            <Button 
                onClick={handleGenerate} 
                isLoading={status === 'generating'} 
                className="w-full mt-4 bg-[#C15F3C] hover:bg-[#A04B2D] py-3 text-lg shadow-lg"
            >
                TẠO BẢN VẼ
            </Button>

            {error && (
                <div className="text-xs text-red-500 mt-2 text-center">{error}</div>
            )}
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 h-full flex flex-col bg-white border-l border-[#B1ADA1]/20">
         
         {/* Comparison Slider Area (Only shows if we have a result and a source) */}
         {latestImages.length > 0 && sourceBase64 && (
             <div className="h-[50%] p-4 bg-[#F9F9F7] flex flex-col border-b border-[#B1ADA1]/20">
                 <div className="flex justify-between items-center mb-2">
                     <h3 className="text-[#C15F3C] text-sm font-bold">Đối chiếu 3D vs 2D</h3>
                 </div>
                 <div className="flex-1 relative border border-[#B1ADA1] rounded-lg overflow-hidden shadow-inner">
                     <ImageComparison 
                        beforeImage={sourceBase64}
                        afterImage={latestImages[0].src}
                        labelBefore="3D Input"
                        labelAfter="2D Output"
                     />
                 </div>
             </div>
         )}

         {/* History / List Area */}
         <div className="flex-1 min-h-0">
            <ResultGallery 
                status={status}
                latestImages={latestImages}
                historyImages={historyImages}
                imageCount={imageCount}
                generationTime={generationTime}
                aspectRatio={getAspectRatio()}
                onUpscale={handleUpscale}
                upscalingStatus={upscalingStatus}
                className="w-full h-full flex flex-col bg-white overflow-hidden"
            />
         </div>
      </div>
    </div>
  );
};

export default TechnicalDrawingView;
