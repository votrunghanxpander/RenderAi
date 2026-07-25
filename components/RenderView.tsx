
import React, { useState, useRef, useEffect } from 'react';
import { AppView, LoadingState } from '../types';
import Button from './Button';
import { generateArchitecturalRender, fileToBase64 } from './services/gemini';
import { AspectRatioSelector, ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

interface RenderViewProps {
  type: AppView.EXTERIOR | AppView.INTERIOR;
}

const RenderView: React.FC<RenderViewProps> = ({ type }) => {
  // State for Uploads
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  // State for Form
  const [customDescription, setCustomDescription] = useState('');
  const [style, setStyle] = useState('Modern (Hiện đại)');
  const [context, setContext] = useState('trên một đường phố Việt Nam');
  const [lighting, setLighting] = useState('sáng');
  const [weather, setWeather] = useState('trong xanh');
  const [negativePrompt, setNegativePrompt] = useState('chữ, dầu mỡ, mờ, chất lượng thấp');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageCount, setImageCount] = useState(1);
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');
  
  // Full constructed prompt
  const [fullPrompt, setFullPrompt] = useState('');
  
  // Results
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const isExterior = type === AppView.EXTERIOR;
  const title = isExterior ? 'Render Ngoại thất' : 'Render Nội thất';

  // Auto-construct full prompt
  useEffect(() => {
    const descriptionPart = customDescription ? `${customDescription}, ` : '';
    const constructedPrompt = `Generate an image with a strict aspect ratio of ${aspectRatio}. Adapt the composition from the source image to fit this new frame. Do not add black bars or letterbox ${negativePrompt}. The main creative instruction is: ${descriptionPart}${style}, ${context}, ${lighting}, ${weather}.`;
    setFullPrompt(constructedPrompt);
  }, [aspectRatio, negativePrompt, customDescription, style, context, lighting, weather]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isSource: boolean) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        if (isSource) setSourceImage(dataUrl);
        else setReferenceImage(dataUrl);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGenerate = async () => {
    if (!sourceImage) {
      setError("Please upload a source image.");
      return;
    }
    setStatus('generating');
    setError(null);
    setGeneratedImages([]);

    try {
      const sourceBase64 = sourceImage.split(',')[1];
      const refBase64 = referenceImage ? referenceImage.split(',')[1] : null;

      const results = await generateArchitecturalRender(
        sourceBase64,
        refBase64,
        fullPrompt, // Pass the constructed string directly
        imageCount
      );

      setGeneratedImages(results);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Render generation failed. Please try again.');
      setStatus('error');
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
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Inputs (Scrollable) */}
      <div className="flex-1 overflow-y-auto pr-2 pb-12">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">{title}</h2>

        {/* Upload Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Source Image */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Tải ảnh lên <span className="text-red-500">*</span></label>
            <div 
              onClick={() => sourceInputRef.current?.click()}
              className={`border border-dashed border-[#B1ADA1] rounded-xl p-4 flex flex-col items-center justify-center text-center h-40 cursor-pointer hover:bg-white hover:shadow-sm transition-all bg-[#F9F9F7] ${!sourceImage ? 'text-[#B1ADA1]' : ''}`}
            >
              <input type="file" ref={sourceInputRef} className="hidden" onChange={(e) => handleFileChange(e, true)} accept="image/*" />
              {sourceImage ? (
                <img src={sourceImage} alt="Source" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <>
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs">Tải ảnh lên hoặc kéo thả</p>
                  <p className="text-[10px] mt-1 opacity-70">PNG, JPG đến 10MB</p>
                </>
              )}
            </div>
          </div>

          {/* Reference Image */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Ảnh tham khảo</label>
            <div 
              onClick={() => refInputRef.current?.click()}
              className={`border border-dashed border-[#B1ADA1] rounded-xl p-4 flex flex-col items-center justify-center text-center h-40 cursor-pointer hover:bg-white hover:shadow-sm transition-all bg-[#F9F9F7] ${!referenceImage ? 'text-[#B1ADA1]' : ''}`}
            >
              <input type="file" ref={refInputRef} className="hidden" onChange={(e) => handleFileChange(e, false)} accept="image/*" />
              {referenceImage ? (
                <img src={referenceImage} alt="Reference" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <>
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs">Tải ảnh tham khảo</p>
                  <p className="text-[10px] mt-1 opacity-70">Tùy chọn</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">
          {/* Custom Description Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Mô tả chi tiết (Tùy chọn)</label>
            <input 
              type="text" 
              value={customDescription} 
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Ví dụ: Một căn biệt thự màu trắng..."
              className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
            />
          </div>

          {renderDropdown('Phong cách kiến trúc', style, setStyle, [
            'Modern (Hiện đại)', 'Neoclassical (Tân cổ điển)', 'Minimalist (Tối giản)', 
            'Indochine (Đông Dương)', 'Scandinavian (Bắc Âu)', 'Wabi Sabi', 
            'Industrial (Công nghiệp)', 'Tropical (Nhiệt đới)', 'Classical (Cổ điển)', 
            'Rustic (Mộc mạc)', 'Bohemian / Boho (Phóng khoáng)'
          ])}

          {renderDropdown('Vị trí', context, setContext, [
            'trên một đường phố Việt Nam', 'ở một làng quê Việt Nam', 
            'trong một khu đô thị hiện đại Việt Nam', 'tại một ngã ba đường phố Việt Nam', 
            'tại một ngã tư đường phố Việt Nam'
          ])}

          {renderDropdown('Ánh sáng', lighting, setLighting, ['sáng', 'trưa', 'tối', 'ban đêm'])}
          
          {renderDropdown('Thời tiết', weather, setWeather, ['trong xanh', 'mưa bão', 'mưa nhỏ', 'âm u'])}

          {/* Negative Prompt */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt loại trừ</label>
            <input 
              type="text" 
              value={negativePrompt} 
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full p-2.5 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
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

          {/* Full Prompt Display */}
          <div className="space-y-1.5">
             <label className="block text-xs font-semibold text-[#B1ADA1] uppercase">Prompt đầy đủ</label>
             <textarea 
               value={fullPrompt} 
               onChange={(e) => setFullPrompt(e.target.value)}
               className="w-full p-3 bg-white border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none h-32 resize-none text-gray-600 leading-relaxed"
             />
          </div>

          <Button 
            onClick={handleGenerate} 
            isLoading={status === 'generating'} 
            className="w-full mt-4 bg-[#C15F3C] hover:bg-[#A04B2D] py-3 text-lg shadow-lg"
          >
            RENDER
          </Button>

          {error && (
            <div className="text-xs text-red-500 mt-2 text-center">{error}</div>
          )}
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="w-full lg:w-[400px] xl:w-[500px] shrink-0 flex flex-col h-full bg-white border-l border-[#B1ADA1] p-6 overflow-y-auto">
        <h3 className="font-bold text-gray-900 mb-4">Kết quả mới nhất</h3>
        
        <div className="flex-1">
          {status === 'idle' && generatedImages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-[#B1ADA1] opacity-60">
              <div className="w-16 h-16 border-2 border-dashed border-[#B1ADA1] rounded-lg mb-4"></div>
              <p className="text-sm text-center px-8">Kết quả tạo ảnh sẽ hiển thị ở đây.</p>
            </div>
          )}

          {status === 'generating' && (
            <div className="grid grid-cols-1 gap-4 animate-pulse">
              {[...Array(imageCount)].map((_, i) => (
                <div key={i} className="aspect-video bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          )}

          <div className="space-y-6">
            {generatedImages.map((img, idx) => (
              <div key={idx} className="group relative rounded-lg overflow-hidden shadow-md border border-[#B1ADA1]">
                <img src={img} alt={`Result ${idx + 1}`} className="w-full h-auto" />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                  <a 
                    href={img} 
                    download={`render-${Date.now()}-${idx}.png`}
                    className="p-2 bg-white rounded-full text-[#C15F3C] hover:bg-gray-100 shadow-lg"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </a>
                  <button 
                    className="p-2 bg-white rounded-full text-[#C15F3C] hover:bg-gray-100 shadow-lg"
                    title="View Fullscreen"
                    onClick={() => window.open(img, '_blank')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenderView;
