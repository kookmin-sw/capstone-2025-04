"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CodeEditor from "@/components/CodeEditor";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import {
  getProblemById,
  ProblemDetail,
  ProblemExample,
} from "@/api/codingTestApi"; // Import API
import { toast } from "sonner"; // Import toast for errors

// Create a separate component to handle search params
const CodingTestContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthenticator((context) => [context.user]);
  console.log("user: ", user); // Debugging line
  const id = searchParams.get("id");
  const [problemDetails, setProblemDetails] = useState<ProblemDetail | null>(
    null
  );
  const [isLoadingProblem, setIsLoadingProblem] = useState(true);
  const [errorProblem, setErrorProblem] = useState<string | null>(null);
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
    // TODO: Implement actual code submission API call here
    // const submissionResult = await submitCode(id, code, language);
    // router.push(`/coding-test/result?submissionId=${submissionResult.id}`);
    console.log("Submitting code (mock):", code, language);
    // For now, navigate directly to the mock result page
    router.push(`/coding-test/result?id=${id}`);
  };

  // Handle resize functionality
  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  // Fetch problem details
  useEffect(() => {
    if (id) {
      const fetchProblem = async () => {
        setIsLoadingProblem(true);
        setErrorProblem(null);
        try {
          const data = await getProblemById(id);
          setProblemDetails(data);
          // Optionally set initial code template based on problem/language if needed
        } catch (err) {
          console.error("Failed to fetch problem:", err);
          const errorMsg =
            err instanceof Error
              ? err.message
              : "문제를 불러오는데 실패했습니다.";
          setErrorProblem(errorMsg);
          toast.error(errorMsg);
        } finally {
          setIsLoadingProblem(false);
        }
      };
      fetchProblem();
    } else {
      // Handle case where ID is missing
      setErrorProblem("URL에 문제 ID가 없습니다.");
      toast.error("URL에 문제 ID가 없습니다.");
      setIsLoadingProblem(false);
    }
  }, [id]);

  // Handle resize functionality
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

  // Update CSS variables when panel width changes
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--problem-panel-width",
      `${problemPanelWidth}%`
    );
    document.documentElement.style.setProperty(
      "--editor-panel-width",
      `${100 - problemPanelWidth}%`
    );
  }, [problemPanelWidth]);

  // Loading State
  if (isLoadingProblem) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">문제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (errorProblem) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">오류 발생</p>
          <p className="text-red-500 text-sm mt-1">{errorProblem}</p>
          <Link
            href="/coding-test/selection"
            className="mt-4 inline-block px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            문제 선택으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Problem Not Found (or ID was invalid)
  if (!problemDetails) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-gray-500">
        문제를 찾을 수 없습니다 (ID: {id}).
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col">
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {problemDetails.title || "문제 풀이"}
            </h1>
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
          <div className="overflow-y-auto p-6 bg-white border-r border-gray-200 w-[var(--problem-panel-width)]">
            {/* Problem Details Section */}
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {problemDetails.title}
            </h2>
            <span
              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-4 ${
                problemDetails.difficulty === "Easy"
                  ? "bg-green-100 text-green-800"
                  : problemDetails.difficulty === "Medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {problemDetails.difficulty}
            </span>

            <div className="prose prose-sm max-w-none text-gray-700 mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-1">
                문제 설명
              </h3>
              <p className="whitespace-pre-wrap">
                {problemDetails.description}
              </p>

              {problemDetails.constraints && (
                <>
                  <h3 className="text-md font-medium text-gray-800 mt-4 mb-1">
                    제약 조건
                  </h3>
                  <p className="whitespace-pre-wrap">
                    {problemDetails.constraints}
                  </p>
                </>
              )}

              {problemDetails.input_format && (
                <>
                  <h3 className="text-md font-medium text-gray-800 mt-4 mb-1">
                    입력 형식
                  </h3>
                  <p className="whitespace-pre-wrap">
                    {problemDetails.input_format}
                  </p>
                </>
              )}

              {problemDetails.output_format && (
                <>
                  <h3 className="text-md font-medium text-gray-800 mt-4 mb-1">
                    출력 형식
                  </h3>
                  <p className="whitespace-pre-wrap">
                    {problemDetails.output_format}
                  </p>
                </>
              )}
            </div>

            {/* Examples Section */}
            {problemDetails.examples && problemDetails.examples.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-800 mb-2">
                  입출력 예제
                </h3>
                {problemDetails.examples.map(
                  (example: ProblemExample, index: number) => (
                    <div key={index} className="mb-3 last:mb-0">
                      <h4 className="text-sm font-semibold text-gray-600 mb-1">
                        예제 {index + 1}
                      </h4>
                      <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-xs mb-1">
                        <strong className="font-medium">Input:</strong>{" "}
                        {example.input}
                      </pre>
                      <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs">
                        <strong className="font-medium">Output:</strong>{" "}
                        {example.output}
                      </pre>
                    </div>
                  )
                )}
              </div>
            )}

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
            className={`absolute top-0 h-full w-3 left-[var(--problem-panel-width)] -translate-x-1/2 z-10 cursor-col-resize flex items-center justify-center ${
              isResizing ? "opacity-80" : "opacity-40 hover:opacity-60"
            } bg-[var(--secondary-color)] transition-opacity`}
            onMouseDown={startResize}
          >
            <div className="h-24 flex flex-col justify-center items-center space-y-2 bg-[var(--secondary-color)] rounded-full p-1">
              <div className="w-[2px] h-8 bg-[var(--white)]"></div>
              <div className="w-[2px] h-8 bg-[var(--white)]"></div>
            </div>
          </div>

          <div className="flex-1 flex flex-col w-[var(--editor-panel-width)]">
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
    </div>
  );
};

// Main component with suspense boundary
const CodingTestSolvePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 진행 중 | ALPACO</title>
        <meta name="description" content="코딩 테스트 진행 페이지" />
      </Head>

      <Header />

      <main className="flex-grow flex flex-col">
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <CodingTestContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default CodingTestSolvePage;
