
import React, { useState } from 'react';
import Button from './Button';
import { generateFengShuiAdvice } from './services/gemini';

type Tab = 'age' | 'date';

const FengShuiView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('age');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Age State
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState('Nam');

  // Date State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activity, setActivity] = useState('Động thổ / Xây nhà');

  const handleCheckAge = async () => {
    if (!birthYear) return;
    setIsLoading(true);
    setResult(null);

    try {
      const prompt = `Bạn là chuyên gia phong thuỷ bát trạch và huyền không phi tinh. Hãy phân tích chi tiết cho người sinh năm ${birthYear}, giới tính ${gender} (Âm lịch).
      Nội dung cần có:
      1. Mệnh quái, Ngũ hành.
      2. Màu sắc tương sinh, tương khắc.
      3. Hướng nhà/bàn làm việc tốt (Sinh Khí, Thiên Y, Diên Niên, Phục Vị).
      4. Hướng cần tránh (Tuyệt Mệnh, Ngũ Quỷ, Lục Sát, Hoạ Hại).
      5. Lưu ý đặc biệt cho năm nay (2025 - Ất Tỵ).
      Trình bày rõ ràng, ngắn gọn, dễ hiểu, sử dụng gạch đầu dòng.`;

      const advice = await generateFengShuiAdvice(prompt);
      setResult(advice);
    } catch (e) {
      console.error(e);
      setResult("Có lỗi xảy ra khi xem phong thuỷ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckDate = async () => {
    if (!date || !activity) return;
    setIsLoading(true);
    setResult(null);

    try {
      const prompt = `Bạn là chuyên gia phong thuỷ xem ngày tốt xấu (Ngọc Hạp Thông Thư). Hãy xem ngày ${date} cho công việc: ${activity}.
      Nội dung cần có:
      1. Thông tin ngày: Can chi, Trực, Sao.
      2. Đánh giá chung: Tốt / Xấu / Bình thường cho việc ${activity}.
      3. Giờ Hoàng Đạo trong ngày (Liệt kê các giờ tốt).
      4. Các việc nên làm và nên tránh trong ngày này.
      Trình bày rõ ràng, ngắn gọn, dễ hiểu, sử dụng gạch đầu dòng.`;

      const advice = await generateFengShuiAdvice(prompt);
      setResult(advice);
    } catch (e) {
      console.error(e);
      setResult("Có lỗi xảy ra khi xem ngày. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
      {/* Left Panel: Controls */}
      <div className="w-full md:w-[400px] shrink-0 flex flex-col overflow-y-auto pb-12">
        <h2 className="text-xl font-bold text-[#C15F3C] mb-4">Phong Thuỷ & Kiến Trúc</h2>
        <p className="text-sm text-gray-500 mb-6">Tư vấn phong thuỷ ứng dụng trong xây dựng và đời sống.</p>

        {/* Tab Selectors */}
        <div className="flex bg-white rounded-lg border border-[#B1ADA1] p-1 mb-6">
          <button
            onClick={() => { setActiveTab('age'); setResult(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'age' ? 'bg-[#C15F3C] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Xem Tuổi
          </button>
          <button
            onClick={() => { setActiveTab('date'); setResult(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'date' ? 'bg-[#C15F3C] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Xem Ngày Tốt
          </button>
        </div>

        {/* Age View Inputs */}
        {activeTab === 'age' && (
          <div className="space-y-4 bg-white p-6 rounded-xl border border-[#B1ADA1]/30">
            <div>
              <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-1.5">Năm sinh (Dương lịch)</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="Ví dụ: 1990"
                className="w-full p-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-1.5">Giới tính</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Nam"
                    checked={gender === 'Nam'}
                    onChange={(e) => setGender(e.target.value)}
                    className="accent-[#C15F3C]"
                  />
                  <span className="text-sm text-gray-700">Nam</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Nữ"
                    checked={gender === 'Nữ'}
                    onChange={(e) => setGender(e.target.value)}
                    className="accent-[#C15F3C]"
                  />
                  <span className="text-sm text-gray-700">Nữ</span>
                </label>
              </div>
            </div>

            <Button 
              onClick={handleCheckAge} 
              isLoading={isLoading}
              disabled={!birthYear}
              className="w-full mt-2"
            >
              TRA CỨU
            </Button>
          </div>
        )}

        {/* Date View Inputs */}
        {activeTab === 'date' && (
          <div className="space-y-4 bg-white p-6 rounded-xl border border-[#B1ADA1]/30">
            <div>
              <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-1.5">Chọn ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-1.5">Công việc dự kiến</label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full p-3 bg-[#F9F9F7] border border-[#B1ADA1] rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none"
              >
                <option value="Động thổ / Xây nhà">Động thổ / Xây nhà</option>
                <option value="Nhập trạch (Vào nhà mới)">Nhập trạch (Vào nhà mới)</option>
                <option value="Sửa chữa nhà cửa">Sửa chữa nhà cửa</option>
                <option value="Mua bán bất động sản">Mua bán bất động sản</option>
                <option value="Khai trương cửa hàng">Khai trương cửa hàng</option>
                <option value="Ký kết hợp đồng">Ký kết hợp đồng</option>
                <option value="Cưới hỏi">Cưới hỏi</option>
                <option value="Xuất hành đi xa">Xuất hành đi xa</option>
              </select>
            </div>

            <Button 
              onClick={handleCheckDate} 
              isLoading={isLoading}
              disabled={!date}
              className="w-full mt-2"
            >
              XEM NGÀY
            </Button>
          </div>
        )}
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 bg-white border-l border-[#B1ADA1]/20 p-8 flex flex-col overflow-y-auto">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="text-2xl">📜</span> Kết quả luận giải
        </h3>

        {!result ? (
          <div className="flex-1 flex items-center justify-center text-[#B1ADA1] border-2 border-dashed border-[#EAE8E0] rounded-xl min-h-[200px]">
             {isLoading ? (
               <div className="text-center">
                 <svg className="animate-spin h-8 w-8 text-[#C15F3C] mx-auto mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                 <p>Đang tham vấn chuyên gia AI...</p>
               </div>
             ) : (
               <div className="text-center">
                 <div className="text-9xl mb-6">☯️</div>
                 <p className="text-lg text-gray-500">Kết quả phong thuỷ sẽ hiển thị tại đây</p>
               </div>
             )}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-gray-700 bg-[#F9F9F7] p-6 rounded-xl border border-[#B1ADA1]/30 shadow-sm">
             {/* Simple rendering for plain text/markdown-like output */}
             <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{result}</pre>
             
             <div className="mt-6 pt-4 border-t border-[#B1ADA1]/20 text-xs text-gray-500 italic">
                * Lưu ý: Kết quả mang tính chất tham khảo dựa trên các nguyên lý phong thuỷ phổ quát. Hãy cân nhắc thêm ý kiến chuyên gia cho các quyết định quan trọng.
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FengShuiView;
