
import React, { useState, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import Button from './Button';
import { generateVideo, fileToBase64 } from './services/gemini';
import { LoadingState, AIStudioWindow } from '../types';
import { AspectRatioSelector, ImageQualitySelector, QualityOption } from './common';
import ImageUploader from './ImageUploader';

// Helper function to crop image
const getCroppedImg = (imageSrc: string, pixelCrop: any): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;
  return new Promise((resolve, reject) => {
    image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        resolve(canvas.toDataURL('image/jpeg'));
    };
    image.onerror = reject;
  });
};

const VideoGenerator: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  
  const [selectedAngle, setSelectedAngle] = useState('');

  // Cropper State
  const [isCropping, setIsCropping] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const cameraAngles = [
    { label: 'Panorama xoay 360 độ (Orbit)', value: 'Cinematic camera orbiting 360 degrees around the structure, showing all sides, smooth motion.' },
    { label: 'Pan sang trái (Pan Left)', value: 'Slow cinematic pan to the left, revealing more of the environment.' },
    { label: 'Pan sang phải (Pan Right)', value: 'Slow cinematic pan to the right, revealing more of the environment.' },
    { label: 'Chuyển cảnh Dolly In (Tiến lại gần)', value: 'Camera slowly moves forward (Dolly In) towards the subject, creating a sense of depth.' },
    { label: 'Chuyển cảnh Dolly Out (Lùi ra xa)', value: 'Camera slowly moves backward (Dolly Out) away from the subject, revealing the surroundings.' },
    { label: 'Tilt dọc từ trên xuống (Crane Down)', value: 'Camera tilts down from the sky to the building level, establishing shot.' },
    { label: 'Tilt từ dưới lên toàn cảnh (Crane Up)', value: 'Camera tilts up from the ground to reveal the full height of the building.' },
    { label: 'Fly-through đi xuyên không gian', value: 'FPV drone fly-through shot, moving through the architectural space dynamically.' },
    { label: 'Track theo đối tượng di chuyển', value: 'Tracking shot moving parallel to the building facade, steady and smooth.' },
    { label: 'Chuyển cảnh Timelapse ngày sang đêm', value: 'Timelapse transition from day to night, lighting changes, shadows move quickly.' },
    { label: 'Fade chuyển cảnh từ ngoài vào trong', value: 'Cinematic transition starting from exterior and fading into the interior view.' },
    { label: 'Camera rút lùi để lộ toàn cảnh (Reveal)', value: 'Pull-back shot starting close to a detail and moving back to reveal the whole scene.' }
  ];

  useEffect(() => {
    const checkKey = async () => {
      const win = window as AIStudioWindow;
      if (win.aistudio?.hasSelectedApiKey) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const win = window as AIStudioWindow;
    if (win.aistudio?.openSelectKey) {
      await win.aistudio.openSelectKey();
      if (win.aistudio?.hasSelectedApiKey) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    }
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
        setSourceFile(null);
        setSourceImage(null);
        return;
    }

    try {
        const base64 = await fileToBase64(file);
        const url = `data:image/jpeg;base64,${base64}`;

        const img = new Image();
        img.src = url;
        img.onload = () => {
            const ratio = img.width / img.height;
            const target = 16 / 9;
            // Allow small tolerance, otherwise enforce crop
            if (Math.abs(ratio - target) > 0.05) {
                setTempImage(url);
                setIsCropping(true);
                // We don't set sourceFile/sourceImage yet, wait for crop
                setCrop({ x: 0, y: 0 });
                setZoom(1);
            } else {
                setSourceFile(file);
                setSourceImage(url);
                setVideoUrl(null);
            }
        };
    } catch (err) {
        setError("Failed to load image");
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropConfirm = async () => {
    if (tempImage && croppedAreaPixels) {
        try {
            const croppedBase64 = await getCroppedImg(tempImage, croppedAreaPixels);
            setSourceImage(croppedBase64);
            setVideoUrl(null);
            setIsCropping(false);
            setTempImage(null);
            
            // NOTE: sourceFile is still null or old file here, but generateVideo uses sourceImage string.
            // If we need a File object, we'd convert base64 to File, but our service uses base64 string anyway.
        } catch (e) {
            console.error(e);
            setError("Lỗi khi cắt ảnh");
        }
    }
  };

  const handleCropCancel = () => {
      setIsCropping(false);
      setTempImage(null);
      // Clear selection if cancelled
      if (!sourceImage) {
        setSourceFile(null);
      }
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedAngle(val);
    if (val) {
        setPrompt(val);
    }
  };

  const handleGenerate = async () => {
    if (!sourceImage) return;

    // Verify key before starting
    const win = window as AIStudioWindow;
    if (win.aistudio?.hasSelectedApiKey) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await handleSelectKey();
        const recheck = await win.aistudio.hasSelectedApiKey();
        if (!recheck) return; 
      }
    }

    setStatus('generating');
    setError(null);
    setVideoUrl(null);

    try {
      const base64Data = sourceImage.split(',')[1];
      // We only support 16:9 in UI for now as we force cropped to it for better Veo results usually, 
      // but we can still pass the aspectRatio param if we want to support 9:16 later.
      // Since we force crop to 16:9, we pass '16:9'
      const resultUrl = await generateVideo(base64Data, prompt, '16:9');
      setVideoUrl(resultUrl);
      setStatus('success');
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('Requested entity was not found') || msg.includes('404')) {
         setError('API Key issue detected. Please select your API key again.');
         setHasApiKey(false);
      } else {
        setError('Video generation failed. This can take a few minutes, please try again.');
      }
      setStatus('error');
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col md:flex-row gap-6 relative">
        {/* Cropping Modal */}
        {isCropping && (
            <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[80vh] relative bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#252525]">
                        <h3 className="text-white font-bold">Cắt ảnh theo tỷ lệ 16:9</h3>
                        <button onClick={handleCropCancel} className="text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="relative flex-1 bg-black">
                        <Cropper
                            image={tempImage || ''}
                            crop={crop}
                            zoom={zoom}
                            aspect={16 / 9}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>

                    <div className="p-4 bg-[#252525] border-t border-gray-700 flex items-center gap-4">
                        <div className="flex-1">
                            <span className="text-xs text-gray-400 uppercase font-bold mb-1 block">Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#C15F3C]"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={handleCropCancel} variant="secondary" className="px-6">Hủy</Button>
                            <Button onClick={handleCropConfirm} className="px-8">Xác nhận</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Left Panel: Inputs */}
        <div className="w-full md:w-[400px] shrink-0 flex flex-col overflow-y-auto pb-12 pr-2 scrollbar-thin border-r border-[#B1ADA1]/20">
            <div className="mb-6">
                 <h2 className="text-xl font-bold text-[#C15F3C] mb-2">Tạo Video từ Hình Ảnh</h2>
                 <p className="text-sm text-[#B1ADA1]">Biến ảnh tĩnh thành video điện ảnh với Veo 3.1.</p>
            </div>
            
            {!hasApiKey && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                     <p className="text-xs text-yellow-700 mb-2">Yêu cầu chọn API Key cá nhân để sử dụng tính năng Video.</p>
                     <Button onClick={handleSelectKey} variant="outline" className="text-xs w-full">
                        Chọn API Key
                     </Button>
                </div>
            )}

            <div className="space-y-6">
                {/* 1. Image Upload */}
                <div>
                    <ImageUploader 
                        title="1. Tải Lên Ảnh Gốc (Yêu cầu 16:9)" 
                        selectedFile={sourceFile} 
                        onFileSelect={handleFileSelect} 
                    />
                    {sourceImage && !isCropping && (
                        <div className="mt-2 relative group">
                            <img src={sourceImage} alt="Preview" className="w-full h-auto rounded-lg border border-[#B1ADA1]" />
                            <button 
                                onClick={() => { setTempImage(sourceImage); setIsCropping(true); }}
                                className="absolute top-2 right-2 bg-white text-[#C15F3C] p-1.5 rounded shadow-md text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                Cắt lại
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Prompt */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">2. Mô Tả Video</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Mô tả chuyển động camera, ánh sáng, không khí..."
                        className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-28 resize-none text-gray-700 leading-relaxed"
                    />
                </div>

                {/* 3. Camera Angles */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Chọn một góc quay có sẵn...</label>
                    <div className="relative">
                        <select
                            value={selectedAngle}
                            onChange={handleAngleChange}
                            className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-[#C15F3C] focus:border-[#C15F3C] outline-none appearance-none"
                        >
                            <option value="">-- Chọn góc quay --</option>
                            {cameraAngles.map((angle, idx) => (
                                <option key={idx} value={angle.value}>{angle.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                {/* Aspect Ratio (Locked for now due to crop requirement) */}
                <div className="opacity-50 pointer-events-none">
                    <AspectRatioSelector 
                      value={aspectRatio} 
                      onChange={(val) => setAspectRatio(val as '16:9' | '9:16')}
                      ratios={['16:9', '9:16']}
                      label="Tỷ lệ khung hình (Đã khóa 16:9)"
                    />
                </div>

                {/* Image Quality */}
                <div className="mb-4">
                    <ImageQualitySelector 
                      value={imageQuality} 
                      onChange={setImageQuality} 
                    />
                </div>

                <Button 
                  onClick={handleGenerate} 
                  isLoading={status === 'generating'}
                  className="w-full py-3 shadow-lg"
                  disabled={!sourceImage}
                >
                  TẠO VIDEO
                </Button>

                {!hasApiKey && (
                    <p className="text-[10px] text-red-500 text-center">
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline">Xem hướng dẫn billing</a>
                    </p>
                )}
            </div>
        </div>

        {/* Right Panel: Result */}
        <div className="flex-1 bg-white border-l border-[#B1ADA1]/20 p-6 flex flex-col">
             <h3 className="font-bold text-gray-900 mb-4">Kết Quả Video</h3>
             
             <div className="flex-1 bg-[#1a1a1a] rounded-2xl flex items-center justify-center overflow-hidden shadow-xl relative border border-[#B1ADA1]/30">
                 {status === 'generating' && (
                   <div className="text-center text-white p-8">
                     <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#C15F3C] mx-auto mb-6"></div>
                     <h3 className="text-xl font-light mb-2">Đang tạo Video...</h3>
                     <p className="text-gray-400 text-sm max-w-md">
                       Veo đang xử lý cảnh quay. Quá trình này thường mất 1-2 phút.
                       <br/>Vui lòng không tắt tab này.
                     </p>
                   </div>
                 )}

                 {status === 'idle' && !videoUrl && (
                   <div className="text-center text-gray-600">
                     <div className="text-6xl mb-4 opacity-20">🎬</div>
                     <p className="text-gray-500">Video được tạo sẽ xuất hiện ở đây.</p>
                   </div>
                 )}

                 {status === 'error' && (
                   <div className="text-center p-8 max-w-md">
                     <div className="text-4xl mb-4">⚠️</div>
                     <p className="text-white font-medium mb-2">Tạo thất bại</p>
                     <p className="text-red-400 text-sm">{error}</p>
                   </div>
                 )}

                 {videoUrl && status === 'success' && (
                   <video 
                     src={videoUrl} 
                     controls 
                     autoPlay 
                     loop
                     className="w-full h-full object-contain"
                   />
                 )}
             </div>

             {videoUrl && (
                 <div className="mt-4 flex justify-end">
                   <a 
                     href={videoUrl} 
                     download 
                     target="_blank"
                     rel="noreferrer"
                     className="bg-[#C15F3C] text-white px-4 py-2 rounded-lg hover:bg-[#a04b2d] font-medium text-sm flex items-center shadow-md transition-colors"
                   >
                     <span>Tải Video Xuống</span>
                     <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   </a>
                 </div>
             )}
        </div>
    </div>
  );
};

export default VideoGenerator;
