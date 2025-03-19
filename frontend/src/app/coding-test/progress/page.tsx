"use client";
import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CodeEditor from "@/components/CodeEditor";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const CodingTestProgressPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<
    "python" | "javascript" | "java" | "cpp"
  >("python");

  // State for resizable layout
  const [isResizing, setIsResizing] = useState(false);
  const [problemPanelWidth, setProblemPanelWidth] = useState(40); // 40%
  const resizableContainerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

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

  // Handle resize functionality
  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isResizing || !resizableContainerRef.current) return;

      const containerRect =
        resizableContainerRef.current.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limit min/max widths
      if (newWidth >= 20 && newWidth <= 80) {
        setProblemPanelWidth(newWidth);

        // Update handle position
        if (handleRef.current) {
          handleRef.current.style.left = `${newWidth}%`;
        }
      }
    };

    const stopResize = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
    }

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }, [isResizing]);

  // Apply styles for cursor during resizing
  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, [isResizing]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 진행 중 | ALPACO</title>
        <meta name="description" content="코딩 테스트 진행 페이지" />
      </Head>

      <Header />

      <main className="flex-grow flex flex-col">
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">문제 풀이</h1>
              <Link
                href="/coding-test/selection"
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
          </div>

          <div
            className="flex flex-1 relative h-[calc(100vh-12rem)]"
            ref={resizableContainerRef}
          >
            <div
              className="overflow-y-auto p-6 bg-white border-r border-gray-200"
              style={{ flex: `0 0 ${problemPanelWidth}%` }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                배열에서 가장 큰 수 찾기
              </h2>
              <p className="text-gray-600 mb-6">
                정수 배열이 주어졌을 때, 그 배열에서 가장 큰 수를 찾아 반환하는
                함수를 작성하세요.
              </p>
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-700 mb-2">
                  입력 예시:
                </h3>
                <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-sm">
                  5 1 3 5 2 4
                </pre>
                <h3 className="text-md font-medium text-gray-700 mt-4 mb-2">
                  출력 예시:
                </h3>
                <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-sm">
                  5
                </pre>
              </div>

              <div>
                <label
                  htmlFor="language-select"
                  className="block text-md font-medium text-gray-700 mb-2"
                >
                  언어 선택:
                </label>
                <select
                  id="language-select"
                  value={language}
                  onChange={handleLanguageChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  aria-label="프로그래밍 언어 선택"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
              </div>
            </div>

            <div
              ref={handleRef}
              className={`absolute top-0 h-full w-1 bg-gray-300 hover:bg-primary cursor-col-resize z-10 ${
                isResizing ? "bg-primary" : ""
              }`}
              onMouseDown={startResize}
              style={{ left: `${problemPanelWidth}%` }}
            />

            <div className="flex-1 flex flex-col">
              <div className="flex-1 h-full">
                <CodeEditor language={language} onChange={handleCodeChange} />
              </div>
              <div className="p-4 border-t border-gray-200 bg-white">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition ml-auto block"
                >
                  채점하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestProgressPage;
