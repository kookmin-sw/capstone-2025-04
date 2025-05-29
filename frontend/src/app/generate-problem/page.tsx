import React, { Suspense } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GenerateProblemClient from "./GenerateProblemClient"; // We'll create this next

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="text-center">
      <p className="text-lg font-semibold text-gray-700">AI가 당신만의 문제를 준비하고 있어요...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-4"></div>
    </div>
  </div>
);

const GenerateProblemPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>문제 생성 | ALPACO</title>
        <meta name="description" content="LLM 기반 코딩 문제 생성 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          <div className="min-h-full flex flex-col justify-center py-8">
            <div className="max-w-6xl mx-auto p-6 sm:p-8 w-full">
              {/* Enhanced Header Section */}
              <div className="text-center mb-10">
                <div className="relative">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                    어떤 알고리즘 문제를 만들어볼까요?
                  </h1>
                </div>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  AI가 당신만을 위한 맞춤형 알고리즘 문제를 실시간으로 생성합니다.<br />
                  원하는 유형과 난이도를 선택하고 즉시 도전해보세요!
                </p>
              </div>
              <Suspense fallback={<LoadingSpinner />}>
                <GenerateProblemClient />
              </Suspense>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default GenerateProblemPage;
