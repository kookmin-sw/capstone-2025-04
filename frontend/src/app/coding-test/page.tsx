import React from "react";
import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

// Metadata for the page
export const metadata: Metadata = {
  title: "코딩 테스트 | ALPACO",
  description: "코딩 테스트 페이지",
};
const CodingTestPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow">
        <div className="max-w-5xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">코딩 테스트</h1>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              원하는 테스트 유형을 선택하세요
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              다양한 난이도와 주제별 코딩 테스트에 도전하고 실력을 향상시켜
              보세요. 알고리즘 실력을 키우고 면접 준비에 도움이 됩니다.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/coding-test/selection"
                className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition"
              >
                테스트 선택하기
              </Link>
              <Link
                href="/generate-problem"
                className="inline-block px-6 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition" // Changed background color for better visibility
              >
                AI로 문제 생성하기 🤖
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestPage;
