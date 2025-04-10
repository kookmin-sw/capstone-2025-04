import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

// TODO: Replace with API call to fetch problem list when endpoint is available
// import { getProblemList, ProblemSummary } from '@/api/codingTestApi';
// const [testOptions, setTestOptions] = useState<ProblemSummary[]>([]);
// useEffect(() => { fetch list... }, []);

// 가상의 테스트 데이터 (API 구현 전까지 사용)
const testOptions = [
  {
    id: 1,
    title: "두 수의 합",
    description: "배열과 해시 테이블을 사용하여 target 합계를 찾는 문제",
    difficulty: "Easy", // Use English difficulty to match mock server
  },
  {
    id: 2,
    title: "배열에서 가장 큰 수 찾기",
    description: "주어진 배열에서 가장 큰 요소를 찾는 기본 문제",
    difficulty: "Easy",
  },
  {
    id: 3,
    title: "피보나치 수열 (DP)",
    description: "다이나믹 프로그래밍을 이용한 피보나치 수열 계산",
    difficulty: "Medium",
  },
  {
    id: 4,
    title: "문자열 뒤집기",
    description: "주어진 문자열을 뒤집는 기본 문자열 처리 문제",
    difficulty: "Easy",
  },
  {
    id: 5,
    title: "이진 탐색",
    description: "정렬된 배열에서 특정 값을 효율적으로 찾는 문제",
    difficulty: "Medium",
  },
  {
    id: 6,
    title: "최단 경로 (Dijkstra)",
    description: "가중치 그래프에서 시작 노드로부터의 최단 경로 찾기",
    difficulty: "Hard",
  },
];

const CodingTestSelectionPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>코딩 테스트 선택 | ALPACO</title>
        <meta name="description" content="코딩 테스트 선택 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
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
                        test.difficulty === "Easy"
                          ? "bg-green-100 text-green-800"
                          : test.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-800" // Changed Medium color for consistency
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {test.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">
                    {test.description}
                  </p>
                  <Link
                    href={{
                      pathname: "/coding-test/solve",
                      query: { id: test.id },
                    }}
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
    </>
  );
};

export default CodingTestSelectionPage;
