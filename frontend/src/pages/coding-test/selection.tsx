import React from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              코딩 테스트 선택
            </h1>
            <Link
              href="/coding-test"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              뒤로가기
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testOptions.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {test.title}
                  </h2>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {test.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 mb-6">{test.description}</p>
                <Link
                  href={`/coding-test/progress?id=${test.id}`}
                  className="inline-block w-full text-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
