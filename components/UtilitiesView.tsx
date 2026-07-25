
import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import { upscaleImage, generatePromptSuggestions, fileToBase64 } from './services/gemini';
import { PhotoProvider, PhotoView } from 'react-photo-view';

// --- Upscale View ---
export const UpscaleView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetRes, setTargetRes] = useState<'2k' | '4k'>('4k');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpscale = async () => {
    if (!file) return;
    setIsLoading(true);
    setResultImage(null);
    setStatusMsg('Đang tải ảnh lên...');

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type;
      
      setStatusMsg(`Đang nâng cấp lên ${targetRes.toUpperCase()} (Quá trình này có thể mất vài giây)...`);
      
      const result = await upscaleImage(
        { base64, mimeType },
        targetRes,
        (attempt) => setStatusMsg(`Đang thử lại (${attempt}/3)...`)
      );

      if (result) {
        setResultImage(result);
        setStatusMsg('');
      } else {
        setStatusMsg('Không thể nâng cấp ảnh. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error(error);
      setStatusMsg('Có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
      {/* Left: Controls */}
      <div className="w-full md:w-[400px] shrink-0 flex flex-col overflow-y-auto pb-12">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-4">Nâng Cấp Ảnh (Upscale)</h2>
        <p className="text-sm text-gray-500 mb-6">Tăng độ phân giải và làm sắc nét hình ảnh kiến trúc của bạn lên 2K hoặc 4K.</p>
        
        <div className="space-y-6">
           <ImageUploader 
             title="Ảnh gốc" 
             selectedFile={file} 
             onFileSelect={setFile} 
             required 
           />

           <div className="space-y-2">
             <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Độ phân giải mục tiêu</label>
             <div className="flex gap-3">
                <button 
                  onClick={() => setTargetRes('2k')}
                  className={`flex-1 py-3 rounded-lg border font-medium transition-all ${targetRes === '2k' ? 'bg-[#C15F3C] text-white border-[#C15F3C]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  2K Resolution
                </button>
                <button 
                  onClick={() => setTargetRes('4k')}
                  className={`flex-1 py-3 rounded-lg border font-medium transition-all ${targetRes === '4k' ? 'bg-[#C15F3C] text-white border-[#C15F3C]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  4K Resolution
                </button>
             </div>
           </div>

           <Button 
             onClick={handleUpscale} 
             isLoading={isLoading}
             disabled={!file}
             className="w-full py-3 text-lg shadow-lg"
           >
             NÂNG CẤP NGAY
           </Button>

           {statusMsg && (
             <div className={`text-center text-sm ${isLoading ? 'text-[#C15F3C] animate-pulse' : 'text-red-500'}`}>
               {statusMsg}
             </div>
           )}
        </div>
      </div>

      {/* Right: Result */}
      <div className="flex-1 bg-white border-l border-[#B1ADA1]/20 p-6 flex flex-col">
         <h3 className="font-bold text-gray-900 mb-4">Kết quả</h3>
         <div className="flex-1 bg-[#F4F3EE] rounded-xl overflow-hidden flex items-center justify-center border border-[#B1ADA1]/30 relative">
            {!resultImage ? (
               <div className="text-center text-[#B1ADA1]">
                 <div className="text-4xl mb-3">🔍</div>
                 <p className="text-sm">Ảnh sau khi nâng cấp sẽ hiển thị tại đây</p>
               </div>
            ) : (
               <PhotoProvider>
                 <div className="relative max-w-full max-h-full group">
                    <PhotoView src={resultImage}>
                      <img src={resultImage} alt="Upscaled" className="max-w-full max-h-[calc(100vh-250px)] object-contain shadow-lg cursor-pointer" />
                    </PhotoView>
                    <a 
                      href={resultImage} 
                      download={`upscaled-${targetRes}-${Date.now()}.png`}
                      className="absolute bottom-4 right-4 bg-white text-[#C15F3C] px-4 py-2 rounded-lg shadow-lg font-bold text-sm hover:bg-[#C15F3C] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Tải xuống ({targetRes})
                    </a>
                 </div>
               </PhotoProvider>
            )}
         </div>
      </div>
    </div>
  );
};

// --- Analysis View ---
export const AnalysisView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true);
    setAnalysisResults([]);

    try {
      const base64 = await fileToBase64(file);
      const results = await generatePromptSuggestions(base64);
      setAnalysisResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
      <div className="w-full md:w-[400px] shrink-0 flex flex-col overflow-y-auto pb-12">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-4">Phân Tích & Gợi Ý Prompt</h2>
        <p className="text-sm text-gray-500 mb-6">AI sẽ phân tích ảnh của bạn và đưa ra các gợi ý prompt chi tiết để tái tạo hoặc phát triển ý tưởng.</p>
        
        <div className="space-y-6">
           <ImageUploader 
             title="Tải ảnh cần phân tích" 
             selectedFile={file} 
             onFileSelect={setFile} 
             required 
           />

           <Button 
             onClick={handleAnalyze} 
             isLoading={isLoading}
             disabled={!file}
             className="w-full py-3 text-lg shadow-lg"
           >
             PHÂN TÍCH
           </Button>
        </div>
      </div>

      <div className="flex-1 bg-white border-l border-[#B1ADA1]/20 p-6 flex flex-col overflow-y-auto">
         <h3 className="font-bold text-gray-900 mb-4">Kết quả phân tích</h3>
         
         {analysisResults.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[#B1ADA1] border-2 border-dashed border-[#EAE8E0] rounded-xl min-h-[200px]">
               {isLoading ? (
                 <div className="text-center">
                   <svg className="animate-spin h-8 w-8 text-[#C15F3C] mx-auto mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                   <p>Đang đọc ảnh...</p>
                 </div>
               ) : (
                 <div className="text-center">
                   <div className="text-4xl mb-3">📋</div>
                   <p className="text-sm">Kết quả sẽ hiển thị tại đây</p>
                 </div>
               )}
            </div>
         ) : (
            <div className="space-y-4">
               {analysisResults.map((result, idx) => (
                 <div key={idx} className="p-4 bg-[#F9F9F7] border border-[#B1ADA1]/30 rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-bold text-[#C15F3C] uppercase">Phong cách {idx + 1}</span>
                       <button 
                         onClick={() => navigator.clipboard.writeText(result)}
                         className="text-xs text-gray-500 hover:text-[#C15F3C] flex items-center gap-1"
                       >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                         Copy
                       </button>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{result}</p>
                 </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};
