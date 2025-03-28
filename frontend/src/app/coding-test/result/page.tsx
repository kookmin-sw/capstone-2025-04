"use client";
import React, { Suspense } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Extract the content that uses useSearchParams into its own component
const CodingTestResultContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  // 가상의 테스트 결과 데이터
  const testResult = {
    success: true,
    score: 90,
    executionTime: "0.05s",
    memoryUsage: "5.2MB",
    testCases: [
      {
        id: 1,
        input: "5\n1 3 5 2 4",
        expected: "5",
        actual: "5",
        result: "성공",
      },
      { id: 2, input: "3\n7 2 9", expected: "9", actual: "9", result: "성공" },
      {
        id: 3,
        input: "4\n10 20 30 40",
        expected: "40",
        actual: "40",
        result: "성공",
      },
    ],
  };

  const handleShareToCommunity = () => {
    router.push("/community/create?fromTest=true&id=" + id);
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">채점 결과</h1>
        <Link
          href={`/coding-test/progress?id=${id}`}
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

      <div className="bg-white rounded-lg shadow-sm overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            배열에서 가장 큰 수 찾기
          </h2>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {testResult.score}/100
            </div>
            <div className="text-sm text-gray-500">점수</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500 mb-1">실행 시간</div>
            <div className="text-lg font-medium text-gray-900">
              {testResult.executionTime}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-500 mb-1">메모리 사용량</div>
            <div className="text-lg font-medium text-gray-900">
              {testResult.memoryUsage}
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          테스트 케이스 결과
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  입력
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기대 출력
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  실제 출력
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  결과
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testResult.testCases.map((testCase) => (
                <tr key={testCase.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {testCase.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {testCase.input}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {testCase.expected}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {testCase.actual}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={
                        testCase.result === "성공"
                          ? "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          : "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                      }
                    >
                      {testCase.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleShareToCommunity}
            className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition"
          >
            커뮤니티에 올리기
          </button>
        </div>
      </div>
    </div>
  );
};

// Main page component wrapping the content in Suspense
const CodingTestResultPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 결과 | ALPACO</title>
        <meta name="description" content="코딩 테스트 결과 페이지" />
      </Head>

      <Header />

      <main className="flex-grow">
        <Suspense fallback={<div>Loading...</div>}>
          <CodingTestResultContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestResultPage;
