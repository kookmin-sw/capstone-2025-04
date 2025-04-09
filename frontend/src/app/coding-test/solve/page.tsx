"use client";
import React, { useState, useEffect, Suspense, ChangeEvent } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CodeEditor from "@/components/CodeEditor";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  getProblemById,
  ProblemDetail,
  ProblemExample,
} from "@/api/codingTestApi";
import { toast } from "sonner";

// --- Main Content Component ---
const CodingTestContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthenticator((context) => [context.user]);
  console.log("user: ", user);
  const id = searchParams.get("id");

  // State
  const [problemDetails, setProblemDetails] = useState<ProblemDetail | null>(
    null
  );
  const [isLoadingProblem, setIsLoadingProblem] = useState(true);
  const [errorProblem, setErrorProblem] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<
    "python" | "javascript" | "java" | "cpp"
  >("python");
  const [editorResetKey, setEditorResetKey] = useState(0); // Key to force editor reset
  // --- Handlers ---
  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as "python" | "javascript" | "java" | "cpp");
    setEditorResetKey((prev) => prev + 1); // Reset editor when language changes
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  const handleResetCode = () => {
    setEditorResetKey((prev) => prev + 1);
  };

  const handleSubmit = () => {
    console.log("Submitting code (mock):", code, language);
    router.push(`/coding-test/result?id=${id}`);
  };

  // --- Effects ---

  // Fetch problem details
  useEffect(() => {
    if (id) {
      const fetchProblem = async () => {
        setIsLoadingProblem(true);
        setErrorProblem(null);
        try {
          const data = await getProblemById(id);
          setProblemDetails(data);
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
      setErrorProblem("URL에 문제 ID가 없습니다.");
      toast.error("URL에 문제 ID가 없습니다.");
      setIsLoadingProblem(false);
    }
  }, [id]);

  // --- Render Logic ---
  if (isLoadingProblem) {
    return (
      <div className="flex justify-center items-center flex-grow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">문제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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

  if (!problemDetails) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-gray-500">
        문제를 찾을 수 없습니다 (ID: {id}).
      </div>
    );
  }

  // --- Main Layout ---
  return (
    // Use theme text
    <div className="flex h-[calc(100vh-var(--header-height,64px)-var(--footer-height,64px))] flex-grow flex-col">
      {/* Top Bar */}
      {/* Use theme background/border */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        {/* Use theme text */}
        <h1 className="truncate text-xl font-semibold text-gray-800">
          {problemDetails.title || "문제 풀이"}
        </h1>
        <div className="flex items-center space-x-4">
          <Link
            href="/coding-test/selection"
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 transition"
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
              className="mr-1"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            목록으로
          </Link>
        </div>
      </div>

      {/* VSCode-like Layout: [Problem | Editor / Results | Chat] */}
      <PanelGroup direction="horizontal" className="flex-grow">
        {/* Left Panel: Problem Description */}
        <Panel
          defaultSize={30}
          minSize={20}
          collapsible={true}
          collapsedSize={0}
          order={1}
          id="problem-panel"
          className="bg-white border-r border-gray-200"
        >
          <ProblemPanel problemDetails={problemDetails} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary" />

        {/* Center Panel: Editor + Results */}
        <Panel
          defaultSize={45}
          minSize={30}
          order={2}
          id="editor-results-panel"
        >
          <PanelGroup direction="vertical">
            {/* Top: Editor */}
            <Panel
              defaultSize={65}
              minSize={20}
              id="editor-panel"
              className="bg-gray-50"
            >
              <EditorPanel
                language={language}
                handleLanguageChange={handleLanguageChange}
                handleCodeChange={handleCodeChange}
                handleSubmit={handleSubmit}
                onResetClick={handleResetCode}
                editorKey={editorResetKey}
              />
            </Panel>
            <PanelResizeHandle className="h-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary" />
            {/* Bottom: Results */}
            <Panel
              defaultSize={35}
              minSize={10}
              collapsible={true}
              collapsedSize={0}
              id="results-panel"
              className="bg-white"
            >
              <ResultsPanel problemDetails={problemDetails} />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary" />

        {/* Right Panel: Chatbot */}
        <Panel
          defaultSize={25}
          minSize={15}
          collapsible={true}
          collapsedSize={0}
          order={3}
          id="chatbot-panel"
          className="bg-gray-50 border-l border-gray-200"
        >
          <RightSidebar />
        </Panel>
      </PanelGroup>
    </div>
  );
};

// --- Child Components ---

// Problem Panel (Left)
const ProblemPanel: React.FC<{ problemDetails: ProblemDetail }> = ({
  problemDetails,
}) => {
  // Added dark mode text colors
  return (
    // Example Tests Content
    <div className="p-4 overflow-y-auto h-full text-gray-900">
      <h2 className="text-xl font-semibold mb-2">{problemDetails.title}</h2>
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
      {/* Added dark mode prose styles */}
      {/* Removed dark:prose-invert and dark text color */}
      <div className="prose prose-sm max-w-none text-gray-700 mb-6">
        <h3 className="text-md font-medium text-gray-800 mb-1">문제 설명</h3>
        <p className="whitespace-pre-wrap">{problemDetails.description}</p>
        {problemDetails.constraints && (
          <>
            <h3 className="text-md font-medium text-gray-800 mt-4 mb-1">
              제약 조건
            </h3>
            <p className="whitespace-pre-wrap">{problemDetails.constraints}</p>
          </>
        )}
        {problemDetails.input_format && (
          <>
            <h3 className="text-md font-medium text-gray-800 mt-4 mb-1">
              입력 형식
            </h3>
            <p className="whitespace-pre-wrap">{problemDetails.input_format}</p>
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
                {/* Use light theme background and text */}
                <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-xs mb-1">
                  <strong className="font-medium text-gray-600">Input:</strong>{" "}
                  <span className="block mt-1 whitespace-pre-wrap">
                    {example.input}
                  </span>
                </pre>
                {/* Use light theme background and text */}
                <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs">
                  <strong className="font-medium text-gray-600">Output:</strong>{" "}
                  <span className="block mt-1 whitespace-pre-wrap">
                    {example.output}
                  </span>
                </pre>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

// Editor Panel (Center Top)
interface EditorPanelProps {
  language: "python" | "javascript" | "java" | "cpp";
  handleLanguageChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleCodeChange: (value: string) => void;
  handleSubmit: () => void;
  onResetClick: () => void;
  editorKey: number;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  language,
  handleLanguageChange,
  handleCodeChange,
  handleSubmit,
  onResetClick,
  editorKey,
}) => {
  return (
    <div className="flex flex-col h-full text-gray-900">
      {/* Editor Controls */}
      <div className="p-2 border-b border-gray-200 flex items-center space-x-4 flex-shrink-0">
        <div>
          <label htmlFor="language-select" className="sr-only">
            언어 선택:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={handleLanguageChange}
            className="p-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white text-gray-900"
            aria-label="프로그래밍 언어 선택"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>
        <button
          onClick={onResetClick}
          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
        >
          Reset
        </button>
        <div className="flex-grow"></div>
        <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100">
          Run Code
        </button>{" "}
        {/* TODO: Implement Run */}
        <button
          onClick={handleSubmit}
          className="px-4 py-1 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition"
        >
          Submit
        </button>
      </div>
      {/* Code Editor Wrapper */}
      <div className="flex-grow h-full overflow-hidden p-2">
        {" "}
        {/* Removed themed background, editor handles it */}
        <CodeEditor
          key={editorKey}
          language={language}
          onChange={handleCodeChange}
          // Assuming CodeEditor now uses global theme or has its own internal toggle
        />
      </div>
    </div>
  );
};

// Results Panel (Center Bottom)
type ResultsTab = "examples" | "custom" | "submission";

const ResultsPanel: React.FC<{ problemDetails: ProblemDetail }> = ({
  problemDetails,
}) => {
  const [activeTab, setActiveTab] = useState<ResultsTab>("examples");

  const renderTabContent = () => {
    switch (activeTab) {
      case "examples":
        return (
          <div className="mt-4 space-y-4">
            {problemDetails.examples?.length > 0 ? (
              problemDetails.examples.map((example, index) => (
                <div key={index} className="border border-gray-200 rounded p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Example {index + 1}
                  </h4>
                  <div className="space-y-2">
                    <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-xs">
                      <strong className="font-medium text-gray-600">
                        Input:
                      </strong>
                      <span className="block mt-1 whitespace-pre-wrap">
                        {example.input}
                      </span>
                    </pre>
                    <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs">
                      <strong className="font-medium text-gray-600">
                        Output:
                      </strong>
                      <span className="block mt-1 whitespace-pre-wrap">
                        {example.output}
                      </span>
                    </pre>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No examples provided.</p>
            )}
          </div>
        );
      case "custom":
        return (
          <div className="mt-4">
            <h4 className="text-md font-semibold mb-2 text-gray-800">
              Custom Input
            </h4>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono bg-white text-gray-900"
              rows={5}
              placeholder="Enter your custom input here..."
            ></textarea>
            <h4 className="text-md font-semibold mt-4 mb-2 text-gray-800">
              Output
            </h4>
            <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs min-h-[50px]">
              Run code to see output...
            </pre>
          </div>
        );
      case "submission":
        return (
          <div className="mt-4">
            <h4 className="text-md font-semibold mb-2 text-gray-800">
              Submission Result
            </h4>
            <p className="text-gray-500 text-sm">
              Submit your code to see the results against all test cases.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const getTabClasses = (tabName: ResultsTab) => {
    const base =
      "px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 focus:outline-none";
    // Adjust active/inactive colors for dark mode
    const active = "border-primary text-primary"; // Use light theme active colors
    const inactive =
      "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"; // Use light theme inactive/hover colors
    return `${base} ${activeTab === tabName ? active : inactive}`;
  };

  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200 text-gray-900">
      {/* Tab Triggers */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("examples")}
            className={getTabClasses("examples")}
            aria-current={activeTab === "examples" ? "page" : undefined}
          >
            Example Test Cases
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={getTabClasses("custom")}
            aria-current={activeTab === "custom" ? "page" : undefined}
          >
            Custom Input
          </button>
          <button
            onClick={() => setActiveTab("submission")}
            className={getTabClasses("submission")}
            aria-current={activeTab === "submission" ? "page" : undefined}
          >
            Submission Result
          </button>
        </nav>
      </div>
      {/* Tab Content */}
      <div className="p-4 flex-grow overflow-y-auto">{renderTabContent()}</div>
    </div>
  );
};

// Right Sidebar (Chatbot)
const RightSidebar: React.FC = () => {
  return (
    <div className="p-4 h-full flex flex-col text-gray-900">
      <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex-shrink-0 border-gray-200">
        AI Assistant
      </h3>
      <div className="flex-grow bg-gray-100 rounded p-2 mb-3 overflow-y-auto">
        <p className="text-sm text-gray-500">
          Chat messages will appear here...
        </p>
      </div>
      <textarea
        className="w-full p-2 border border-gray-300 rounded-md text-sm mb-2 flex-shrink-0 bg-white text-gray-900"
        rows={3}
        placeholder="Ask the AI assistant..."
      ></textarea>
      <button className="px-4 py-1 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition self-end flex-shrink-0">
        Send
      </button>
    </div>
  );
};

// --- Main Page Component ---
const CodingTestSolvePage: React.FC = () => {
  return (
    // Apply dark class to the root based on HTML element class
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>코딩 테스트 진행 중 | ALPACO</title>
        <meta name="description" content="코딩 테스트 진행 페이지" />
      </Head>
      <Header /> {/* Assuming Header adapts to dark mode */}
      <main className="flex-grow flex flex-col">
        <Suspense
          fallback={
            <div className="p-6 text-center flex-grow flex items-center justify-center text-gray-500">
              Loading Problem...
            </div>
          }
        >
          <CodingTestContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default CodingTestSolvePage;
