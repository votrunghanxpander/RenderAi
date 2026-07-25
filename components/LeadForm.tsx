import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';

export interface LeadFormHandle {
  submit: () => Promise<void>;
  isValid: () => boolean;
}

interface LeadFormProps {
  onChange?: () => void;
}

export const LeadForm = forwardRef<LeadFormHandle, LeadFormProps>(({ onChange }, ref) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  // Load data from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('leadForm_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const validate = () => {
    const newErrors = { fullName: '', phone: '', email: '' };
    let isValid = true;

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
      isValid = false;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
      isValid = false;
    } else if (!/^\d{9,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  useImperativeHandle(ref, () => ({
    submit: async () => {
      if (validate()) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        localStorage.setItem('leadForm_data', JSON.stringify(formData));
      } else {
        throw new Error('Validation failed');
      }
    },
    isValid: () => validate()
  }));

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Debounce saving strictly for ux, but here we can just save/check validity
      return next;
    });
    if (onChange) onChange();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-bold text-[#C15F3C] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Đăng ký trải nghiệm</h3>
        <p className="text-[#B1ADA1] text-sm mb-6">Điền thông tin để bắt đầu sử dụng miễn phí.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-1">Họ và tên</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className={`w-full p-3 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none transition-all ${errors.fullName ? 'border-red-500' : 'border-[#B1ADA1]/50'}`}
            placeholder="Nguyễn Văn A"
          />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-1">Số điện thoại</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full p-3 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none transition-all ${errors.phone ? 'border-red-500' : 'border-[#B1ADA1]/50'}`}
            placeholder="0912345678"
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#B1ADA1] uppercase mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full p-3 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-[#C15F3C] outline-none transition-all ${errors.email ? 'border-red-500' : 'border-[#B1ADA1]/50'}`}
            placeholder="example@gmail.com"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
      </div>
    </div>
  );
});

LeadForm.displayName = 'LeadForm';