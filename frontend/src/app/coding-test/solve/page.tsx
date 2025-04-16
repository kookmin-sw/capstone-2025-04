"use client";
import React, {
  useState,
  useEffect,
  Suspense,
  ChangeEvent,
  useRef,
  useMemo,
} from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CodeEditor from "@/components/CodeEditor";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

import type { ProblemDetailAPI } from "@/api/generateProblemApi";
import { toast } from "sonner";
import Chatbot from "@/components/Chatbot";
import { CODE_TEMPLATES } from "@/components/CodeEditor";
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleUpIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { getProblemById } from "@/api/problemApi";

// Constants for default panel sizes
const PROBLEM_DEFAULT_SIZE = 30;
const EDITOR_DEFAULT_SIZE = 45; // Base for vertical group
const CHATBOT_DEFAULT_SIZE = 25;
const RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL = 35; // Results panel size within its group

// Update the TestCase interface to be more type-safe
interface TestCase {
  input: string | number[] | Record<string, unknown>;
  output?: string | number | boolean | number[] | Record<string, unknown>;
  expected_output?:
    | string
    | number
    | boolean
    | number[]
    | Record<string, unknown>;
  description?: string;
  target_sum?: number;
  [key: string]: unknown; // Allow for additional properties with unknown type
}

// --- Main Content Component ---
const CodingTestContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthenticator((context) => [context.user]);
  console.log("user: ", user);
  const id = searchParams.get("id");

  // State
  const [problemDetails, setProblemDetails] = useState<ProblemDetailAPI | null>(
    null
  );
  const [isLoadingProblem, setIsLoadingProblem] = useState(true);
  const [errorProblem, setErrorProblem] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<
    "python" | "javascript" | "java" | "cpp"
  >("python");
  const [editorResetKey, setEditorResetKey] = useState(0);
  const hasLoadedInitialCode = useRef(false);

  // State for panel collapse status
  const [isProblemCollapsed, setIsProblemCollapsed] = useState(false);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);
  const [isChatbotCollapsed, setIsChatbotCollapsed] = useState(false);

  // Refs for panels
  const problemPanelRef = useRef<ImperativePanelHandle>(null);
  const resultsPanelRef = useRef<ImperativePanelHandle>(null);
  const chatbotPanelRef = useRef<ImperativePanelHandle>(null);

  // Generate unique key for editor code local storage
  const editorLocalStorageKey = useMemo(() => {
    return problemDetails?.problemId
      ? `editorCode_${problemDetails.problemId}_${language}`
      : null;
  }, [problemDetails?.problemId, language]);

  // --- Handlers ---
  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as "python" | "javascript" | "java" | "cpp";
    hasLoadedInitialCode.current = false;
    setLanguage(newLang);
  };

  const handleCodeChange = (value: string) => {
    if (value !== code) {
      setCode(value);
    }
  };

  const handleResetCode = () => {
    const defaultCode = CODE_TEMPLATES[language] || "";
    console.log(`Resetting code to template for ${language}`);
    setCode(defaultCode);
    setEditorResetKey((prev) => prev + 1);
    if (editorLocalStorageKey) {
      try {
        localStorage.setItem(editorLocalStorageKey, defaultCode);
        console.log(`Saved reset code to key: ${editorLocalStorageKey}`);
      } catch (error) {
        console.error("Failed to save reset code to localStorage:", error);
      }
    }
  };

  const handleSubmit = () => {
    console.log("Submitting code (mock):", code, language);
    router.push(`/coding-test/result?id=${id}`);
  };

  // --- Panel Toggle Functions ---
  const togglePanelToDefaultSize = (
    panelRef: React.RefObject<ImperativePanelHandle>,
    isCollapsed: boolean,
    defaultSize: number
  ) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (isCollapsed) {
      panel.expand();
      panel.resize(defaultSize);
    } else {
      panel.collapse();
    }
  };

  const togglePanelPreserveSize = (
    panelRef: React.RefObject<ImperativePanelHandle>,
    isCollapsed: boolean
  ) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (isCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  };

  const toggleProblemPanel = () => {
    if (problemPanelRef.current) {
      togglePanelToDefaultSize(
        problemPanelRef as React.RefObject<ImperativePanelHandle>,
        isProblemCollapsed,
        PROBLEM_DEFAULT_SIZE
      );
    }
  };
  const toggleResultsPanel = () => {
    if (resultsPanelRef.current) {
      togglePanelToDefaultSize(
        resultsPanelRef as React.RefObject<ImperativePanelHandle>,
        isResultsCollapsed,
        RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL
      );
    }
  };
  const toggleChatbotPanel = () => {
    if (chatbotPanelRef.current) {
      togglePanelToDefaultSize(
        chatbotPanelRef as React.RefObject<ImperativePanelHandle>,
        isChatbotCollapsed,
        CHATBOT_DEFAULT_SIZE
      );
    }
  };

  const toggleProblemPanelPreserveSize = () => {
    if (problemPanelRef.current) {
      togglePanelPreserveSize(
        problemPanelRef as React.RefObject<ImperativePanelHandle>,
        isProblemCollapsed
      );
    }
  };
  const toggleResultsPanelPreserveSize = () => {
    if (resultsPanelRef.current) {
      togglePanelPreserveSize(
        resultsPanelRef as React.RefObject<ImperativePanelHandle>,
        isResultsCollapsed
      );
    }
  };
  const toggleChatbotPanelPreserveSize = () => {
    if (chatbotPanelRef.current) {
      togglePanelPreserveSize(
        chatbotPanelRef as React.RefObject<ImperativePanelHandle>,
        isChatbotCollapsed
      );
    }
  };

  // --- Effects ---

  // Fetch problem details
  useEffect(() => {
    if (id) {
      const fetchProblem = async () => {
        setIsLoadingProblem(true);
        setErrorProblem(null);
        try {
          // getProblemById returns ProblemDetail which is ProblemDetailAPI
          const data: ProblemDetailAPI = await getProblemById(id);
          setProblemDetails(data);
          hasLoadedInitialCode.current = false;
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

  // Load editor code from Local Storage OR set template when key changes
  useEffect(() => {
    if (editorLocalStorageKey) {
      hasLoadedInitialCode.current = false;
      console.log(
        `Attempting to load/set editor code for key: ${editorLocalStorageKey}`
      );
      let initialCode = CODE_TEMPLATES[language] || "";
      try {
        const savedCode = localStorage.getItem(editorLocalStorageKey);
        if (savedCode !== null) {
          initialCode = savedCode;
          console.log(`Loaded saved code from localStorage.`);
        } else {
          console.log(`No saved code found, using template for ${language}.`);
        }
      } catch (error) {
        console.error("Failed to load code from localStorage:", error);
      }
      setCode(initialCode);
      hasLoadedInitialCode.current = true;
    }
  }, [editorLocalStorageKey, language]);

  // Save editor code to Local Storage whenever it changes (after initial load attempt)
  useEffect(() => {
    if (editorLocalStorageKey && hasLoadedInitialCode.current) {
      console.log(`Saving code to key: ${editorLocalStorageKey}`);
      try {
        localStorage.setItem(editorLocalStorageKey, code);
      } catch (error) {
        console.error("Failed to save code to localStorage:", error);
      }
    }
  }, [code, editorLocalStorageKey]);

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
    <div className="relative flex h-[calc(100vh-var(--header-height,64px)-var(--footer-height,64px))] flex-grow flex-col">
      {/* Top Bar */}
      {/* Use theme background/border */}
      <div className="flex flex-shrink-0  border-b border-gray-200 bg-white px-4 pt-3 pb-2">
        <div className="flex items-center justify-end w-full space-x-4">
          <Link
            href="/coding-test/selection"
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition"
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
      {/* Panel Toggle Buttons Container */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Left Panel Toggle */}
        {isProblemCollapsed && (
          <button
            onClick={toggleProblemPanel}
            className="pointer-events-auto absolute left-1 top-1/2 -translate-y-1/2 rounded border border-gray-300 bg-white p-1 text-gray-600 shadow-md hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Open Problem Panel"
            title="Open Problem Panel"
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </button>
        )}

        {/* Right Panel Toggle */}
        {isChatbotCollapsed && (
          <button
            onClick={toggleChatbotPanel}
            className="pointer-events-auto absolute right-1 top-1/2 -translate-y-1/2 rounded border border-gray-300 bg-white p-1 text-gray-600 shadow-md hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Open Chatbot Panel"
            title="Open Chatbot Panel"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <PanelGroup direction="horizontal" className="flex-grow">
        {/* Left Panel: Problem Description */}
        <Panel
          ref={problemPanelRef}
          defaultSize={PROBLEM_DEFAULT_SIZE}
          minSize={20}
          collapsible={true}
          collapsedSize={0}
          order={1}
          id="problem-panel"
          className="bg-white border-r border-gray-200"
          onCollapse={() => setIsProblemCollapsed(true)}
          onExpand={() => setIsProblemCollapsed(false)}
        >
          {!isProblemCollapsed && (
            <ProblemPanel problemDetails={problemDetails} />
          )}
        </Panel>
        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary" />

        {/* Center Panel: Editor + Results */}
        <Panel
          defaultSize={EDITOR_DEFAULT_SIZE}
          minSize={30}
          order={2}
          id="editor-results-panel"
        >
          <PanelGroup direction="vertical" className="relative h-full">
            {/* Top: Editor */}
            <Panel
              defaultSize={100 - RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL}
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
                codeValue={code}
                toggleProblemPanelPreserveSize={toggleProblemPanelPreserveSize}
                toggleResultsPanelPreserveSize={toggleResultsPanelPreserveSize}
                toggleChatbotPanelPreserveSize={toggleChatbotPanelPreserveSize}
                isProblemCollapsed={isProblemCollapsed}
                isResultsCollapsed={isResultsCollapsed}
                isChatbotCollapsed={isChatbotCollapsed}
              />
            </Panel>
            <PanelResizeHandle className="h-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary relative z-10" />
            {/* Bottom: Results */}
            <Panel
              ref={resultsPanelRef}
              defaultSize={RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL}
              minSize={10}
              collapsible={true}
              collapsedSize={0}
              id="results-panel"
              className="bg-white"
              onCollapse={() => setIsResultsCollapsed(true)}
              onExpand={() => setIsResultsCollapsed(false)}
            >
              {!isResultsCollapsed && problemDetails && (
                <ResultsPanel problemDetails={problemDetails} />
              )}
              {isResultsCollapsed && (
                <div className="h-full w-full bg-white"></div>
              )}

              {isResultsCollapsed && (
                <button
                  onClick={toggleResultsPanel}
                  className="pointer-events-auto absolute bottom-2 left-1/2 z-50 -translate-x-1/2 transform rounded border border-gray-300 bg-white p-1 text-gray-600 shadow-md hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Open Results Panel"
                  title="Open Results Panel"
                >
                  <ChevronDoubleUpIcon className="h-4 w-4" />
                </button>
              )}
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary" />

        {/* Right Panel: Chatbot */}
        <Panel
          ref={chatbotPanelRef}
          defaultSize={CHATBOT_DEFAULT_SIZE}
          minSize={15}
          collapsible={true}
          collapsedSize={0}
          order={3}
          id="chatbot-panel"
          className="bg-gray-50 border-l border-gray-200"
          onCollapse={() => setIsChatbotCollapsed(true)}
          onExpand={() => setIsChatbotCollapsed(false)}
        >
          {!isChatbotCollapsed && (
            <Chatbot problemDetails={problemDetails} userCode={code} />
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
};

// --- Child Components ---

// Problem Panel (Left)
const ProblemPanel: React.FC<{ problemDetails: ProblemDetailAPI }> = ({
  problemDetails,
}) => {
  // Determine if constraints and examples are already embedded in the description
  const descriptionContent =
    problemDetails.targetLanguage && problemDetails.description_translated
      ? problemDetails.description_translated
      : problemDetails.description;

  // Check if description already contains constraints and examples sections
  const hasEmbeddedConstraints =
    descriptionContent.toLowerCase().includes("제약 조건") ||
    descriptionContent.toLowerCase().includes("constraints");
  const hasEmbeddedExamples =
    descriptionContent.toLowerCase().includes("예시") ||
    descriptionContent.toLowerCase().includes("examples");

  return (
    <div className="p-4 overflow-y-auto h-full text-gray-900">
      <h2 className="text-xl font-semibold mb-2">
        {problemDetails.targetLanguage && problemDetails.title_translated
          ? problemDetails.title_translated
          : problemDetails.title}
      </h2>
      <span
        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-4 ${
          problemDetails.difficulty === "쉬움"
            ? "bg-green-100 text-green-800"
            : problemDetails.difficulty === "보통"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {problemDetails.difficulty}
      </span>
      <div className="prose prose-sm max-w-none text-gray-700 mb-6">
        <h3 className="text-md font-medium text-gray-800 mb-1">문제 설명</h3>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({
              inline,
              className,
              children,
              ...props
            }: {
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
            } & React.HTMLAttributes<HTMLElement>) {
              const match = /language-(\w+)/.exec(className || "");
              if (!inline && match) {
                return (
                  <SyntaxHighlighter
                    {...props}
                    style={oneLight}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                );
              }
              return (
                <code
                  className="bg-gray-100 rounded px-1 py-0.5 text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            table({ children }) {
              return (
                <table className="min-w-full border-collapse my-2">
                  {children}
                </table>
              );
            },
            th({ children }) {
              return (
                <th className="border px-2 py-1 bg-gray-100 text-left font-semibold">
                  {children}
                </th>
              );
            },
            td({ children }) {
              return <td className="border px-2 py-1">{children}</td>;
            },
            ul({ children, ...props }) {
              return (
                <ul className="list-disc pl-6 my-2" {...props}>
                  {children}
                </ul>
              );
            },
            ol({ children, ...props }) {
              return (
                <ol className="list-decimal pl-6 my-2" {...props}>
                  {children}
                </ol>
              );
            },
            li({ children, ...props }) {
              return (
                <li className="mb-1" {...props}>
                  {children}
                </li>
              );
            },
            p({ children }) {
              return <p className="mb-2">{children}</p>;
            },
          }}
        >
          {problemDetails.targetLanguage &&
          problemDetails.description_translated
            ? problemDetails.description_translated
            : problemDetails.description}
        </ReactMarkdown>

        {/* Only show separate constraints if not already in the description */}
        {!hasEmbeddedConstraints && problemDetails.constraints && (
          <>
            <h3 className="text-md font-medium text-gray-800 mt-4 mb-1">
              제약 조건
            </h3>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({
                  inline,
                  className,
                  children,
                  ...props
                }: {
                  inline?: boolean;
                  className?: string;
                  children?: React.ReactNode;
                } & React.HTMLAttributes<HTMLElement>) {
                  const match = /language-(\w+)/.exec(className || "");
                  if (!inline && match) {
                    return (
                      <SyntaxHighlighter
                        {...props}
                        style={oneLight}
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  }
                  return (
                    <code
                      className="bg-gray-100 rounded px-1 py-0.5 text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                ul({ children, ...props }) {
                  return (
                    <ul className="list-disc pl-6 my-2" {...props}>
                      {children}
                    </ul>
                  );
                },
                ol({ children, ...props }) {
                  return (
                    <ol className="list-decimal pl-6 my-2" {...props}>
                      {children}
                    </ol>
                  );
                },
                li({ children, ...props }) {
                  return (
                    <li className="mb-1" {...props}>
                      {children}
                    </li>
                  );
                },
                p({ children }) {
                  return <p className="mb-2">{children}</p>;
                },
              }}
            >
              {problemDetails.constraints}
            </ReactMarkdown>
          </>
        )}
      </div>

      {/* Only show test examples if not already in the description */}
      {!hasEmbeddedExamples && problemDetails.testSpecifications && (
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-800 mb-2">
            입출력 예제
          </h3>
          {(() => {
            try {
              // Parse the JSON string of test specifications
              const testcases = JSON.parse(
                problemDetails.testSpecifications
              ) as TestCase[];
              return testcases.map((example: TestCase, index: number) => (
                <div key={index} className="mb-3 last:mb-0">
                  <h4 className="text-sm font-semibold text-gray-600 mb-1">
                    예제 {index + 1}
                  </h4>
                  {/* Input block */}
                  <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-xs mb-1">
                    <strong className="font-medium text-gray-600 block mb-1">
                      Input:
                    </strong>
                    <span className="block whitespace-pre-wrap">
                      {(() => {
                        const inputValue = example.input;
                        if (inputValue === undefined)
                          return "No input provided";
                        if (typeof inputValue === "string") return inputValue;
                        if (Array.isArray(inputValue)) {
                          // Clean array formatting with consistent indentation
                          if (inputValue.length === 0) return "[]";

                          return `[
  ${inputValue.join(",\n  ")}
]`;
                        }
                        return JSON.stringify(inputValue, null, 2);
                      })()}
                    </span>
                  </pre>
                  {/* Output block */}
                  <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs">
                    <strong className="font-medium text-gray-600 block mb-1">
                      Output:
                    </strong>
                    <span className="block whitespace-pre-wrap">
                      {(() => {
                        const outputValue =
                          example.output || example.expected_output;
                        if (outputValue === undefined)
                          return "No output provided";
                        if (typeof outputValue === "string") return outputValue;
                        if (Array.isArray(outputValue)) {
                          // Clean array formatting with consistent indentation
                          if (outputValue.length === 0) return "[]";

                          return `[
  ${outputValue.join(",\n  ")}
]`;
                        }
                        return JSON.stringify(outputValue, null, 2);
                      })()}
                    </span>
                  </pre>
                </div>
              ));
            } catch (error) {
              console.error("Failed to parse test specifications:", error);
              return <p className="text-red-500">Failed to load test cases</p>;
            }
          })()}
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
  codeValue: string;
  toggleProblemPanelPreserveSize: () => void;
  toggleResultsPanelPreserveSize: () => void;
  toggleChatbotPanelPreserveSize: () => void;
  isProblemCollapsed: boolean;
  isResultsCollapsed: boolean;
  isChatbotCollapsed: boolean;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  language,
  handleLanguageChange,
  handleCodeChange,
  handleSubmit,
  onResetClick,
  editorKey,
  codeValue,
  toggleProblemPanelPreserveSize,
  toggleResultsPanelPreserveSize,
  toggleChatbotPanelPreserveSize,
  isProblemCollapsed,
  isResultsCollapsed,
  isChatbotCollapsed,
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
        {/* Inserted Panel Toggle Buttons */}
        <div className="flex items-center space-x-1 mx-2">
          {/* Problem Panel Toggle */}
          <button
            onClick={toggleProblemPanelPreserveSize}
            title={isProblemCollapsed ? "Show Problem" : "Hide Problem"}
            className={`rounded p-1.5 hover:bg-gray-100 focus:outline-none ${
              !isProblemCollapsed ? "bg-gray-100 text-primary" : "text-gray-500"
            }`}
            aria-pressed={!isProblemCollapsed ? "true" : "false"}
          >
            <ComputerDesktopIcon className="h-5 w-5" />
          </button>
          {/* Results Panel Toggle */}
          <button
            onClick={toggleResultsPanelPreserveSize}
            title={isResultsCollapsed ? "Show Results" : "Hide Results"}
            className={`rounded p-1.5 hover:bg-gray-100 focus:outline-none ${
              !isResultsCollapsed ? "bg-gray-100 text-primary" : "text-gray-500"
            }`}
            aria-pressed={!isResultsCollapsed ? "true" : "false"}
          >
            <CommandLineIcon className="h-5 w-5" />
          </button>
          {/* Chatbot Panel Toggle */}
          <button
            onClick={toggleChatbotPanelPreserveSize}
            title={isChatbotCollapsed ? "Show Chatbot" : "Hide Chatbot"}
            className={`rounded p-1.5 hover:bg-gray-100 focus:outline-none ${
              !isChatbotCollapsed ? "bg-gray-100 text-primary" : "text-gray-500"
            }`}
            aria-pressed={!isChatbotCollapsed ? "true" : "false"}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </button>
        </div>
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
        <CodeEditor
          key={editorKey}
          language={language}
          onChange={handleCodeChange}
          value={codeValue}
        />
      </div>
    </div>
  );
};

// Results Panel (Center Bottom)
type ResultsTab = "examples" | "custom" | "submission";

const ResultsPanel: React.FC<{ problemDetails: ProblemDetailAPI }> = ({
  problemDetails,
}) => {
  const [activeTab, setActiveTab] = useState<ResultsTab>("examples");

  const renderTabContent = () => {
    switch (activeTab) {
      case "examples":
        return (
          <div className="mt-4 space-y-4">
            {problemDetails.testSpecifications ? (
              (() => {
                try {
                  // Parse the JSON string of test specifications
                  const testcases = JSON.parse(
                    problemDetails.testSpecifications
                  ) as TestCase[];
                  return testcases.length > 0 ? (
                    testcases.map((example: TestCase, index: number) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded p-3"
                      >
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Example {index + 1}
                        </h4>
                        <div className="space-y-2">
                          <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-xs">
                            <strong className="font-medium text-gray-600">
                              Input:
                            </strong>
                            <span className="block mt-1 whitespace-pre-wrap">
                              {(() => {
                                const inputValue = example.input;
                                if (inputValue === undefined)
                                  return "No input provided";
                                if (typeof inputValue === "string")
                                  return inputValue;
                                if (Array.isArray(inputValue)) {
                                  // Clean array formatting with consistent indentation
                                  if (inputValue.length === 0) return "[]";

                                  return `[
  ${inputValue.join(",\n  ")}
]`;
                                }
                                return JSON.stringify(inputValue, null, 2);
                              })()}
                            </span>
                          </pre>
                          <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs">
                            <strong className="font-medium text-gray-600">
                              Output:
                            </strong>
                            <span className="block mt-1 whitespace-pre-wrap">
                              {(() => {
                                const outputValue =
                                  example.output || example.expected_output;
                                if (outputValue === undefined)
                                  return "No output provided";
                                if (typeof outputValue === "string")
                                  return outputValue;
                                if (Array.isArray(outputValue)) {
                                  // Clean array formatting with consistent indentation
                                  if (outputValue.length === 0) return "[]";

                                  return `[
  ${outputValue.join(",\n  ")}
]`;
                                }
                                return JSON.stringify(outputValue, null, 2);
                              })()}
                            </span>
                          </pre>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No examples provided.
                    </p>
                  );
                } catch (error) {
                  console.error("Failed to parse test specifications:", error);
                  return (
                    <p className="text-red-500">Failed to load test cases</p>
                  );
                }
              })()
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

// Main component wrapping the content in Suspense
const CodingTestSolvePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>문제 풀이 | ALPACO</title>
        <meta name="description" content="코딩 테스트 문제 풀이 페이지" />
      </Head>
      <div className="flex flex-col h-screen">
        {" "}
        {/* Ensure full screen height */}
        <Header />
        {/* Wrap content in Suspense for useSearchParams */}
        <main className="flex-grow overflow-hidden">
          <Suspense
            fallback={
              <div className="flex justify-center items-center flex-grow">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-500">로딩 중...</p>
                </div>
              </div>
            }
          >
            <CodingTestContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CodingTestSolvePage;
