import React, { useState } from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import CodeEditor from "../../components/CodeEditor";
import Link from "next/link";
import { useRouter } from "next/router";

const CodingTestProgressPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<
    "python" | "javascript" | "java" | "cpp"
  >("python");

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as "python" | "javascript" | "java" | "cpp");
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  const handleSubmit = () => {
    // 실제 구현에서는 코드를 백엔드로 전송하고 채점 결과를 받아옵니다
    console.log("Submitting code:", code);
    router.push(`/coding-test/result?id=${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 진행 중 | ALPACO</title>
        <meta name="description" content="코딩 테스트 진행 페이지" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">문제 풀이</h1>
            <Link
              href="/coding-test/selection"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              뒤로가기
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              배열에서 가장 큰 수 찾기
            </h2>
            <p className="text-gray-600 mb-4">
              정수 배열이 주어졌을 때, 그 배열에서 가장 큰 수를 찾아 반환하는
              함수를 작성하세요.
            </p>
            <div className="bg-gray-50 p-4 rounded border mb-6">
              <h3 className="font-medium text-gray-800 mb-2">입력 예시:</h3>
              <pre className="bg-gray-100 p-2 rounded">
                5
                <br />1 3 5 2 4
              </pre>
              <h3 className="font-medium text-gray-800 my-2">출력 예시:</h3>
              <pre className="bg-gray-100 p-2 rounded">5</pre>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">언어 선택:</label>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="w-full md:w-1/3 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <CodeEditor language={language} onChange={handleCodeChange} />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              채점하기
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestProgressPage;
