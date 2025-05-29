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
        <main className="flex-grow">
          <React.Suspense fallback={<LoadingFallback />}>
            <GenerateProblemClient />
          </React.Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
}
