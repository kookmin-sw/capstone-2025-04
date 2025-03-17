import React from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";

const CodingTestPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 | ALPACO</title>
        <meta name="description" content="코딩 테스트 페이지" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">코딩 테스트</h1>
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              뒤로가기
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              원하는 테스트 유형을 선택하세요
            </h2>
            <p className="text-gray-600 mb-6">
              다양한 난이도와 주제별 코딩 테스트에 도전하고 실력을 향상시켜
              보세요.
            </p>
            <Link
              href="/coding-test/selection"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              테스트 선택하기
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestPage;
