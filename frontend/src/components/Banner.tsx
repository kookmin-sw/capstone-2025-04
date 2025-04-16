// frontend/src/components/Banner.tsx
"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";

const Banner: React.FC = () => {
  return (
    <motion.section
      className="bg-white rounded-lg relative overflow-hidden flex flex-col md:flex-row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full flex flex-col items-start space-between max-w-7xl">
        <div className="flex flex-col items-start flex-1">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-4 text-gray-900 relative inline-block break-keep "
          >
            개발자로 성장하는 여정,{" "}
            <span className="text-primary font-semibold">ALPACO</span>와 함께
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg text-gray-600 break-keep"
          >
            클라우드 기반 LLM을 활용한 개인 맞춤형 문제와 함께
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg text-gray-600 break-keep"
          >
            체계적으로 개발자로 성장할 수 있는 환경을 제공합니다.
          </motion.p>
        </div>
        <motion.div
          className="flex gap-4 items-start pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Link
            href="/coding-test"
            className="bg-primary text-white py-2 px-4 rounded-md font-medium transition-colors duration-200 hover:bg-primary-hover"
          >
            테스트 시작하기
          </Link>
          <Link
            href="https://kookmin-sw.github.io/capstone-2025-04/"
            className="bg-transparent border border-gray-300 py-2 px-4 rounded-md font-medium transition-all duration-200 hover:bg-gray-100"
          >
            더 알아보기
          </Link>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Image
          src="/main-banner-coding-5.svg"
          alt="Banner"
          width={420}
          height={420}
          priority
          className="mr-16"
        />
      </motion.div>
    </motion.section>
  );
};

export default Banner;
