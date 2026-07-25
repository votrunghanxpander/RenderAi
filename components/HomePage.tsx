
import React, { useState } from 'react';
import Button from './Button';
import ReactPlayer from 'react-player';

interface HomePageProps {
  onEnterApp: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onEnterApp }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEnterApp = () => {  //luôn cho vào không kiểm tra
    onEnterApp();
    };

    // Icons
    const SparklesIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" />
        </svg>
    );

    const ZapIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );

    const LayersIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
            <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
            <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
            <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </svg>
    );

    const PaletteIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
    );

    const MessageCircleIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-white">
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
        </svg>
    );

    return (
        <div className="min-h-screen bg-[#F4F3EE] relative overflow-hidden font-sans">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-[#C15F3C]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
            <div className="absolute bottom-0 -right-4 w-72 h-72 bg-[#6a9bcc]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
            <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-[#788c5d]/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="content-wrapper flex flex-col min-h-screen px-4 py-8 relative z-10">
                <div className="max-w-7xl w-full mx-auto">
                    {/* Logo Section */}
                    <div className="flex justify-center mb-8 animate-fadeIn">
                        <div className="flex flex-col items-center">
                            <h1 className="text-4xl font-bold text-[#C15F3C]" style={{ fontFamily: 'Poppins, sans-serif' }}>BimSpeed AI</h1>
                            <p className="text-sm text-[#B1ADA1] tracking-wider">ARCHITECTURAL INTELLIGENCE</p>
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <div className="text-center space-y-4 mb-12 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                        <h1 className="text-5xl md:text-7xl font-bold leading-tight text-[#1F2937]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Welcome to BimSpeed AI
                        </h1>
                        <p className="text-xl md:text-2xl font-medium max-w-3xl mx-auto text-[#B1ADA1]" style={{ fontFamily: 'Lora, serif' }}>
                            Transform your architectural vision with AI-powered rendering
                        </p>
                    </div>

                    {/* Feature Highlights */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
                        <div className="bg-[#F9F9F7] rounded-xl p-4 border border-[#B1ADA1]/30 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center justify-center h-10 w-10 rounded-lg mb-2 bg-[#C15F3C]">
                                <SparklesIcon />
                            </div>
                            <p className="text-sm font-semibold text-[#1F2937]">37 AI Tools</p>
                            <p className="text-xs text-[#B1ADA1]">Professional features</p>
                        </div>

                        <div className="bg-[#F9F9F7] rounded-xl p-4 border border-[#B1ADA1]/30 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center justify-center h-10 w-10 rounded-lg mb-2 bg-[#6a9bcc]">
                                <ZapIcon />
                            </div>
                            <p className="text-sm font-semibold text-[#1F2937]">Instant Results</p>
                            <p className="text-xs text-[#B1ADA1]">Real-time generation</p>
                        </div>

                        <div className="bg-[#F9F9F7] rounded-xl p-4 border border-[#B1ADA1]/30 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center justify-center h-10 w-10 rounded-lg mb-2 bg-[#788c5d]">
                                <PaletteIcon />
                            </div>
                            <p className="text-sm font-semibold text-[#1F2937]">Full Control</p>
                            <p className="text-xs text-[#B1ADA1]">Customizable renders</p>
                        </div>

                        <div className="bg-[#F9F9F7] rounded-xl p-4 border border-[#B1ADA1]/30 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-center justify-center h-10 w-10 rounded-lg mb-2 bg-[#C15F3C]">
                                <LayersIcon />
                            </div>
                            <p className="text-sm font-semibold text-[#1F2937]">Free to Use</p>
                            <p className="text-xs text-[#B1ADA1]">No credit card needed</p>
                        </div>
                    </div>

                    {/* Video and Form Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 items-start mb-12">
                        {/* Video Section - Left */}
                        <div className="lg:col-span-3 flex flex-col animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                            <div className="relative w-full pt-[56.25%] bg-black rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 group">
                                <ReactPlayer
                                    className="absolute top-0 left-0"
                                    url="https://www.youtube.com/watch?v=a3qKuWOBAp8"
                                    width="100%"
                                    height="100%"
                                    controls
                                    light={true}
                                    playIcon={
                                        <div className="w-20 h-20 bg-[#C15F3C] rounded-full flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    }
                                />
                            </div>
                        </div>

                        {/* Lead Form Section - Right - Simplified to just CTA */}
                        <div className="lg:col-span-2 flex flex-col justify-center space-y-6 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-bold text-[#1F2937]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                    Ready to design?
                                </h3>
                                <p className="text-lg text-[#B1ADA1]" style={{ fontFamily: 'Lora, serif' }}>
                                    Experience the future of architectural visualization today. No registration required.
                                </p>
                            </div>

                            {/* Call to Action Button */}
                            <Button
                                onClick={handleEnterApp}
                                className="w-full font-bold py-5 px-8 rounded-xl text-xl shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 bg-[#C15F3C]"
                                isLoading={isSubmitting}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <SparklesIcon />
                                    Dùng ngay miễn phí
                                </span>
                            </Button>

                            <p className="text-center text-sm text-[#B1ADA1] px-4">
                                Truy cập toàn bộ công cụ • Không giới hạn tính năng
                            </p>
                        </div>
                    </div>

                    {/* Community Support Section */}
                    <div className="mt-12 mb-8 rounded-2xl p-8 border border-[#B1ADA1]/30 bg-[#F9F9F7] animate-fadeIn" style={{ animationDelay: '0.35s' }}>
                        <div className="flex items-center justify-between flex-col md:flex-row gap-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#C15F3C]">
                                    <MessageCircleIcon />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-[#1F2937]">Cộng đồng & Hỗ trợ</h3>
                                    <p className="text-sm text-[#B1ADA1]">Tham gia cộng đồng của chúng tôi để nhận trợ giúp và chia sẻ kinh nghiệm</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a
                                    href="https://zalo.me/g/ugaccx115"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg text-center bg-[#C15F3C]"
                                >
                                    Tham gia Zalo
                                </a>
                                <a
                                    href="https://www.skool.com/bimspeed-ai-expert-sharing-2563/about?ref=364de47d2f0d4b998c264c5ebdcf76cd"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg text-center bg-[#6a9bcc]"
                                >
                                    Tham gia Skool
                                </a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
