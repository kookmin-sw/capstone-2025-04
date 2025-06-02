"use client";
import React, { useState } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

// FAQ 항목 타입 정의
type FAQItem = {
  question: string;
  answer: string;
};

// 가상의 FAQ 데이터
const faqItems: FAQItem[] = [
  {
    question: "ALPACO는 어떤 서비스인가요?",
    answer:
      "ALPACO는 클라우드 기반 LLM을 활용한 개인 맞춤형 코딩 문제와 함께 개발자로 성장할 수 있는 환경을 제공하는 서비스입니다. 알고리즘 학습, 코딩 테스트 준비, 개발 지식 공유 등을 할 수 있습니다.",
  },
  {
    question: "무료로 사용할 수 있나요?",
    answer: "현재 제작중인 서비스이므로, 무료로 제공됩니다!",
  },
  {
    question: "코딩 테스트는 어떤 언어를 지원하나요?",
    answer:
      "현재 Python 언어를 지원하고 있으며, 지속적으로 지원 언어를 확대해 나갈 예정입니다.",
  },
  {
    question: "문제 난이도는 어떻게 결정되나요?",
    answer:
      "문제 난이도는 알고리즘 복잡도, 필요한 지식 수준, 기존 유사 문제의 통계 등을 종합적으로 고려하여 결정됩니다. 사용자의 학습 데이터가 쌓일수록 더 개인화된 난이도 조정이 이루어집니다.",
  },
  {
    question: "내 코드는 어떻게 저장되나요?",
    answer:
      "사용자가 작성한 코드는 사용자의 로컬 머신에 안전하게 저장됩니다. 내 저장소 기능을 통해 언제든지 이전에 작성한 코드를 확인하고 수정할 수 있습니다.",
  },
];

const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <>
      <Head>
        <title>FAQ / 문의 | ALPACO</title>
        <meta name="description" content="ALPACO FAQ 및 문의 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          <div className="max-w-5xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                자주 묻는 질문 (FAQ)
              </h1>
              <Link
                href="/"
                className="px-4 py-2 border border-gray-300 rounded-md transition hover:bg-gray-100"
              >
                홈으로
              </Link>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
                  >
                    <span className="font-medium text-gray-900">
                      {item.question}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        activeIndex === index ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {activeIndex === index && (
                    <div className="px-6 py-4 bg-gray-50 text-gray-600">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">
                문의하기
              </h2>
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">GitHub 이슈로 문의해주세요</h3>
                      <p className="text-blue-700 mb-4">
                        ALPACO 프로젝트에 대한 문의사항, 버그 리포트, 기능 제안 등은 GitHub 저장소의 Issue 기능을 이용해주세요.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-blue-900 mb-1">이슈 작성 시 포함해주세요:</h4>
                          <ul className="text-sm text-blue-700 space-y-1 ml-4">
                            <li>• 문의 유형 (버그 리포트, 기능 요청, 질문 등)</li>
                            <li>• 상세한 문제 설명 또는 요청 내용</li>
                            <li>• 재현 단계 (버그의 경우)</li>
                            <li>• 사용 환경 (브라우저, 운영체제 등)</li>
                          </ul>
                        </div>
                        <Link
                          href="https://github.com/kookmin-sw/capstone-2025-04/issues/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          GitHub 이슈 작성하기
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">이메일 문의</h3>
                  <p className="text-gray-600 mb-3">
                    긴급한 문의사항이나 개인적인 문의는 이메일로 연락주세요.
                  </p>
                  <a 
                    href="mailto:pwh9882@kookmin.ac.kr"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    pwh9882@kookmin.ac.kr
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FAQPage;
