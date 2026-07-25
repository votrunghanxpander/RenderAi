
import React from 'react';
import { useTimer, formatTimestamp } from '../utils';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { GeneratedImage, LoadingState } from '../types';

interface ResultGalleryProps {
  status: LoadingState;
  latestImages: GeneratedImage[];
  historyImages: GeneratedImage[];
  imageCount: number;
  generationTime: number; // Time in seconds
  aspectRatio: string;
  onUpscale: (src: string, resolution: '2K' | '4K') => void;
  upscalingStatus: { [src: string]: string };
  className?: string;
  resultGridClass?: string;
  historyGridClass?: string;
}

interface ImageCardProps {
    image: GeneratedImage;
    index: number;
    onImageDownload: (e: React.MouseEvent, src: string, index: number) => void;
    onImageUpscale: (src: string, resolution: '2K' | '4K') => void;
    upscalingStatus: { [src: string]: string };
    isHistory?: boolean;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, index, onImageDownload, onImageUpscale, upscalingStatus, isHistory = false }) => {
    const statusMessage = upscalingStatus[image.src];
    const isUpscaling = !!statusMessage;
    const upscaleTime = useTimer(isUpscaling);

    return (
        <div
            className="group relative bg-white border rounded-lg overflow-hidden shadow-sm"
            style={{ borderColor: '#e8e6dc' }}
        >
            <PhotoView src={image.src}>
                <img
                    src={image.src}
                    alt={`Generated image ${index + 1}`}
                    className={`w-full object-cover cursor-pointer ${isHistory ? 'h-48' : 'h-auto'}`}
                />
            </PhotoView>

            {image.resolution && (
                <div className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg select-none z-10" style={{ backgroundColor: '#C15F3C' }}>
                    {image.resolution}
                </div>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onImageDownload(e, image.src, index); }}
                className="absolute top-2 right-2 text-gray-800 p-2 rounded-full transition-all duration-200 hover:text-white focus:outline-none focus:ring-2 backdrop-blur-sm opacity-0 group-hover:opacity-100 z-10"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                aria-label="Download image"
                title="Download image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[#C15F3C]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-white text-[10px] font-medium">{formatTimestamp(image.timestamp)}</p>

                <div>
                    {isUpscaling ? (
                        <div className="flex items-center justify-center text-white text-xs bg-black/50 p-1.5 rounded-md">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {statusMessage} ({upscaleTime}s)
                        </div>
                    ) : (
                        <>
                            {image.resolution !== '4K' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onImageUpscale(image.src, '2K'); }}
                                        disabled={image.resolution === '2K'}
                                        className="text-white text-[10px] font-semibold px-2 py-1 rounded-md transition-colors hover:opacity-90"
                                        style={{
                                            backgroundColor: image.resolution === '2K' ? '#B1ADA1' : '#8A877D',
                                            cursor: image.resolution === '2K' ? 'not-allowed' : 'pointer'
                                        }}
                                        title="Nâng cấp lên 2K"
                                    >
                                        Up 2K
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onImageUpscale(image.src, '4K'); }}
                                        className="text-white text-[10px] font-semibold px-2 py-1 rounded-md transition-colors hover:opacity-90"
                                        style={{
                                            backgroundColor: '#C15F3C',
                                            cursor: 'pointer'
                                        }}
                                        title="Nâng cấp lên 4K"
                                    >
                                        Up 4K
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResultGallery: React.FC<ResultGalleryProps> = ({ 
  status, 
  latestImages, 
  historyImages,
  imageCount,
  generationTime,
  aspectRatio,
  onUpscale,
  upscalingStatus,
  className,
  resultGridClass = "grid-cols-1 gap-6",
  historyGridClass = "grid-cols-2 gap-4"
}) => {
  
  const handleDownload = (e: React.MouseEvent, src: string, index: number) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = `render-result-${index + 1}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerClass = className || "w-full h-full flex flex-col bg-white border-l border-[#B1ADA1] overflow-hidden";

  return (
    <div className={containerClass}>
      <div className="p-6 overflow-y-auto flex-1">
        
        <h2 className="text-lg font-bold text-[#C15F3C] mb-4 flex items-center gap-2">
           <span>✨</span> Kết quả mới nhất
        </h2>

        {status === 'idle' && latestImages.length === 0 && historyImages.length === 0 ? (
            <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-[#EAE8E0]">
                <div className="text-center text-[#B1ADA1]">
                    <div className="text-4xl mb-3">🎨</div>
                    <p className="text-sm">Kết quả tạo ảnh sẽ hiển thị ở đây.</p>
                </div>
            </div>
        ) : (
            <PhotoProvider>
                <div className={`grid ${resultGridClass} mb-8`}>
                    {status === 'generating' && (
                        [...Array(imageCount)].map((_, index) => (
                            <div key={`loader-${index}`} className="rounded-xl bg-[#F9F9F7] flex flex-col items-center justify-center p-8 animate-pulse border border-[#EAE8E0]" style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}>
                                <div className="text-center font-medium text-[#C15F3C]">
                                    <svg className="animate-spin h-8 w-8 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-sm">Đang tạo... ({generationTime}s)</p>
                                </div>
                            </div>
                        ))
                    )}
                    
                    {latestImages.map((image, index) => (
                        <ImageCard 
                            key={`result-${image.src}-${index}`}
                            image={image}
                            index={index}
                            onImageDownload={handleDownload}
                            onImageUpscale={onUpscale}
                            upscalingStatus={upscalingStatus}
                        />
                    ))}
                </div>
            </PhotoProvider>
        )}

        {historyImages.length > 0 && (
            <div className="pt-6 border-t border-[#EAE8E0]">
                <h2 className="text-sm font-bold text-[#B1ADA1] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>📜</span> Lịch sử
                </h2>
                <PhotoProvider>
                    <div className={`grid ${historyGridClass}`}>
                    {historyImages.map((image, index) => (
                       <ImageCard 
                            key={`history-${image.src}-${index}`}
                            image={image}
                            index={index}
                            onImageDownload={handleDownload}
                            onImageUpscale={onUpscale}
                            upscalingStatus={upscalingStatus}
                            isHistory={true}
                        />
                    ))}
                    </div>
                </PhotoProvider>
            </div>
        )}
      </div>
    </div>
  );
};

export default ResultGallery;
