import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

const TermsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>이용약관 | ALPACO</title>
        <meta name="description" content="ALPACO 이용약관" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          <div className="max-w-5xl mx-auto p-12">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">이용약관</h1>
              <Link
                href="/"
                className="px-4 py-2 border border-gray-300 rounded-md transition hover:bg-gray-100"
              >
                홈으로
              </Link>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                  이용약관
                </h2>
                <p className="mb-4 text-gray-600">
                  약관
                  {/* 추가적인 약관 내용을 여기에 계속해서 추가할 수 있습니다 */}
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TermsPage;
