
import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import Button from './Button';
import ResultGallery from './ResultGallery';
import { generateRealEstatePoster, fileToBase64, upscaleImage } from './services/gemini';
import { LoadingState, GeneratedImage } from '../types';
import { AspectRatioSelector, ImageCountSelector, ImageQualitySelector, QualityOption } from './common';

const RealEstatePosterView: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  
  // Section 3: Typography
  const [headline, setHeadline] = useState('NƠI ĐẲNG CẤP HỘI TỤ');
  const [subtitle, setSubtitle] = useState('Căn hộ cao cấp 3 & 4 phòng ngủ');
  const [fontStyle, setFontStyle] = useState('Serif Gold (Sang trọng)');
  
  // Section 2 & 6: Style & Color
  const [colorTheme, setColorTheme] = useState('Xanh Navy + Vàng Gold');
  const [posterStyle, setPosterStyle] = useState('Sang trọng Điện ảnh (Dubai/Singapore)');
  
  // New Section: Aspect Ratio & Resolution
  const [aspectRatio, setAspectRatio] = useState('3:4');
  const [imageQuality, setImageQuality] = useState<QualityOption>('2K');
  
  // Section 4: Icons/Amenities
  const [amenities, setAmenities] = useState<string[]>([
    'Trường học quốc tế',
    'Trung tâm thương mại',
    'Nhà hàng sang trọng',
    'Đường cao tốc',
    'Bệnh viện quốc tế'
  ]);

  // Section 5: Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [imageCount, setImageCount] = useState(1);
  const [userPrompt, setUserPrompt] = useState('');

  const [latestImages, setLatestImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const [generationTime, setGenerationTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [upscalingStatus, setUpscalingStatus] = useState<{ [src: string]: string }>({});

  // Generate prompt automatically when inputs change
  useEffect(() => {
    const amenityList = amenities.length > 0
      ? amenities.join('\n         • ')
      : 'Tiện ích cao cấp';

    const prompt = `
Dựa trên Ảnh Gốc (Ảnh 1), hãy tạo một poster bất động sản cao cấp theo phong cách quốc tế.
Giữ nguyên kiến trúc, tỷ lệ và bố cục ngôi nhà trong ảnh gốc nhưng tăng độ sang trọng, ánh sáng vàng ấm, phong cách cinematic.

YÊU CẦU CHI TIẾT:

1. KIẾN TRÚC & HÌNH ẢNH:
   - Giữ đúng bố cục, hình dáng, tỷ lệ của ngôi nhà trong ảnh gốc.
   - Tăng sáng nội thất (warm light), làm rõ mặt tiền, tăng độ sang trọng.
   - Phong cách tổng thể: ${posterStyle}.
   - Tránh: chữ mờ, nhiễu ảnh, bóng xấu, hiệu ứng rẻ tiền.

2. MÀU SẮC & ÁNH SÁNG:
   - Màu chủ đạo: ${colorTheme}.
   - Hiệu ứng cinematic, ánh sáng vàng sang trọng.
   - Nền trời (nếu có): Thay bằng tone màu phù hợp với chủ đề.

3. TYPOGRAPHY (NỘI DUNG CHỮ):
   - Tiêu đề lớn ở giữa: "${headline}"
   - Subtitle nhỏ bên dưới: "${subtitle}"
   - Font chữ: ${fontStyle}. Màu vàng gold (hoặc phù hợp theme).

4. MARKETING ICONS (TIỆN ÍCH):
    -- Không được dịch sang tiếng anh, chỉ dùng tiếng việt được cung cấp.
   - Vẽ một đường cong (arc) tinh tế phía trên tòa nhà (hoặc vị trí phù hợp).
   - Trên arc gắn ${amenities.length} icon tròn màu vàng (hoặc màu theme) tương ứng với các tiện ích sau:
         • ${amenityList}
   - Icon dạng tròn, tối giản.

5. LOGO:
   - Đặt logo thương hiệu (${logoFile ? 'Image 2' : 'Tạo logo placeholder sang trọng'}) ở vị trí dưới cùng trung tâm.

KẾT QUẢ:
Một poster hoàn chỉnh, độ phân giải cao, nhìn giống như quảng cáo bất động sản cao cấp tại Dubai hoặc Singapore.
    `.trim();

    setUserPrompt(prompt);
  }, [headline, subtitle, fontStyle, colorTheme, posterStyle, amenities, logoFile]);

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

  const handleAmenityChange = (index: number, value: string) => {
    const newAmenities = [...amenities];
    newAmenities[index] = value;
    setAmenities(newAmenities);
  };

  const addAmenity = () => {
    setAmenities([...amenities, '']);
  };

  const removeAmenity = (index: number) => {
    const newAmenities = amenities.filter((_, i) => i !== index);
    setAmenities(newAmenities);
  };

  const handleGenerate = async () => {
    if (!sourceFile) {
      setError("Vui lòng tải ảnh bất động sản (Ảnh gốc).");
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
      const logoBase64 = logoFile ? await fileToBase64(logoFile) : undefined;

      const details = {
        headline,
        subtitle,
        colorTheme,
        posterStyle,
        fontStyle,
        amenities,
        logoBase64,
        userPrompt, // Pass the edited prompt
        aspectRatio,
        resolution: imageQuality.toLowerCase()
      };
      
      const results = await generateRealEstatePoster(base64, details, imageCount);

      const newImages: GeneratedImage[] = results.map(url => ({
        src: url,
        prompt: `Poster: ${headline}`,
        timestamp: new Date(),
      }));

      setLatestImages(newImages);
      setStatus('success');
    } catch (e) {
      console.error(e);
      setError('Tạo poster thất bại. Vui lòng thử lại.');
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
        setLatestImages(prev => prev.map(img => img.src === src ? { ...img, src: newSrc, resolution } : img));
        setHistoryImages(prev => prev.map(img => img.src === src ? { ...img, src: newSrc, resolution } : img));
      }
    } catch (e) {
      console.error(e);
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
      <div className="w-[40%] shrink-0 overflow-y-auto pr-2 pb-12 border-r border-[#B1ADA1]/20 scrollbar-thin">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-6">Tạo Poster Bất Động Sản Cao Cấp</h2>
        
        {/* Section 1: Source Image */}
        <div className="mb-6">
          <ImageUploader title="1. Ảnh Gốc (Bắt buộc)" required={true} selectedFile={sourceFile} onFileSelect={setSourceFile} />
        </div>

        <div className="space-y-6 mb-6">
           {/* Section 2 & 6: Style & Color */}
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-3">2. Phong cách & Màu sắc</h3>
               <div className="space-y-3">
                   <div>
                       <label className="block text-xs font-medium text-gray-600 mb-1">Phong cách (Style)</label>
                       <select value={posterStyle} onChange={e => setPosterStyle(e.target.value)} className="w-full p-2.5 border border-[#B1ADA1] rounded-lg text-sm outline-none focus:border-[#C15F3C]">
                           <option value="Sang trọng Điện ảnh (Dubai/Singapore)">Sang trọng Điện ảnh (Dubai/Singapore)</option>
                           <option value="Hiện đại Tối giản">Hiện đại Tối giản</option>
                           <option value="Cổ điển Thanh lịch">Cổ điển Thanh lịch</option>
                           <option value="Sống Xanh Sinh thái">Sống Xanh Sinh thái</option>
                       </select>
                   </div>
                   <div>
                       <label className="block text-xs font-medium text-gray-600 mb-1">Màu chủ đạo (Theme Color)</label>
                       <select value={colorTheme} onChange={e => setColorTheme(e.target.value)} className="w-full p-2.5 border border-[#B1ADA1] rounded-lg text-sm outline-none focus:border-[#C15F3C]">
                           <option value="Xanh Navy + Vàng Gold">Xanh Navy + Vàng Gold</option>
                           <option value="Đen + Vàng Gold">Đen + Vàng Gold</option>
                           <option value="Trắng + Be (Ấm áp)">Trắng + Be (Ấm áp)</option>
                           <option value="Xanh lá + Gỗ (Thiên nhiên)">Xanh lá + Gỗ (Thiên nhiên)</option>
                       </select>
                   </div>
               </div>
           </div>

           {/* Section 3: Typography */}
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-3">3. Typography (Nội dung chữ)</h3>
               <div className="space-y-3">
                   <div>
                       <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề lớn (Headline)</label>
                       <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} className="w-full p-2.5 border border-[#B1ADA1] rounded-lg text-sm outline-none focus:border-[#C15F3C]" />
                   </div>
                   <div>
                       <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle nhỏ</label>
                       <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full p-2.5 border border-[#B1ADA1] rounded-lg text-sm outline-none focus:border-[#C15F3C]" />
                   </div>
                   <div>
                       <label className="block text-xs font-medium text-gray-600 mb-1">Kiểu Font</label>
                       <select value={fontStyle} onChange={e => setFontStyle(e.target.value)} className="w-full p-2.5 border border-[#B1ADA1] rounded-lg text-sm outline-none focus:border-[#C15F3C]">
                           <option value="Serif Gold (Sang trọng)">Serif Gold (Sang trọng)</option>
                           <option value="Sans-serif Modern (Hiện đại)">Sans-serif Modern (Hiện đại)</option>
                           <option value="Bold Impact (Mạnh mẽ)">Bold Impact (Mạnh mẽ)</option>
                       </select>
                   </div>
               </div>
           </div>

           {/* Section 4: Amenities */}
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-3">4. Tiện ích nổi bật (Icon)</h3>
               <div className="space-y-2 mb-2">
                   {amenities.map((item, idx) => (
                       <div key={idx} className="flex items-center gap-2">
                           <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                           <input 
                               type="text" 
                               value={item} 
                               onChange={e => handleAmenityChange(idx, e.target.value)}
                               className="flex-1 p-2 border border-[#B1ADA1] rounded text-sm outline-none focus:border-[#C15F3C]"
                               placeholder={`Tiện ích ${idx + 1}`}
                           />
                           <button 
                              onClick={() => removeAmenity(idx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                              title="Xóa"
                           >
                             ✕
                           </button>
                       </div>
                   ))}
               </div>
               <button 
                  onClick={addAmenity}
                  className="w-full py-2 border border-dashed border-[#B1ADA1] text-gray-600 text-sm rounded hover:bg-gray-50 hover:border-[#C15F3C] hover:text-[#C15F3C] transition-colors"
               >
                  + Thêm tiện ích
               </button>
           </div>
           
           {/* Section 5: Logo */}
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-3">5. Logo Thương Hiệu</h3>
               <ImageUploader title="Upload Logo (Tùy chọn)" required={false} selectedFile={logoFile} onFileSelect={setLogoFile} />
               <p className="text-[10px] text-gray-500 mt-1 italic">*Nếu không có logo, hệ thống sẽ tạo logo placeholder.</p>
           </div>

           {/* Prompt Preview & Edit */}
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-3">Prompt (Có thể chỉnh sửa)</h3>
               <textarea 
                 value={userPrompt}
                 onChange={e => setUserPrompt(e.target.value)}
                 className="w-full h-40 p-3 border border-[#B1ADA1] rounded-lg text-xs font-mono outline-none focus:border-[#C15F3C] resize-y"
               />
               <p className="text-[10px] text-gray-500 mt-1 italic">*Bạn có thể chỉnh sửa prompt trực tiếp trước khi tạo ảnh.</p>
           </div>
           
     
           {/* New Section: Aspect Ratio & Resolution */}
           <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <h3 className="text-sm font-bold text-gray-800 mb-3">Tùy chọn Định dạng (Format)</h3>
               <div className="space-y-3">

               <ImageCountSelector 
             value={imageCount} 
             onChange={setImageCount} 
           />


                   <AspectRatioSelector 
                     value={aspectRatio} 
                     onChange={setAspectRatio}
                     ratios={['1:1', '3:4', '4:3', '9:16', '16:9']}
                   />
                   
                   <ImageQualitySelector 
                     value={imageQuality} 
                     onChange={setImageQuality}
                     label="Độ phân giải"
                   />
               </div>
           </div>

           <Button onClick={handleGenerate} isLoading={status === 'generating'} className="w-full py-3 mt-2">TẠO POSTER</Button>
           {error && <div className="text-xs text-red-500 text-center mt-2">{error}</div>}
        </div>
      </div>
      <div className="flex-1 h-full">
         <ResultGallery 
           status={status} latestImages={latestImages} historyImages={historyImages} 
           imageCount={imageCount} generationTime={generationTime} aspectRatio={aspectRatio}
           onUpscale={handleUpscale} upscalingStatus={upscalingStatus} 
         />
      </div>
    </div>
  );
};

export default RealEstatePosterView;
