// frontend/src/components/Features.tsx
"use client";
import React from "react";
import Link from "next/link";

interface Feature {
  title: string;
  description: string;
  link: string;
}

const features: Feature[] = [
  {
    title: "커뮤니티",
    description: "다양한 개발 문제를 공유하고 사용자들과 소통하세요.",
    link: "/community",
  },
  {
    title: "코딩 테스트",
    description: "원하는 난이도의 LLM 기반 개인 맞춤형 문제를 제공합니다.",
    link: "/coding-test",
  },
  {
    title: "내 저장소",
    description:
      "LLM이 생성한 문제를 저장하고 언제든지 다시 도전할 수 있습니다.",
    link: "/storage",
  },
];

const Features: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto max-w-6xl px-4 mt-8">
      {features.map((feature, index) => (
        <Link
          key={index}
          href={feature.link}
          className="no-underline text-inherit transition-transform duration-300 ease-in-out block hover:translate-y-[-5px]"
        >
          <div className="bg-white p-8 border border-gray-300 rounded-lg shadow-md h-full w-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary hover:translate-y-[-6px]">
            <h3 className="text-2xl font-semibold mb-4 text-primary relative after:content-[''] after:absolute after:bottom-[-0.5rem] after:left-0 after:w-10 after:h-0.5 after:bg-primary after:rounded-sm">
              {feature.title}
            </h3>
            <p className="text-gray-600 leading-relaxed flex-grow">
              {feature.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default Features;
