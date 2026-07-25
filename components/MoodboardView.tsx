
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { generateMoodboard, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';

const MoodboardView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);

  // State for Form
  const [prompt, setPrompt] = useState('');
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

  const samplePromptText = "Tạo moodboard nội thất dạng dọc trên nền trắng tinh. Ở trung tâm là một ảnh tổng thể của căn phòng thể hiện phong cách thiết kế. Bên dưới đặt các đồ rời tách riêng trên nền trắng: giường, tab đầu giường, tủ quần áo, đèn, thảm, rèm. Bên phải thêm bảng màu và các mẫu vật liệu (gỗ, vải, kim loại). Tất cả nằm gọn trong một khung dọc duy nhất, bố cục sạch sẽ, khoảng cách đều, phong cách trình bày chuyên nghiệp của designer, chất lượng cao.";

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

  const handleUseSamplePrompt = () => {
      setPrompt(samplePromptText);
  };

  const handleGenerate = async () => {
    if (!sourceFile) {
      setError("Vui lòng tải ảnh nguồn cảm hứng.");
      return;
    }
    if (!prompt.trim()) {
      setError("Vui lòng nhập mô tả hoặc sử dụng prompt mẫu.");
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
      const styleBase64 = styleFile ? await fileToBase64(styleFile) : null;

      const results = await generateMoodboard(
        sourceBase64,
        styleBase64,
        prompt,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: prompt,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Có lỗi xảy ra khi tạo moodboard. Vui lòng thử lại.');
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
        <h2 className="text-xl font-bold text-[#C15F3C] mb-2">Tạo Moodboard</h2>
        <p className="text-xs text-gray-500 mb-6">Tải lên hình ảnh và nhập mô tả để AI tạo ra một bảng cảm hứng (moodboard) hoàn chỉnh với bảng màu, vật liệu và hình ảnh liên quan.</p>

        {/* 1. Source Image */}
        <div className="mb-6">
          <ImageUploader 
            title="1. Tải ảnh nguồn cảm hứng" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        {/* 2. Style Reference */}
        <div className="mb-6">
          <ImageUploader 
            title="2. Tải ảnh tham chiếu (Style)" 
            required={false} 
            selectedFile={styleFile} 
            onFileSelect={setStyleFile} 
          />
          <p className="text-[10px] text-gray-500 mt-1">AI sẽ lấy cảm hứng về màu sắc và phong cách từ ảnh này.</p>
        </div>

        {/* 3. Prompt */}
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 mb-2">3. Mô tả chủ đề hoặc phong cách</label>
            <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Mô tả chi tiết moodboard bạn muốn..."
                className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-28 resize-none text-gray-700 leading-relaxed mb-2"
            />
            <button 
                onClick={handleUseSamplePrompt}
                className="text-xs flex items-center gap-1 text-[#C15F3C] hover:underline font-medium"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Sử dụng prompt mẫu
            </button>
        </div>

        {/* 4. Image Count */}
        <div className="mb-6">
             <label className="block text-xs font-bold text-gray-700 mb-2">4. Số lượng kết quả</label>
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

        <Button 
            onClick={handleGenerate} 
            isLoading={status === 'generating'} 
            className="w-full mt-4 bg-[#C15F3C] hover:bg-[#A04B2D] py-3 text-lg shadow-lg"
        >
            <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Tạo Moodboard
            </span>
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
           aspectRatio="3:4" // Vertical frame typically used for moodboards
           onUpscale={handleUpscale}
           upscalingStatus={upscalingStatus}
         />
      </div>
    </div>
  );
};

export default MoodboardView;
