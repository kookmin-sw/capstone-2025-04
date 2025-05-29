// frontend/src/components/Features.tsx
"use client";
import React from "react";
import Link from "next/link";

interface Feature {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

// Icon Components
const CommunityIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12.75c1.63 0 3.07.39 4.24.9c1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73c1.17-.52 2.61-.91 4.24-.91zM4 13c1.1 0 2-.9 2-2c0-1.1-.9-2-2-2s-2 .9-2 2c0 1.1.9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1c-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM20 13c1.1 0 2-.9 2-2c0-1.1-.9-2-2-2s-2 .9-2 2c0 1.1.9 2 2 2zm1.13 1.1c-.37-.06-.74-.1-1.13-.1c-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 16 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29zM12 6c1.66 0 3 1.34 3 3c0 1.66-1.34 3-3 3s-3-1.34-3-3c0-1.66 1.34-3 3-3z"/>
  </svg>
);

const CodingIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
  </svg>
);

const StorageIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
  </svg>
);

const features: Feature[] = [
  {
    title: "커뮤니티",
    description: "다양한 개발 문제를 공유하고 사용자들과 소통하세요.",
    link: "/community",
    icon: <CommunityIcon />,
  },
  {
    title: "코딩 테스트",
    description: "원하는 난이도의 LLM 기반 개인 맞춤형 문제를 제공합니다.",
    link: "/coding-test",
    icon: <CodingIcon />,
  },
  {
    title: "내 저장소",
    description:
      "LLM이 생성한 문제를 저장하고 언제든지 다시 도전할 수 있습니다.",
    link: "/storage",
    icon: <StorageIcon />,
  },
];

const Features: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8  w-full mt-8">
      {features.map((feature, index) => (
        <Link
          key={index}
          href={feature.link}
          className="no-underline text-inherit transition-transform duration-300 ease-in-out block hover:translate-y-[-5px]"
        >
          <div className="bg-white px-8 py-16 rounded-lg shadow-sm h-full w-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary hover:translate-y-[-6px]">
            <h3 className="text-2xl font-semibold mb-4 text-primary relative flex items-center gap-3">
              {feature.icon}
              <span>{feature.title}</span>
            </h3>
            <hr className="border-t-4 border-primary my-4 w-1/12" />
            <p className="text-gray-600 leading-relaxed flex-grow break-keep">
              {feature.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Features;
