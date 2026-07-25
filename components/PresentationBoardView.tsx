
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { generatePresentationBoard, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';

const PresentationBoardView: React.FC = () => {
  // State for Uploads
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  // State for Form
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
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
      const sourceBase64 = await fileToBase64(sourceFile);

      const results = await generatePresentationBoard(
        sourceBase64,
        projectName,
        description,
        imageCount
      );

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `Presentation Board for ${projectName || 'Project'}`,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Có lỗi xảy ra khi tạo bảng trình bày. Vui lòng thử lại.');
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
        <h2 className="text-xl font-bold text-[#C15F3C] mb-2">Bảng Trình Bày Kiến Trúc</h2>
        <p className="text-xs text-gray-500 mb-6">Tạo bảng thuyết minh phương án tự động với đầy đủ các thành phần: Phối cảnh, Mặt bằng, Mặt cắt, Sơ đồ khối.</p>

        {/* 1. Source Image */}
        <div className="mb-6">
          <ImageUploader 
            title="1. Tải ảnh phối cảnh chính" 
            required={true} 
            selectedFile={sourceFile} 
            onFileSelect={setSourceFile} 
          />
        </div>

        {/* 2. Project Info */}
        <div className="mb-6 space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">2. Tên dự án</label>
                <input 
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ví dụ: GREEN TERRACE VILLA"
                    className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">3. Mô tả dự án (Tùy chọn)</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ý tưởng, phong cách thiết kế..."
                    className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-28 resize-none text-gray-700 leading-relaxed"
                />
            </div>
        </div>

        {/* 3. Image Count */}
        <div className="mb-6">
             <label className="block text-xs font-bold text-gray-700 mb-2">4. Số lượng phương án</label>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Tạo Bảng Trình Bày
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
           aspectRatio="16:9" // Presentation boards are usually wide
           onUpscale={handleUpscale}
           upscalingStatus={upscalingStatus}
         />
      </div>
    </div>
  );
};

export default PresentationBoardView;
