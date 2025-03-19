import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

// 가상의 테스트 데이터
const testOptions = [
  {
    id: 1,
    title: "알고리즘 기초",
    description: "배열, 문자열, 해시 등 기본적인 자료구조를 활용한 문제",
    difficulty: "초급",
  },
  {
    id: 2,
    title: "다이나믹 프로그래밍",
    description: "DP를 이용한 최적화 문제 풀이",
    difficulty: "중급",
  },
  {
    id: 3,
    title: "그래프 탐색",
    description: "BFS, DFS를 활용한 그래프 문제",
    difficulty: "중급",
  },
];

const CodingTestSelectionPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 선택 | ALPACO</title>
        <meta name="description" content="코딩 테스트 선택 페이지" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className="max-w-5xl mx-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              코딩 테스트 선택
            </h1>
            <Link
              href="/coding-test"
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testOptions.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden p-6 flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {test.title}
                  </h2>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      test.difficulty === "초급"
                        ? "bg-green-100 text-green-800"
                        : test.difficulty === "중급"
                        ? "bg-primary/10 text-primary-hover"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {test.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 mb-6 text-sm">{test.description}</p>
                <Link
                  href={`/coding-test/progress?id=${test.id}`}
                  className="inline-block w-full text-center px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition mt-auto"
                >
                  시작하기
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestSelectionPage;
