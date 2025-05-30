import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import GenerateProblemClient from "./GenerateProblemClient";

const LoadingFallback = () => (
  <LoadingSpinner message="문제 생성 도구를 불러오는 중..." />
);

export default function GenerateProblemPage() {
  return (
    <>
      <Head>
        <title>문제 생성 | ALPACO</title>
        <meta name="description" content="AI를 활용한 알고리즘 문제 생성" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        
        <main className="flex-grow flex items-center justify-center">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                어떤 알고리즘 문제를 원하시나요?
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                AI를 활용하여 맞춤형 알고리즘 문제를 생성해보세요
              </p>
            </div>
            <React.Suspense fallback={<LoadingFallback />}>
              <GenerateProblemClient />
            </React.Suspense>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
