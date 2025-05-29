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
              <form>
                <div className="mb-4">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    이름
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    이메일
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    문의 주제
                  </label>
                  <select
                    id="subject"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">주제를 선택하세요</option>
                    <option value="service">서비스 이용 문의</option>
                    <option value="technical">기술적 문제</option>
                    <option value="billing">결제 관련 문의</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    문의 내용
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="문의 내용을 상세히 적어주세요"
                    required
                  ></textarea>
                </div>
                <div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition"
                  >
                    문의 제출하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FAQPage;
