"use client";
import React, {
  useState,
  useEffect,
  Suspense,
  ChangeEvent,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CodeEditor, { CODE_TEMPLATES } from "@/components/CodeEditor";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchAuthSession } from "aws-amplify/auth";
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

import { getProblemById, ProblemDetail, runCustomTests, RunCodeSingleResult } from "@/api/problemApi";
import { toast } from "sonner";
import Chatbot from "@/components/Chatbot";
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleUpIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const PROBLEM_DEFAULT_SIZE = 30;
const EDITOR_DEFAULT_SIZE = 45;
const CHATBOT_DEFAULT_SIZE = 25;
const RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL = 35;

interface TestCaseDisplay {
  input: string | number[] | Record<string, unknown>;
  expected_output?: string | number | boolean | number[] | Record<string, unknown>;
}

const CodingTestContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuthenticator((context) => [context.user]); // user is kept for potential future use
  const id = searchParams.get("id");

  const [problemDetails, setProblemDetails] = useState<ProblemDetail | null>(null);
  const [isLoadingProblem, setIsLoadingProblem] = useState(true);
  const [errorProblem, setErrorProblem] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<"python" | "javascript" | "java" | "cpp">("python");
  const [editorResetKey, setEditorResetKey] = useState(0);
  const hasLoadedInitialCode = useRef(false);

  const [isProblemCollapsed, setIsProblemCollapsed] = useState(false);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);
  const [isChatbotCollapsed, setIsChatbotCollapsed] = useState(false);

  const problemPanelRef = useRef<ImperativePanelHandle>(null);
  const resultsPanelRef = useRef<ImperativePanelHandle>(null);
  const chatbotPanelRef = useRef<ImperativePanelHandle>(null);

  const [runCodeResults, setRunCodeResults] = useState<RunCodeSingleResult[] | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("examples");

  const editorLocalStorageKey = useMemo(() => {
    const problemLang = problemDetails?.language?.startsWith("python") ? "python" :
                       problemDetails?.language?.startsWith("javascript") ? "javascript" :
                       problemDetails?.language?.startsWith("java") ? "java" :
                       problemDetails?.language?.startsWith("cpp") ? "cpp" : language;
    return problemDetails?.problemId
      ? `editorCode_${problemDetails.problemId}_${problemLang}`
      : null;
  }, [problemDetails?.problemId, problemDetails?.language, language]);

  const getInitialCodeForLanguage = useCallback(
    (lang: "python" | "javascript" | "java" | "cpp"): string => {
      if (problemDetails?.startCode) {
        const problemPrimaryLanguage = problemDetails.language.startsWith("python") ? "python" :
                                       problemDetails.language.startsWith("javascript") ? "javascript" :
                                       problemDetails.language.startsWith("java") ? "java" :
                                       problemDetails.language.startsWith("cpp") ? "cpp" : null;
        if (problemPrimaryLanguage === lang) {
          return problemDetails.startCode;
        }
      }
      return CODE_TEMPLATES[lang] || "";
    },
    [problemDetails]
  );
  
  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as "python" | "javascript" | "java" | "cpp";
    setLanguage(newLang);
    hasLoadedInitialCode.current = false;
    setRunCodeResults(null);
  };

  const handleCodeChange = (value: string) => {
    if (value !== code) {
      setCode(value);
    }
  };

  const handleResetCode = () => {
    const codeToSet = getInitialCodeForLanguage(language);
    console.log(`Resetting code to startCode/template for ${language}`);
    setCode(codeToSet);
    setEditorResetKey((prev) => prev + 1);
    if (editorLocalStorageKey) {
      try {
        localStorage.setItem(editorLocalStorageKey, codeToSet);
        console.log(`Saved reset code to key: ${editorLocalStorageKey}`);
      } catch (error) {
        console.error("Failed to save reset code to localStorage:", error);
      }
    }
  };

  const handleSubmit = () => {
    console.log("Submitting code (mock):", code, language);
    toast.info("제출 기능은 현재 준비 중입니다.");
    router.push(`/coding-test/result?id=${id}`);
  };

  const handleRunCode = async () => {
    if (!problemDetails || isRunningCode) return;

    setIsRunningCode(true);
    setRunCodeResults(null);
    setActiveResultsTab("submission");

    try {
      const exampleTestCases = JSON.parse(problemDetails.finalTestCases || "[]") as TestCaseDisplay[];
      const inputsToRun = exampleTestCases.slice(0, 2).map(tc => tc.input);

      if (inputsToRun.length === 0) {
        toast.info("실행할 예제 테스트 케이스가 없습니다.");
        setIsRunningCode(false);
        return;
      }
      
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      if (!idToken) {
        toast.error("실행을 위해 로그인이 필요합니다.");
        setIsRunningCode(false);
        return;
      }

      const payload = {
        executionMode: "RUN_CUSTOM_TESTS" as const,
        userCode: code,
        language: language,
        customTestCases: inputsToRun,
        problemId: problemDetails.problemId,
      };

      console.log("Running code with payload:", payload);
      const response = await runCustomTests(payload, idToken);
      console.log("Run code response:", response);
      setRunCodeResults(response.results);
      toast.success(`코드 실행 완료! ${response.results.length}개의 테스트 케이스 실행됨.`);

    } catch (err) {
      console.error("Failed to run code:", err);
      const errorMsg = err instanceof Error ? err.message : "코드 실행 중 오류 발생";
      toast.error(errorMsg);
      setRunCodeResults([{
        caseIdentifier: "Error",
        input: {},
        runCodeOutput: {
            stdout: "",
            stderr: errorMsg,
            exitCode: 1,
            executionTimeMs: 0,
            timedOut: false,
            error: errorMsg,
            isSuccessful: false,
        }
      }]);
    } finally {
      setIsRunningCode(false);
    }
  };

  const togglePanelToDefaultSize = ( panelRef: React.RefObject<ImperativePanelHandle>, isCollapsed: boolean, defaultSize: number ) => { 
    const panel = panelRef.current;
    if (!panel) return;
    if (isCollapsed) {
      panel.expand();
      panel.resize(defaultSize);
    } else {
      panel.collapse();
    }
   };
  const togglePanelPreserveSize = ( panelRef: React.RefObject<ImperativePanelHandle>, isCollapsed: boolean ) => { 
    const panel = panelRef.current;
    if (!panel) return;
    if (isCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  };
  const toggleProblemPanel = () => { if (problemPanelRef.current) { togglePanelToDefaultSize(problemPanelRef as React.RefObject<ImperativePanelHandle>, isProblemCollapsed, PROBLEM_DEFAULT_SIZE ); } };
  const toggleResultsPanel = () => { if (resultsPanelRef.current) { togglePanelToDefaultSize(resultsPanelRef as React.RefObject<ImperativePanelHandle>, isResultsCollapsed, RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL ); } };
  const toggleChatbotPanel = () => { if (chatbotPanelRef.current) { togglePanelToDefaultSize(chatbotPanelRef as React.RefObject<ImperativePanelHandle>, isChatbotCollapsed, CHATBOT_DEFAULT_SIZE ); } };
  const toggleProblemPanelPreserveSize = () => { if (problemPanelRef.current) { togglePanelPreserveSize(problemPanelRef as React.RefObject<ImperativePanelHandle>, isProblemCollapsed); } };
  const toggleResultsPanelPreserveSize = () => { if (resultsPanelRef.current) { togglePanelPreserveSize(resultsPanelRef as React.RefObject<ImperativePanelHandle>, isResultsCollapsed); } };
  const toggleChatbotPanelPreserveSize = () => { if (chatbotPanelRef.current) { togglePanelPreserveSize(chatbotPanelRef as React.RefObject<ImperativePanelHandle>, isChatbotCollapsed); } };

  useEffect(() => {
    if (id) {
      const fetchProblem = async () => {
        setIsLoadingProblem(true);
        setErrorProblem(null);
        setRunCodeResults(null);
        try {
          const data: ProblemDetail = await getProblemById(id as string);
          setProblemDetails(data);
          hasLoadedInitialCode.current = false;
          if (data.language) {
            if (data.language.startsWith("python")) setLanguage("python");
            else if (data.language.startsWith("javascript")) setLanguage("javascript");
            else if (data.language.startsWith("java")) setLanguage("java");
            else if (data.language.startsWith("cpp")) setLanguage("cpp");
          }
        } catch (err) {
          console.error("Failed to fetch problem:", err);
          const errorMsg = err instanceof Error ? err.message : "문제를 불러오는데 실패했습니다.";
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

  useEffect(() => {
    if (problemDetails && !hasLoadedInitialCode.current) {
        let initialCodeToSet = getInitialCodeForLanguage(language);

        if (editorLocalStorageKey) {
            try {
                const savedCode = localStorage.getItem(editorLocalStorageKey);
                if (savedCode !== null) {
                    initialCodeToSet = savedCode;
                    console.log(`Loaded saved code from localStorage for ${language}.`);
                } else {
                    console.log(`No saved code for ${language}, using startCode/template.`);
                }
            } catch (error) {
                console.error("Failed to load code from localStorage:", error);
            }
        }
        setCode(initialCodeToSet);
        hasLoadedInitialCode.current = true;
    }
  }, [problemDetails, language, editorLocalStorageKey, getInitialCodeForLanguage]);

  useEffect(() => {
    if (editorLocalStorageKey && hasLoadedInitialCode.current && code !== undefined) {
      console.log(`Saving code to key: ${editorLocalStorageKey}`);
      try {
        localStorage.setItem(editorLocalStorageKey, code);
      } catch (error) {
        console.error("Failed to save code to localStorage:", error);
      }
    }
  }, [code, editorLocalStorageKey]);

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

  return (
    <div className="relative flex h-[calc(100vh-var(--header-height,64px)-var(--footer-height,64px))] flex-grow flex-col">
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white px-4 pt-3 pb-2">
        <div className="flex items-center justify-end w-full space-x-4">
          <Link
            href="/coding-test"
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1" > <path d="M19 12H5M12 19l-7-7 7-7" /> </svg>
            목록으로
          </Link>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-10">
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
        <Panel ref={problemPanelRef} defaultSize={PROBLEM_DEFAULT_SIZE} minSize={20} collapsible={true} collapsedSize={0} order={1} id="problem-panel" className="bg-white border-r border-gray-200" onCollapse={() => setIsProblemCollapsed(true)} onExpand={() => setIsProblemCollapsed(false)} >
          {!isProblemCollapsed && problemDetails && (
            <ProblemPanel problemDetails={problemDetails} />
          )}
        </Panel>
        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary" />

        <Panel defaultSize={EDITOR_DEFAULT_SIZE} minSize={30} order={2} id="editor-results-panel" >
          <PanelGroup direction="vertical" className="relative h-full">
            <Panel defaultSize={100 - RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL} minSize={20} id="editor-panel" className="bg-gray-50" >
              <EditorPanel
                language={language}
                handleLanguageChange={handleLanguageChange}
                handleCodeChange={handleCodeChange}
                handleRunCode={handleRunCode}
                isRunningCode={isRunningCode}
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
            <Panel ref={resultsPanelRef} defaultSize={RESULTS_DEFAULT_SIZE_PERCENT_OF_VERTICAL} minSize={10} collapsible={true} collapsedSize={0} id="results-panel" className="bg-white" onCollapse={() => setIsResultsCollapsed(true)} onExpand={() => setIsResultsCollapsed(false)} >
              {!isResultsCollapsed && problemDetails && (
                <ResultsPanel 
                  problemDetails={problemDetails} 
                  runCodeResults={runCodeResults}
                  isRunningCode={isRunningCode}
                  activeTab={activeResultsTab}
                  setActiveTab={setActiveResultsTab}
                />
              )}
              {isResultsCollapsed && ( <div className="h-full w-full bg-white"></div> )}
              {isResultsCollapsed && ( <button onClick={toggleResultsPanel} className="pointer-events-auto absolute bottom-2 left-1/2 z-50 -translate-x-1/2 transform rounded border border-gray-300 bg-white p-1 text-gray-600 shadow-md hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary" aria-label="Open Results Panel" title="Open Results Panel" > <ChevronDoubleUpIcon className="h-4 w-4" /> </button> )}
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-primary transition-colors data-[resize-handle-active]:bg-primary" />

        <Panel ref={chatbotPanelRef} defaultSize={CHATBOT_DEFAULT_SIZE} minSize={15} collapsible={true} collapsedSize={0} order={3} id="chatbot-panel" className="bg-gray-50 border-l border-gray-200" onCollapse={() => setIsChatbotCollapsed(true)} onExpand={() => setIsChatbotCollapsed(false)} >
          {!isChatbotCollapsed && problemDetails && (
            <Chatbot problemDetails={problemDetails} userCode={code} />
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
};

const ProblemPanel: React.FC<{ problemDetails: ProblemDetail }> = ({ problemDetails }) => {
  return (
    <div className="p-4 overflow-y-auto h-full text-gray-900">
      <h2 className="text-xl font-semibold mb-2">
        {problemDetails.targetLanguage && problemDetails.title_translated
          ? problemDetails.title_translated
          : problemDetails.title}
      </h2>
      <span
        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-4 ${
          problemDetails.difficulty.toLowerCase().includes("쉬움") || problemDetails.difficulty.toLowerCase().includes("easy")
            ? "bg-green-100 text-green-800"
            : problemDetails.difficulty.toLowerCase().includes("보통") || problemDetails.difficulty.toLowerCase().includes("medium")
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {problemDetails.difficulty}
      </span>
      <div className="prose prose-sm max-w-none text-gray-700 mb-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; } & React.HTMLAttributes<HTMLElement>) {
              const match = /language-(\w+)/.exec(className || "");
              if (!inline && match) {
                return ( <SyntaxHighlighter {...props} style={oneLight} language={match[1]} PreTag="div" > {String(children).replace(/\\n$/, "")} </SyntaxHighlighter> );
              }
              return ( <code className="bg-gray-100 rounded px-1 py-0.5 text-sm" {...props}> {children} </code> );
            },
            table({ children }) { return <table className="min-w-full border-collapse my-2">{children}</table>; },
            th({ children }) { return <th className="border px-2 py-1 bg-gray-100 text-left font-semibold">{children}</th>; },
            td({ children }) { return <td className="border px-2 py-1">{children}</td>; },
            ul({ children, ...props }) { return <ul className="list-disc pl-6 my-2" {...props}>{children}</ul>; },
            ol({ children, ...props }) { return <ol className="list-decimal pl-6 my-2" {...props}>{children}</ol>; },
            li({ children, ...props }) { return <li className="mb-1" {...props}>{children}</li>; },
            p({ children }) { return <p className="mb-2">{children}</p>; },
          }}
        >
          {problemDetails.targetLanguage && problemDetails.description_translated
            ? problemDetails.description_translated
            : problemDetails.description}
        </ReactMarkdown>
      </div>
    </div>
  );
};

interface EditorPanelProps {
  language: "python" | "javascript" | "java" | "cpp";
  handleLanguageChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleCodeChange: (value: string) => void;
  handleRunCode: () => void;
  isRunningCode: boolean;
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
  handleRunCode,
  isRunningCode,
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
      <div className="p-2 border-b border-gray-200 flex items-center space-x-4 flex-shrink-0">
        <div>
          <label htmlFor="language-select" className="sr-only"> 언어 선택: </label>
          <select id="language-select" value={language} onChange={handleLanguageChange} className="p-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white text-gray-900" aria-label="프로그래밍 언어 선택" >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>
        <button onClick={onResetClick} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100" > Reset </button>
        <div className="flex items-center space-x-1 mx-2">
          <button onClick={toggleProblemPanelPreserveSize} title={isProblemCollapsed ? "Show Problem" : "Hide Problem"} className={`rounded p-1.5 hover:bg-gray-100 focus:outline-none ${ !isProblemCollapsed ? "bg-gray-100 text-primary" : "text-gray-500" }`} aria-pressed={!isProblemCollapsed ? "true" : "false"} > <ComputerDesktopIcon className="h-5 w-5" /> </button>
          <button onClick={toggleResultsPanelPreserveSize} title={isResultsCollapsed ? "Show Results" : "Hide Results"} className={`rounded p-1.5 hover:bg-gray-100 focus:outline-none ${ !isResultsCollapsed ? "bg-gray-100 text-primary" : "text-gray-500" }`} aria-pressed={!isResultsCollapsed ? "true" : "false"} > <CommandLineIcon className="h-5 w-5" /> </button>
          <button onClick={toggleChatbotPanelPreserveSize} title={isChatbotCollapsed ? "Show Chatbot" : "Hide Chatbot"} className={`rounded p-1.5 hover:bg-gray-100 focus:outline-none ${ !isChatbotCollapsed ? "bg-gray-100 text-primary" : "text-gray-500" }`} aria-pressed={!isChatbotCollapsed ? "true" : "false"} > <ChatBubbleLeftRightIcon className="h-5 w-5" /> </button>
        </div>
        <div className="flex-grow"></div>
        <button
          onClick={handleRunCode}
          disabled={isRunningCode}
          className="px-3 py-1 text-sm border border-green-500 text-green-600 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <PlayIcon className="h-4 w-4 mr-1" />
          {isRunningCode ? "실행 중..." : "코드 실행"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isRunningCode}
          className="px-4 py-1 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition disabled:opacity-50"
        >
          제출
        </button>
      </div>
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

type ResultsTab = "examples" | "custom" | "submission";

interface ResultsPanelProps {
  problemDetails: ProblemDetail;
  runCodeResults: RunCodeSingleResult[] | null;
  isRunningCode: boolean;
  activeTab: ResultsTab;
  setActiveTab: (tab: ResultsTab) => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
  problemDetails, 
  runCodeResults, 
  isRunningCode,
  activeTab,
  setActiveTab
 }) => {
  const exampleTestCasesToDisplay = useMemo(() => {
    try {
      const allTestCases = JSON.parse(problemDetails.finalTestCases || "[]") as TestCaseDisplay[];
      return allTestCases.slice(0, 2);
    } catch (error) {
      console.error("Failed to parse finalTestCases for examples:", error);
      return [];
    }
  }, [problemDetails.finalTestCases]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "examples":
        return (
          <div className="mt-4 space-y-4">
            {exampleTestCasesToDisplay.length > 0 ? (
              exampleTestCasesToDisplay.map((example, index) => (
                <div key={index} className="border border-gray-200 rounded p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    예제 테스트 케이스 {index + 1}
                  </h4>
                  <div className="space-y-2">
                    <pre className="bg-gray-50 p-3 rounded-md text-gray-700 font-mono text-xs">
                      <strong className="font-medium text-gray-600">Input:</strong>
                      <span className="block mt-1 whitespace-pre-wrap">
                        {typeof example.input === 'string' ? example.input : JSON.stringify(example.input, null, 2)}
                      </span>
                    </pre>
                    <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs">
                      <strong className="font-medium text-gray-600">Expected Output:</strong>
                      <span className="block mt-1 whitespace-pre-wrap">
                        {example.expected_output === undefined ? "N/A" : (typeof example.expected_output === 'string' ? example.expected_output : JSON.stringify(example.expected_output, null, 2))}
                      </span>
                    </pre>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">표시할 예제 테스트 케이스가 없습니다.</p>
            )}
          </div>
        );
      case "custom":
        return (
          <div className="mt-4">
            <h4 className="text-md font-semibold mb-2 text-gray-800"> Custom Input </h4>
            <textarea className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono bg-white text-gray-900" rows={5} placeholder="Enter your custom input here..." ></textarea>
            <h4 className="text-md font-semibold mt-4 mb-2 text-gray-800"> Output </h4>
            <pre className="bg-gray-100 p-3 rounded-md text-gray-800 font-mono text-xs min-h-[50px]"> Run code to see output... </pre>
          </div>
        );
      case "submission":
        if (isRunningCode) {
          return (
            <div className="mt-4 flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="mt-3 text-gray-600">코드를 실행 중입니다...</p>
            </div>
          );
        }
        if (!runCodeResults) {
          return (
            <div className="mt-4 text-center text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              &quot;코드 실행&quot; 버튼을 눌러 예제 테스트 케이스에 대한 결과를 확인하세요.
              <br />제출 시 모든 테스트 케이스에 대한 채점이 진행됩니다.
            </div>
          );
        }
        return (
          <div className="mt-4 space-y-4">
            <h4 className="text-md font-semibold text-gray-800">실행 결과:</h4>
            {runCodeResults.map((result, index) => (
              <div key={index} className={`border rounded p-3 ${result.runCodeOutput.isSuccessful ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-semibold">
                    {result.caseIdentifier || `Test Case ${index + 1}`}
                    </h5>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        result.runCodeOutput.isSuccessful 
                        ? 'bg-green-200 text-green-800' 
                        : result.runCodeOutput.timedOut
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                    }`}>
                    {result.runCodeOutput.timedOut 
                        ? "시간 초과" 
                        : result.runCodeOutput.isSuccessful 
                        ? "성공" 
                        : result.runCodeOutput.runCodeLambdaError || result.runCodeOutput.error
                        ? "실행기 오류"
                        : "실패/오류"}
                    </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">실행 시간: {result.runCodeOutput.executionTimeMs}ms</p>
                
                <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-primary">입력값 보기</summary>
                    <pre className="mt-1 bg-gray-100 p-2 rounded text-gray-700 font-mono whitespace-pre-wrap">
                        {typeof result.input === 'string' ? result.input : JSON.stringify(result.input, null, 2)}
                    </pre>
                </details>

                {result.runCodeOutput.stdout && (
                  <details className="text-xs mt-1">
                    <summary className="cursor-pointer text-gray-600 hover:text-primary">표준 출력 (stdout)</summary>
                    <pre className="mt-1 bg-gray-100 p-2 rounded text-gray-700 font-mono whitespace-pre-wrap">
                      {result.runCodeOutput.stdout}
                    </pre>
                  </details>
                )}
                {result.runCodeOutput.stderr && (
                  <details className="text-xs mt-1">
                    <summary className="cursor-pointer text-red-600 hover:text-red-800">표준 에러 (stderr)</summary>
                    <pre className="mt-1 bg-red-50 p-2 rounded text-red-700 font-mono whitespace-pre-wrap">
                      {result.runCodeOutput.stderr}
                    </pre>
                  </details>
                )}
                 {result.runCodeOutput.runCodeLambdaError && result.runCodeOutput.errorMessage && (
                     <p className="text-xs text-red-700 mt-1">실행기 오류 메시지: {result.runCodeOutput.errorMessage}</p>
                 )}
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const getTabClasses = (tabName: ResultsTab) => { 
    const base = "px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 focus:outline-none";
    const active = "border-primary text-primary"; 
    const inactive = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"; 
    return `${base} ${activeTab === tabName ? active : inactive}`;
  };

  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200 text-gray-900">
      <div className="border-b border-gray-200 flex-shrink-0">
        <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
          <button onClick={() => setActiveTab("examples")} className={getTabClasses("examples")} aria-current={activeTab === "examples" ? "page" : undefined} >
            예제 테스트 케이스
          </button>
          <button onClick={() => setActiveTab("custom")} className={getTabClasses("custom")} aria-current={activeTab === "custom" ? "page" : undefined} >
            Custom Input
          </button>
          <button onClick={() => setActiveTab("submission")} className={getTabClasses("submission")} aria-current={activeTab === "submission" ? "page" : undefined} >
            실행 결과
          </button>
        </nav>
      </div>
      <div className="p-4 flex-grow overflow-y-auto">{renderTabContent()}</div>
    </div>
  );
};

const CodingTestSolvePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>문제 풀이 | ALPACO</title>
        <meta name="description" content="코딩 테스트 문제 풀이 페이지" />
      </Head>
      <div className="flex flex-col h-screen">
        <Header />
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
