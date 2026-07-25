
import React, { useState } from 'react';

interface SettingsFabProps {
  currentModel: string;
  onModelChange: (model: string) => void;
}

const SettingsFab: React.FC<SettingsFabProps> = ({ currentModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (newModel: string) => {
    onModelChange(newModel);
    localStorage.setItem('bimSpeed_model_preference', newModel);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
        {isOpen && (
            <div className="bg-white rounded-xl shadow-2xl p-4 border border-[#B1ADA1] w-72 animate-fadeIn mb-2">
                <h3 className="text-sm font-bold text-[#C15F3C] mb-3 uppercase tracking-wider flex items-center justify-between">
                    Cấu hình Model
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </h3>
                
                <div className="space-y-2">
                    <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${currentModel === 'gemini-2.5-flash-image' ? 'border-[#C15F3C] bg-[#C15F3C]/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input 
                            type="radio" 
                            name="model" 
                            value="gemini-2.5-flash-image" 
                            checked={currentModel === 'gemini-2.5-flash-image'}
                            onChange={() => handleSelect('gemini-2.5-flash-image')}
                            className="w-4 h-4 text-[#C15F3C] accent-[#C15F3C]"
                        />
                        <div className="ml-3">
                            <span className="block text-sm font-medium text-gray-900">Gemini 2.5 Flash</span>
                            <span className="block text-xs text-gray-500">Nhanh, tiết kiệm (Default)</span>
                        </div>
                    </label>

                    <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${currentModel === 'gemini-3-pro-image-preview' ? 'border-[#C15F3C] bg-[#C15F3C]/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input 
                            type="radio" 
                            name="model" 
                            value="gemini-3-pro-image-preview" 
                            checked={currentModel === 'gemini-3-pro-image-preview'}
                            onChange={() => handleSelect('gemini-3-pro-image-preview')}
                            className="w-4 h-4 text-[#C15F3C] accent-[#C15F3C]"
                        />
                        <div className="ml-3">
                            <span className="block text-sm font-medium text-gray-900">Gemini 3 Pro Preview</span>
                            <span className="block text-xs text-gray-500">Chất lượng cao, chi tiết hơn</span>
                        </div>
                    </label>
                </div>
            </div>
        )}

        <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${isOpen ? 'bg-gray-800 rotate-90' : 'bg-[#C15F3C] hover:bg-[#a04b2d] hover:scale-110'} text-white`}
            title="Cài đặt Model"
        >
            {isOpen ? (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )}
        </button>
    </div>
  );
};

export default SettingsFab;
