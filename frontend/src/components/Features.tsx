// frontend/src/components/Features.tsx
"use client";
import React from "react";
import Link from "next/link";

interface Feature {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  gradient: string;
  iconColor: string;
  accentColor: string;
}

// Icon Components - Updated for larger decorative use
const CommunityIcon = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12.75c1.63 0 3.07.39 4.24.9c1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73c1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2c0-1.1-.9-2-2-2s-2 .9-2 2c0 1.1.9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1c-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2c0-1.1-.9-2-2-2s-2 .9-2 2c0 1.1.9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1c-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 16 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM12 6c1.66 0 3 1.34 3 3c0 1.66-1.34 3-3 3s-3-1.34-3-3c0-1.66 1.34-3 3-3z"/>
  </svg>
);

const CodingIcon = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
    <circle cx="12" cy="12" r="2" opacity="0.3"/>
    <path d="M2 2h4v4H2zm16 0h4v4h-4zm0 16h4v4h-4zM2 18h4v4H2z" opacity="0.2"/>
  </svg>
);

const StorageIcon = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
    {/* Main folder shape */}
    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
    
    {/* Folder tab detail */}
    <path d="M10 4H4c-1.11 0-2 .89-2 2v1h20V8c0-1.11-.89-2-2-2h-8l-2-2z" opacity="0.7"/>
    
    {/* Document icons inside folder */}
    <rect x="6" y="10" width="3" height="4" rx="0.5" opacity="0.4"/>
    <rect x="10" y="11" width="3" height="4" rx="0.5" opacity="0.3"/>
    <rect x="14" y="9" width="3" height="4" rx="0.5" opacity="0.5"/>
    
    {/* Small decorative stars */}
    <circle cx="18" cy="11" r="0.8" opacity="0.6"/>
    <circle cx="17" cy="13" r="0.5" opacity="0.4"/>
  </svg>
);

const features: Feature[] = [
  {
    title: "커뮤니티",
    description: "다양한 개발 문제를 공유하고 사용자들과 소통하세요.",
    link: "/community",
    icon: <CommunityIcon />,
    gradient: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-100",
    accentColor: "from-blue-500 to-blue-400",
  },
  {
    title: "코딩 테스트",
    description: "원하는 난이도의 LLM 기반 개인 맞춤형 문제를 제공합니다.",
    link: "/coding-test",
    icon: <CodingIcon />,
    gradient: "from-green-50 to-emerald-50",
    iconColor: "text-green-100",
    accentColor: "from-green-500 to-green-400",
  },
  {
    title: "내 저장소",
    description: "LLM이 생성한 문제를 저장하고 언제든지 다시 도전할 수 있습니다.",
    link: "/storage",
    icon: <StorageIcon />,
    gradient: "from-purple-50 to-pink-50",
    iconColor: "text-purple-100",
    accentColor: "from-purple-500 to-purple-400",
  },
];

const Features: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-8">
      {features.map((feature, index) => (
        <Link
          key={index}
          href={feature.link}
          className="group"
        >
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/20 h-full">
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            
            {/* Large Background Icon */}
            <div className={`absolute -top-4 -right-4 w-32 h-32 ${feature.iconColor} transition-colors duration-300 group-hover:${feature.iconColor.replace('100', '200')}`}>
              {feature.icon}
            </div>
            
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <div className="flex items-center gap-2">
                  <div className={`w-20 h-1 bg-gradient-to-r ${feature.accentColor} rounded-full transition-all duration-300 group-hover:w-32`}></div>
                  <div className={`w-2 h-2 bg-gradient-to-r ${feature.accentColor} rounded-full opacity-60 transition-all duration-300 group-hover:opacity-100`}></div>
                  <div className={`w-1 h-1 bg-gradient-to-r ${feature.accentColor} rounded-full opacity-40 transition-all duration-300 group-hover:opacity-80`}></div>
                </div>
              </div>
              
              {/* Description - enhanced visibility on hover */}
              <div className="opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 mb-6">
                <p className="text-gray-600 text-sm leading-relaxed break-keep">
                  {feature.description}
                </p>
              </div>
              
              <div className="flex items-center text-sm text-primary font-medium">
                시작하기
                <svg className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Features;
