// frontend/src/components/Banner.tsx
"use client";

import React from "react";

const Banner: React.FC = () => {
  return (
    <section className="bg-white rounded-lg py-12 px-4 text-center relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[5px] before:bg-primary">
      <div className="w-full px-4 mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 relative inline-block after:content-[''] after:absolute after:bottom-[-0.5rem] after:left-1/2 after:-translate-x-1/2 after:w-10 after:h-[3px] after:bg-primary after:rounded-md">
          개발자로 성장하는 여정,{" "}
          <span className="text-primary font-semibold">ALPACO</span>와 함께
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          클라우드 기반 LLM을 활용한 개인 맞춤형 문제와 함께
          <br />
          체계적으로 개발자로 성장할 수 있는 환경을 제공합니다.
        </p>
      </div>
    </section>
  );
};

export default Banner;
