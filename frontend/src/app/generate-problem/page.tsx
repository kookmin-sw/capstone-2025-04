import React, { Suspense } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GenerateProblemClient from "./GenerateProblemClient"; // We'll create this next

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="text-center">
      <p className="text-lg font-semibold">페이지 로딩중...</p>
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
          <div className="max-w-5xl mx-auto p-8">
            <div className="flex items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                어떤 알고리즘 문제를 원하시나요?
              </h1>
            </div>
            <Suspense fallback={<LoadingSpinner />}>
              <GenerateProblemClient />
            </Suspense>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default GenerateProblemPage;
