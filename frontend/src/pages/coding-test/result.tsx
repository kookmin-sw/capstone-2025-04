import React from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import { useRouter } from "next/router";

const CodingTestResultPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 결과 | ALPACO</title>
        <meta name="description" content="코딩 테스트 결과 페이지" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">채점 결과</h1>
            <Link
              href={`/coding-test/progress?id=${id}`}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              뒤로가기
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div className="flex justify-between items-center mb-6 pb-6 border-b">
              <h2 className="text-2xl font-semibold text-gray-800">
                배열에서 가장 큰 수 찾기
              </h2>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">
                  {testResult.score}/100
                </div>
                <div className="text-gray-500">점수</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-500 mb-1">실행 시간</div>
                <div className="text-xl font-semibold">
                  {testResult.executionTime}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-500 mb-1">메모리 사용량</div>
                <div className="text-xl font-semibold">
                  {testResult.memoryUsage}
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-4">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {testCase.input}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {testCase.expected}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {testCase.actual}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            testCase.result === "성공"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
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
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                커뮤니티에 올리기
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestResultPage;
