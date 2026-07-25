
import React, { useState, useRef } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import { addPeopleToImage, fileToBase64 } from './services/gemini';
import { LoadingState } from '../types';
import { PhotoProvider, PhotoView } from 'react-photo-view';

interface BatchResult {
  id: string;
  originalSrc: string;
  resultSrc: string | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

type PersonInputType = 'upload' | 'prompt';

 const AddPeopleView: React.FC = () => {
  // State
  const [sceneFiles, setSceneFiles] = useState<File[]>([]);
  
  // Person Input State
  const [inputType, setInputType] = useState<PersonInputType>('upload');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [personDescription, setPersonDescription] = useState('');
  
  // Activity Prompt
  const [prompt, setPrompt] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  
  const sceneInputRef = useRef<HTMLInputElement>(null);

  const handleSceneFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSceneFiles(prev => [...prev, ...newFiles]);
      
      // Initialize results placeholders
      const newPlaceholders: BatchResult[] = newFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        originalSrc: URL.createObjectURL(file as File),
        resultSrc: null,
        status: 'pending'
      }));
      setResults(prev => [...prev, ...newPlaceholders]);
    }
  };

  const handleRemoveImage = (id: string) => {
      setResults(prev => prev.filter(item => item.id !== id));
  };

  const handleProcess = async () => {
    if (results.length === 0) return;
    if (!prompt.trim()) return;
    
    // Validation based on input type
    if (inputType === 'upload' && !referenceFile) {
        // Optional warning, but maybe we let them proceed without ref (AI guesses)
    }
    if (inputType === 'prompt' && !personDescription.trim()) {
        // Should enforce description if this mode is selected
    }

    setIsProcessing(true);
    
    // Prepare reference image once if uploading
    let refBase64: string | null = null;
    if (inputType === 'upload' && referenceFile) {
        try {
            refBase64 = await fileToBase64(referenceFile);
        } catch (e) {
            console.error("Failed to process reference file");
        }
    }

    const newResults = [...results];

    // Process only pending items
    for (let i = 0; i < newResults.length; i++) {
        if (newResults[i].status === 'success') continue; // Skip already done

        // Update status to processing
        newResults[i] = { ...newResults[i], status: 'processing' };
        setResults([...newResults]);

        try {
            // Fetch blob from url to get base64
            const response = await fetch(newResults[i].originalSrc);
            const blob = await response.blob();
            const reader = new FileReader();
            
            const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
            });

            // Pass appropriate arguments based on input type
            const resultBase64 = await addPeopleToImage(
                base64, 
                refBase64, // Will be null if inputType === 'prompt'
                prompt,
                inputType === 'prompt' ? personDescription : ""
            );
            
            newResults[i] = { 
                ...newResults[i], 
                status: 'success', 
                resultSrc: resultBase64 
            };
        } catch (e) {
            console.error(e);
            newResults[i] = { 
                ...newResults[i], 
                status: 'error', 
                error: 'Failed to process' 
            };
        }

        // Update state after each image
        setResults([...newResults]);
    }

    setIsProcessing(false);
  };

  const handleDownload = (src: string, idx: number) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = `people-added-${idx}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-full md:w-[400px] shrink-0 flex flex-col overflow-y-auto pb-12 pr-2 scrollbar-thin border-r border-[#B1ADA1]/20">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-4">Thêm người vào ảnh</h2>
        <p className="text-sm text-gray-500 mb-6">Thêm người hoặc con vật vào hàng loạt ảnh phối cảnh một cách tự nhiên.</p>

        <div className="space-y-6">
          
          {/* 1. Batch Upload */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">1. Tải lên các ảnh phối cảnh (Nhiều ảnh)</label>
            <div 
                onClick={() => sceneInputRef.current?.click()}
                className="border-2 border-dashed border-[#B1ADA1] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white hover:border-[#C15F3C] transition-colors bg-[#F9F9F7]"
            >
                <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={sceneInputRef}
                    onChange={handleSceneFilesChange}
                />
                <div className="text-3xl mb-2">imagesmode</div>
                <p className="text-sm font-medium">Chọn nhiều ảnh cùng lúc</p>
                <p className="text-xs text-gray-500 mt-1">{results.length} ảnh đã chọn</p>
            </div>
          </div>

          {/* 2. Person Input Method Toggle */}
          <div>
             <label className="block text-xs font-bold text-gray-700 mb-2">2. Nguồn người/vật mẫu</label>
             <div className="flex bg-white rounded-lg border border-[#B1ADA1] p-1 mb-3">
                <button
                    onClick={() => setInputType('upload')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        inputType === 'upload' ? 'bg-[#C15F3C] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Tải ảnh mẫu
                </button>
                <button
                    onClick={() => setInputType('prompt')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        inputType === 'prompt' ? 'bg-[#C15F3C] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    Tạo từ mô tả
                </button>
             </div>

             {inputType === 'upload' ? (
                <ImageUploader 
                    title="Ảnh người mẫu" 
                    selectedFile={referenceFile} 
                    onFileSelect={setReferenceFile} 
                />
             ) : (
                <div className="space-y-1.5">
                     <textarea 
                        value={personDescription}
                        onChange={(e) => setPersonDescription(e.target.value)}
                        placeholder="Ví dụ: Một người đàn ông mặc vest lịch lãm, dáng vẻ doanh nhân..."
                        className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-20 resize-none"
                     />
                     <p className="text-[10px] text-gray-500">Mô tả chi tiết ngoại hình, trang phục, độ tuổi của người cần thêm.</p>
                </div>
             )}
          </div>

          {/* 3. Prompt */}
          <div>
             <label className="block text-xs font-bold text-gray-700 mb-2">3. Mô tả hoạt động/vị trí</label>
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Đang đi bộ trên vỉa hè, đang ngồi uống cafe, đang đứng nói chuyện..."
                className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-20 resize-none"
             />
             <p className="text-[10px] text-gray-500 mt-1">
                 Gợi ý: Mô tả hành động cụ thể (đang ngồi, đang đi) để AI đặt vào vị trí hợp lý (ghế, đường đi).
             </p>
          </div>

          <Button 
             onClick={handleProcess}
             isLoading={isProcessing}
             disabled={results.length === 0 || !prompt || (inputType === 'prompt' && !personDescription)}
             className="w-full py-3 shadow-lg"
          >
             THỰC HIỆN HÀNG LOẠT
          </Button>

        </div>
      </div>

      {/* Right Panel: Results List */}
      <div className="flex-1 bg-white border-l border-[#B1ADA1]/20 p-6 flex flex-col overflow-hidden">
         <h3 className="font-bold text-gray-900 mb-4 flex justify-between items-center">
             <span>Kết quả ({results.filter(r => r.status === 'success').length}/{results.length})</span>
             {results.length > 0 && (
                 <button 
                    onClick={() => setResults([])}
                    className="text-xs text-red-500 hover:underline"
                 >
                     Xóa tất cả
                 </button>
             )}
         </h3>

         <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
             {results.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                     <div className="text-4xl mb-2">👥</div>
                     <p>Danh sách ảnh sẽ hiển thị tại đây</p>
                 </div>
             ) : (
                 <PhotoProvider>
                     {results.map((item, idx) => (
                         <div key={item.id} className="flex flex-col xl:flex-row gap-4 p-4 bg-[#F9F9F7] rounded-xl border border-[#B1ADA1]/30 relative">
                             <button 
                                onClick={() => handleRemoveImage(item.id)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 z-10"
                                title="Xóa ảnh này"
                             >
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>

                             {/* Original */}
                             <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Ảnh gốc</p>
                                 <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                                     <PhotoView src={item.originalSrc}>
                                        <img src={item.originalSrc} className="w-full h-full object-cover cursor-pointer" alt="Original" />
                                     </PhotoView>
                                 </div>
                             </div>

                             {/* Arrow Status */}
                             <div className="flex items-center justify-center shrink-0 xl:px-2 py-2 xl:py-0">
                                 {item.status === 'pending' && <span className="text-gray-300 text-2xl">➔</span>}
                                 {item.status === 'processing' && <span className="animate-spin text-[#C15F3C] text-2xl">↻</span>}
                                 {item.status === 'success' && <span className="text-green-500 text-2xl">✔</span>}
                                 {item.status === 'error' && <span className="text-red-500 text-2xl">✖</span>}
                             </div>

                             {/* Result */}
                             <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Kết quả</p>
                                 <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-dashed border-gray-300 flex items-center justify-center relative group">
                                     {item.resultSrc ? (
                                         <>
                                            <PhotoView src={item.resultSrc}>
                                                <img src={item.resultSrc} className="w-full h-full object-cover cursor-pointer" alt="Result" />
                                            </PhotoView>
                                            <button 
                                                onClick={() => handleDownload(item.resultSrc!, idx)}
                                                className="absolute bottom-2 right-2 bg-white/90 text-[#C15F3C] p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Tải xuống"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                         </>
                                     ) : (
                                         <span className="text-xs text-gray-400 italic">
                                             {item.status === 'processing' ? 'Đang xử lý...' : item.status === 'error' ? 'Lỗi' : 'Chờ xử lý'}
                                         </span>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </PhotoProvider>
             )}
         </div>
      </div>
    </div>
  );
};

export default AddPeopleView;

 
