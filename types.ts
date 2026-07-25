
export enum AppView {
  EXTERIOR = 'EXTERIOR',
  INTERIOR = 'INTERIOR',
  PLANNING = 'PLANNING',           // Render Quy hoạch 3D
  EDIT_MASK = 'EDIT_MASK',         // Sửa ảnh theo vùng chọn
  EDIT_MATERIAL = 'EDIT_MATERIAL', // Thay vật liệu
  EDIT_FURNITURE = 'EDIT_FURNITURE', // Thay đồ nội thất
  VIDEO = 'VIDEO',
  UTILITIES_UPSCALE = 'UTILITIES_UPSCALE',     // Nâng cấp ảnh
  UTILITIES_INSERT_BUILDING = 'UTILITIES_INSERT_BUILDING', // Chèn công trình vào hiện trạng
  UTILITIES_EXPAND_VIEW = 'UTILITIES_EXPAND_VIEW', // Mở rộng View
  UTILITIES_CHANGE_LIGHTING = 'UTILITIES_CHANGE_LIGHTING', // Thay đổi ánh sáng
  UTILITIES_CAMERA_ANGLE = 'UTILITIES_CAMERA_ANGLE', // Góc Camera
  UTILITIES_MOODBOARD = 'UTILITIES_MOODBOARD', // Tạo Moodboard
  UTILITIES_PRESENTATION_BOARD = 'UTILITIES_PRESENTATION_BOARD', // Bảng trình bày kiến trúc
  UTILITIES_2D_ELEVATION = 'UTILITIES_2D_ELEVATION', // Tạo mặt đứng 2D
  UTILITIES_TECH_DRAWING = 'UTILITIES_TECH_DRAWING', // Tạo bản vẽ kỹ thuật (Mặt bằng, Mặt cắt, Mặt đứng)
  UTILITIES_ADD_PEOPLE = 'UTILITIES_ADD_PEOPLE', // Thêm người vào nhiều ảnh
  UTILITIES_ANALYSIS = 'UTILITIES_ANALYSIS',   // Phân tích kiến trúc
  UTILITIES_FENGSHUI = 'UTILITIES_FENGSHUI',   // Phong thuỷ
  UTILITIES_VIRTUAL_TOUR = 'UTILITIES_VIRTUAL_TOUR', // Thăm quan ảo
  UTILITIES_FLOOR_PLAN_TO_3D = 'UTILITIES_FLOOR_PLAN_TO_3D', // Render 3D từ mặt bằng
  TREND_REAL_ESTATE_POSTER = 'TREND_REAL_ESTATE_POSTER', // Tạo poster BĐS
  TREND_ANNOTATED_RENDER = 'TREND_ANNOTATED_RENDER',     // Render có chú thích
  TREND_3D_SECTION_PERSPECTIVE = 'TREND_3D_SECTION_PERSPECTIVE', // Mặt cắt 3D Perspective
  TREND_SKETCH_CONCEPT = 'TREND_SKETCH_CONCEPT', // Chuyển đổi thành bản vẽ phác thảo/mặt đứng kiến trúc
  HISTORY = 'HISTORY', // Xem lại lịch sử
}

export interface AIStudioWindow {
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}

export type LoadingState = 'idle' | 'uploading' | 'generating' | 'success' | 'error';

export interface GeneratedImage {
  src: string;
  prompt: string;
  timestamp: Date;
  resolution?: '2K' | '4K';
}

export interface HistoryItem extends GeneratedImage {
  id: string;
  type: string; // e.g., 'Exterior', 'Interior', 'Editor'
}