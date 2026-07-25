
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { editImage, fileToBase64, upscaleImage } from './services/gemini';
import { addToHistory } from './services/historyService';
import { LoadingState, GeneratedImage } from '../types';
import { ImageCountSelector, ImageQualitySelector, QualityOption } from './common';
import Button from './Button';
import ImageUploader from './ImageUploader';
import ResultGallery from './ResultGallery';

type ToolType = 'lasso' | 'brush' | 'rect';

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  type: ToolType;
  points: Point[];
  size: number;
}

const ImageEditor: React.FC = () => {
  // --- State ---
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  // Canvas & Drawing
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Tools
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brushSize, setBrushSize] = useState(20);
  
  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generation
  const [prompt, setPrompt] = useState('');
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');
  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Timer & Upscaling
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // --- Initialization ---
  
  // Sync Source File to Image Object
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
      setPaths([]);
      setLatestImages([]);
      setHistoryImages([]);
    }
  }, [sourceFile]);

  // Load original image object when src changes
  useEffect(() => {
    if (originalImageSrc) {
      const img = new Image();
      img.src = originalImageSrc;
      img.onload = () => {
        setOriginalImage(img);
        setPaths([]); // Reset paths on new image
      };
    }
  }, [originalImageSrc]);

  // --- Sync Canvas Size with Image ---
  useEffect(() => {
    if (!imageRef.current || !canvasRef.current || !originalImage) return;

    const syncCanvas = () => {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      
      if (img && canvas) {
        // 1. Set canvas resolution to match original image resolution (high quality)
        canvas.width = originalImage.naturalWidth;
        canvas.height = originalImage.naturalHeight;
        
        // 2. Set canvas display size to match the rendered image size exactly
        canvas.style.width = `${img.width}px`;
        canvas.style.height = `${img.height}px`;
        canvas.style.left = `${img.offsetLeft}px`;
        canvas.style.top = `${img.offsetTop}px`;
        
        // Redraw content
        redrawCanvas();
      }
    };

    // Initial sync
    syncCanvas();

    // Observe resize events on the image element
    const resizeObserver = new ResizeObserver(() => {
        syncCanvas();
    });
    
    resizeObserver.observe(imageRef.current);

    return () => resizeObserver.disconnect();
  }, [originalImage, paths, currentPath, activeTool, brushSize, isFullscreen]); // Depend on drawing state and fullscreen to trigger redraws

  // --- Drawing Logic ---

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const imgElement = imageRef.current;

    if (!canvas || !originalImage || !imgElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawPath = (path: DrawingPath | { type: ToolType, points: Point[], size: number }, isCurrent = false) => {
       if (path.points.length < 1) return;

       ctx.beginPath();
       ctx.lineJoin = 'round';
       ctx.lineCap = 'round';

       if (path.type === 'brush') {
         ctx.strokeStyle = 'rgba(193, 95, 60, 0.7)'; // Brand Color #C15F3C
         ctx.lineWidth = path.size;
         ctx.moveTo(path.points[0].x, path.points[0].y);
         for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
         }
         ctx.stroke();
       } else if (path.type === 'lasso') {
         ctx.fillStyle = 'rgba(193, 95, 60, 0.3)';
         ctx.strokeStyle = 'rgba(193, 95, 60, 0.9)';
         ctx.lineWidth = 4; // Fixed visible line width for lasso
         ctx.moveTo(path.points[0].x, path.points[0].y);
         for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
         }
         if (!isCurrent) {
            ctx.closePath();
            ctx.fill();
         }
         ctx.stroke();
       } else if (path.type === 'rect') {
         const start = path.points[0];
         const end = path.points[path.points.length - 1];
         const width = end.x - start.x;
         const height = end.y - start.y;

         ctx.fillStyle = 'rgba(193, 95, 60, 0.3)';
         ctx.strokeStyle = 'rgba(193, 95, 60, 0.9)';
         ctx.lineWidth = 4;
         
         ctx.fillRect(start.x, start.y, width, height);
         ctx.strokeRect(start.x, start.y, width, height);
       }
    };

    // Draw committed paths
    paths.forEach(p => drawPath(p));

    // Draw current path
    if (currentPath.length > 0) {
      drawPath({ type: activeTool, points: currentPath, size: brushSize }, true);
    }
  };

  const getNativeCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale based on the actual rendered size vs internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!originalImage) return;
    setIsDrawing(true);
    setCurrentPath([getNativeCoords(e)]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setCurrentPath(prev => [...prev, getNativeCoords(e)]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, { type: activeTool, points: currentPath, size: brushSize }]);
    }
    setCurrentPath([]);
  };

  // --- Mask Generation ---
  const generateMaskBase64 = (): string | null => {
    if (paths.length === 0) return null;
    if (!originalImage) return null;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = originalImage.naturalWidth;
    maskCanvas.height = originalImage.naturalHeight;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return null;

    // Fill black (background - keep)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw paths in white (foreground - edit)
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    paths.forEach(path => {
       ctx.beginPath();
       if (path.type === 'brush') {
         ctx.strokeStyle = 'white';
         ctx.lineWidth = path.size;
         ctx.moveTo(path.points[0].x, path.points[0].y);
         for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
         }
         ctx.stroke();
       } else if (path.type === 'lasso') {
         ctx.fillStyle = 'white';
         ctx.moveTo(path.points[0].x, path.points[0].y);
         for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
         }
         ctx.closePath();
         ctx.fill();
       } else if (path.type === 'rect') {
         const start = path.points[0];
         const end = path.points[path.points.length - 1];
         const width = end.x - start.x;
         const height = end.y - start.y;
         
         ctx.fillStyle = 'white';
         ctx.fillRect(start.x, start.y, width, height);
       }
    });

    return maskCanvas.toDataURL('image/png').split(',')[1];
  };

  // --- Actions ---

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
    if (!prompt.trim()) {
        setError("Vui lòng nhập prompt.");
        return;
    }

    // Move current latest to history
    if (latestImages.length > 0) {
      setHistoryImages(prev => [...latestImages, ...prev]);
      setLatestImages([]);
    }
    
    setStatus('generating');
    setError(null);
    startTimer();
    
    try {
        const base64Original = originalImageSrc.split(',')[1];
        const base64Ref = referenceFile ? await fileToBase64(referenceFile) : null;
        const base64Mask = generateMaskBase64();

        let finalPrompt = '';

        if (base64Ref) {
            // Template for 3 images (Original + Mask + Reference)
            finalPrompt = `You receive THREE images in this order:
1. Original image.
2. Mask image (white = editable, black = no-change).
3. Style reference image.

**TASK RULES**
1. The BLACK area is a STRICT NO-CHANGE ZONE. These pixels must remain 100% IDENTICAL to the original image.
2. Only modify the WHITE area of the mask.
3. Apply the user request inside the white region: "${prompt}".
4. While editing, MATCH the style reference’s lighting, texture, materials, and color palette.  
   Do NOT copy shapes or objects — only adopt the aesthetic style.
5. Output one image:  
   – White area = modified exactly per request + in the reference style  
   – Black area = untouched clone of the original  
   – Seamless transitions between edited and original regions.`;
        } else {
            // Template for 2 images (Original + Mask)
            finalPrompt = `You receive TWO images:  
1. Original image  
2. Mask image (white = editable, black = no-change)

**TASK RULES**
1. Only modify pixels inside the WHITE mask area.
2. The BLACK area is a STRICT NO-CHANGE ZONE — these pixels must remain PERFECTLY identical to the original image.
3. Apply the user request inside the white region: "${prompt}".
4. Do not change the size of the original image
5. Output a single image where:  
   – White area = edited per request  
   – Black area = fully preserved from the original  
   – The boundary between edited and unedited areas is smooth and natural.`;
        }

        const results = await editImage(
            base64Original,
            finalPrompt,
            base64Ref,
            base64Mask,
            imageCount
        );
        
        const newImages: GeneratedImage[] = results.map(url => ({
            src: url,
            prompt: prompt, // Keep user's short prompt for display
            timestamp: new Date(),
        }));

        // Add to global history
        newImages.forEach(img => {
            addToHistory({
                src: img.src,
                prompt: img.prompt,
                type: 'Chỉnh sửa',
            });
        });

        setLatestImages(newImages);
        setStatus('success');
    } catch (e) {
        console.error(e);
        setError("Có lỗi xảy ra khi tạo ảnh.");
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

  const clearSelection = () => {
    setPaths([]);
  };

  const getAspectRatio = () => {
      if (originalImage) {
          return `${originalImage.naturalWidth}:${originalImage.naturalHeight}`;
      }
      return '16:9';
  }

  // Render Function for Workspace to reuse in Portal
  const renderWorkspace = (isModeFullscreen: boolean) => (
     <div className={`${
         isModeFullscreen 
            ? 'fixed inset-4 z-[70] flex flex-col bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[#444] overflow-hidden' 
            : 'relative w-full h-full flex flex-col bg-[#1e1e1e] rounded-xl border border-[#B1ADA1] overflow-hidden shadow-sm'
     }`}>
         
         {/* Header */}
         <div className="h-10 border-b border-[#333] flex items-center px-3 justify-between bg-[#252525] shrink-0">
            <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-gray-400 uppercase">Vùng làm việc</span>
                 {sourceFile && <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-[#333] rounded">{originalImage?.naturalWidth} x {originalImage?.naturalHeight}</span>}
            </div>
            <div className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-500 hidden sm:inline">Cuộn để zoom</span>
                 <button 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded-md bg-[#333] hover:bg-[#444] text-gray-300 transition-colors"
                    title={isModeFullscreen ? "Thu nhỏ" : "Mở rộng"}
                 >
                    {isModeFullscreen ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    )}
                 </button>
            </div>
         </div>

         {/* Canvas Container */}
         <div 
            ref={containerRef}
            className="relative flex-1 bg-[#1e1e1e] overflow-auto flex items-center justify-center select-none"
            style={{ 
                backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', 
                backgroundSize: '20px 20px' 
            }}
         >
             {!originalImageSrc ? (
                 <div className="text-center text-gray-500 px-4">
                     <div className="text-3xl mb-2 opacity-20">🎨</div>
                     <p className="text-xs">Chưa có ảnh</p>
                 </div>
             ) : (
                 <div className="relative p-4 min-w-full min-h-full flex items-center justify-center">
                     <div className="relative shadow-2xl" style={{ width: 'fit-content', height: 'fit-content' }}>
                         <img 
                            ref={imageRef}
                            src={originalImageSrc} 
                            alt="Workspace" 
                            className="block max-w-full max-h-full object-contain pointer-events-none border border-[#444]"
                         />
                         <canvas 
                            ref={canvasRef}
                            className="absolute top-0 left-0 cursor-crosshair touch-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{ pointerEvents: 'auto' }}
                         />
                     </div>
                 </div>
             )}
         </div>
     </div>
  );

  return (
    <div className="flex flex-row gap-6 h-full overflow-hidden relative">
      {/* --- Left Panel: Inputs & Workspace --- */}
      <div className="w-[400px] xl:w-[500px] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin flex flex-col h-full bg-[#F9F9F7] p-4">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-4">Sửa Vùng Chọn</h2>
        
        {/* 1. Source Image */}
        <div className="mb-4">
           <ImageUploader 
             title="Tải ảnh gốc" 
             onFileSelect={setSourceFile} 
             selectedFile={sourceFile} 
             required 
           />
        </div>

        {/* 2. Workspace Area */}
        <div className={`mb-4 transition-all duration-300 relative z-20 ${isFullscreen ? '' : 'h-[400px] w-full'}`}>
             {/* The Workspace Itself - Inline if not fullscreen */}
             {!isFullscreen && renderWorkspace(false)}
             
             {/* Placeholder when fullscreen to prevent layout shift */}
             {isFullscreen && (
                 <div className="h-[400px] w-full bg-[#1e1e1e]/10 rounded-xl border border-dashed border-[#B1ADA1] flex items-center justify-center text-xs text-gray-500">
                    <p>Đang mở chế độ toàn màn hình...</p>
                 </div>
             )}
        </div>

        {/* 3. Tools */}
        <div className="mb-4 p-3 bg-white border border-[#B1ADA1] rounded-xl shadow-sm">
            <label className="block text-[10px] font-bold text-[#B1ADA1] uppercase mb-2">Công cụ vẽ</label>
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => setActiveTool('lasso')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${
                        activeTool === 'lasso' 
                        ? 'bg-[#C15F3C]/10 border-[#C15F3C] text-[#C15F3C]' 
                        : 'bg-white border-[#EAE8E0] text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 14.5L3 21" /><path d="M15 9l6-6" /><path d="M20.5 14a2.5 2.5 0 0 1-3.9 2" /><path d="M3.5 10a2.5 2.5 0 1 1 4-2" /></svg>
                    Lasso
                </button>
                <button
                    onClick={() => setActiveTool('rect')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${
                        activeTool === 'rect' 
                        ? 'bg-[#C15F3C]/10 border-[#C15F3C] text-[#C15F3C]' 
                        : 'bg-white border-[#EAE8E0] text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
                    Hình chữ nhật
                </button>
                <button
                    onClick={() => setActiveTool('brush')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center justify-center gap-1 ${
                        activeTool === 'brush' 
                        ? 'bg-[#C15F3C]/10 border-[#C15F3C] text-[#C15F3C]' 
                        : 'bg-white border-[#EAE8E0] text-gray-600 hover:bg-gray-50'
                    }`}
                >
                     <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3l6 6" /><path d="M10 14L21 3" /></svg>
                    Brush
                </button>
            </div>

            {activeTool === 'brush' && (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Size: {brushSize}px</span>
                    </div>
                    <input 
                        type="range" 
                        min="5" 
                        max="200" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C15F3C]"
                    />
                </div>
            )}

            <button 
                onClick={clearSelection}
                className="w-full py-1.5 text-xs text-red-500 border border-dashed border-red-200 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Xóa vùng chọn
            </button>
        </div>

        {/* 4. Reference */}
        <div className="mb-4">
             <ImageUploader 
               title="Ảnh tham chiếu (Tùy chọn)" 
               onFileSelect={setReferenceFile} 
               selectedFile={referenceFile} 
             />
        </div>

        {/* 5. Prompt */}
        <div className="mb-4">
             <label className="block text-xs font-bold text-gray-700 mb-2">Prompt</label>
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Mô tả thay đổi trong vùng chọn..."
                className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-20 resize-none text-gray-700 shadow-sm"
             />
        </div>

        {/* 6. Count */}
        <div className="mb-6 space-y-4">
            <ImageCountSelector 
              value={imageCount} 
              onChange={setImageCount} 
            />
            
            <ImageQualitySelector 
              value={imageQuality} 
              onChange={setImageQuality} 
            />
        </div>

        <Button 
            onClick={handleGenerate}
            isLoading={status === 'generating'}
            className="w-full py-3 text-base font-bold shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all"
        >
            TẠO ẢNH
        </Button>
        
        {error && <p className="text-red-500 text-xs text-center mt-3 bg-red-50 p-2 rounded border border-red-100">{error}</p>}
      </div>

      {/* --- Portal for Fullscreen Mode --- */}
      {isFullscreen && createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsFullscreen(false)}
            />
            {/* Workspace Content */}
            {renderWorkspace(true)}
        </div>,
        document.body
      )}

      {/* --- Right Panel: Results Only --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-l border-[#B1ADA1]/20 bg-white">
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
            resultGridClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            historyGridClass="grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
         />
      </div>
    </div>
  );
};

export default ImageEditor;
