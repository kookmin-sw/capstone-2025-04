// src/app/generate-problem/GenerateProblemClient.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
// Import the STREAMING dummy API function and types
import {
  streamGenerationStatusDummyAPI, // Use the streaming dummy
  GenerateProblemParams,
  GeneratedProblem,
  // StreamMessage, // Import the message type
} from "@/api/dummy/generateProblemApi"; // Adjust path as needed

// Problem type presets interface
interface ProblemTypePreset {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

const SESSION_STORAGE_KEY = "alpaco_generated_problems";

// --- Icons ---
const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
  </svg>
);
const LoadingSpinnerIcon = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
);
const DPIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 4h16v4H4zm0 6h16v4H4zm0 6h16v4H4z"></path>
  </svg>
);
const GraphIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.5 7a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM6.5 7a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM12 7a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"></path>
  </svg>
);
const SortingIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"></path>
  </svg>
);
const BinarySearchIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 14l5-5 5 5H7z"></path>
  </svg>
);
const GreedyIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 16l-6-6h12l-6 6z"></path>
  </svg>
);
// --- End Icons ---

const GenerateProblemClient = () => {
  const [prompt, setPrompt] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Medium"
  );
  const [isLoading, setIsLoading] = useState(false);
  // State for UI feedback from stream
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [llmStreamContent, setLlmStreamContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedProblems, setGeneratedProblems] = useState<
    GeneratedProblem[]
  >([]);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const statusAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<{ abort: boolean }>({ abort: false }); // Simplified abort for dummy

  // --- Presets ---
  const problemTypePresets: ProblemTypePreset[] = [
    {
      label: "DP 문제",
      prompt: "다이나믹 프로그래밍 기본 문제를 생성해 주세요.",
      icon: <DPIcon />,
    },
    {
      label: "그래프 문제",
      prompt: "DFS와 BFS를 활용한 그래프 문제를 생성해 주세요.",
      icon: <GraphIcon />,
    },
    {
      label: "정렬 문제",
      prompt: "효율적인 정렬 알고리즘을 활용하는 문제를 생성해 주세요.",
      icon: <SortingIcon />,
    },
    {
      label: "이진 탐색",
      prompt: "이진 탐색 알고리즘을 활용하는 문제를 생성해 주세요.",
      icon: <BinarySearchIcon />,
    },
    {
      label: "그리디",
      prompt: "그리디 알고리즘 접근법을 사용하는 문제를 생성해 주세요.",
      icon: <GreedyIcon />,
    },
  ];
  // --- End Presets ---

  // --- Hooks for textarea resize, sessionStorage ---
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 38;
      textareaRef.current.style.height = `${Math.max(
        minHeight,
        Math.min(scrollHeight, 200)
      )}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt, adjustTextareaHeight]);

  useEffect(() => {
    if (statusAreaRef.current) {
      statusAreaRef.current.scrollTop = statusAreaRef.current.scrollHeight;
    }
  }, [statusMessages, llmStreamContent]);

  useEffect(() => {
    const savedProblems = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedProblems) {
      try {
        const parsedProblems = JSON.parse(savedProblems);
        if (Array.isArray(parsedProblems)) {
          setGeneratedProblems(parsedProblems);
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (e) {
        console.error("Failed to parse problems from sessionStorage:", e);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    setHasInitiallyLoaded(true);
  }, []);

  useEffect(() => {
    if (hasInitiallyLoaded) {
      if (generatedProblems.length > 0) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(generatedProblems)
        );
      } else {
        if (sessionStorage.getItem(SESSION_STORAGE_KEY)) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }
  }, [generatedProblems, hasInitiallyLoaded]);
  // --- End Hooks ---

  // --- Main Generation Logic ---
  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const currentPrompt = prompt.trim();
    if (!currentPrompt || isLoading) return;

    // Signal previous dummy stream to stop (if applicable)
    controllerRef.current.abort = true;
    const currentController = { abort: false }; // Create new controller for this run
    controllerRef.current = currentController;

    // Reset states
    setIsLoading(true);
    setError(null);
    setGeneratedProblems([]);
    setStatusMessages([`요청 시작: '${currentPrompt}' (${difficulty})`]);
    setLlmStreamContent("");
    textareaRef.current?.blur();

    try {
      const params: GenerateProblemParams = {
        prompt: currentPrompt,
        difficulty,
      };

      // ***********************************************************
      // *****       CURRENTLY USING DUMMY STREAMING API       *****
      // ***********************************************************
      const stream = streamGenerationStatusDummyAPI(params);

      for await (const message of stream) {
        // Check if this request was aborted
        if (currentController.abort) {
          console.log("Dummy stream processing aborted.");
          setStatusMessages((prev) => [...prev, "요청이 취소되었습니다."]);
          break; // Exit the loop
        }

        console.log("Received dummy message:", message); // Debugging

        switch (message.type) {
          case "status":
            setStatusMessages((prev) => [...prev, message.payload as string]);
            break;
          case "token":
            setLlmStreamContent((prev) => prev + (message.payload as string));
            break;
          case "result":
            setGeneratedProblems(message.payload as GeneratedProblem[]);
            setIsLoading(false); // Mark as done only when result is received
            break;
          case "error":
            const errorPayload = message.payload as string;
            setError(`백엔드 오류: ${errorPayload}`);
            setStatusMessages((prev) => [...prev, `❌ 오류: ${errorPayload}`]);
            setIsLoading(false); // Stop on error
            break;
          default:
            console.warn("Unknown message type:", message.type);
        }
      }
      // If loop finished without result/error and wasn't aborted, something is wrong
      if (isLoading && !currentController.abort) {
        setStatusMessages((prev) => [
          ...prev,
          "⚠️ 스트림이 예상치 못하게 종료되었습니다.",
        ]);
        setIsLoading(false); // Ensure loading stops
      }

      // ***********************************************************
      // *****          REAL LAMBDA API CALL (Future)          *****
      // ***********************************************************
      /*
            // 1. Define processStream function (as in previous example)
            const processStream = async (reader, decoder) => { ... };

            // 2. Replace the above dummy call with fetch:
            const lambdaUrl = "YOUR_LAMBDA_FUNCTION_URL_HERE"; // Replace!
            const abortController = new AbortController();
            controllerRef.current = abortController; // Store the real AbortController

            const response = await fetch(lambdaUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
                signal: abortController.signal,
            });

            if (!response.ok) { throw new Error(`API Error (${response.status})`); }
            if (!response.body) { throw new Error("Response body is missing."); }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            await processStream(reader, decoder); // Process the real stream
            */
      // ***********************************************************
    } catch (err) {
      // This catch block is mainly for the REAL fetch call errors
      if ((err as Error).name === "AbortError") {
        console.log("Fetch aborted");
        // Status already set if dummy abort worked
        if (!controllerRef.current.abort) {
          // Check if status wasn't set by dummy abort logic
          setStatusMessages((prev) => [...prev, "요청이 취소되었습니다."]);
        }
      } else {
        console.error("Error in handleGenerate:", err);
        const errorMsg =
          err instanceof Error ? err.message : "알 수 없는 클라이언트 오류";
        setError(errorMsg);
        setStatusMessages((prev) => [
          ...prev,
          `❌ 클라이언트 오류: ${errorMsg}`,
        ]);
      }
      setIsLoading(false); // Ensure loading stops on error
    } finally {
      // Reset dummy abort signal *if* this request finished naturally or errored
      if (!controllerRef.current.abort) {
        // If it wasn't aborted by a *new* request starting, reset the signal
        controllerRef.current.abort = false;
      }
      // For real fetch, you'd set controllerRef.current = null; here
    }
  };

  // Simplified abort cleanup for dummy
  useEffect(() => {
    return () => {
      controllerRef.current.abort = true; // Signal any ongoing dummy process to stop
    };
  }, []);

  // --- handleKeyPress, applyPreset ---
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleGenerate();
    }
  };
  const applyPreset = (preset: ProblemTypePreset) => {
    setPrompt(preset.prompt);
    textareaRef.current?.focus();
  };
  // --- End ---

  const showResultsArea =
    isLoading ||
    statusMessages.length > 1 ||
    llmStreamContent ||
    generatedProblems.length > 0 ||
    error;

  return (
    <div className="text-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* --- Input Section --- */}
        <div
          className={`
                    bg-white rounded-lg shadow-sm border transition-all duration-150 ease-in-out cursor-text
                    ${
                      isInputFocused
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-gray-200 hover:border-gray-300"
                    }
                    ${
                      isLoading
                        ? "bg-gray-50 opacity-75 pointer-events-none"
                        : "bg-white"
                    }
                `}
          onClick={() => !isLoading && textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="생성하고 싶은 문제 유형을 입력하세요... (예: DP 기초 문제)"
            className="w-full pt-2 px-6 border-none focus:ring-0 outline-none text-gray-900 placeholder-gray-400 text-sm resize-none overflow-auto leading-relaxed bg-transparent disabled:text-gray-500 [min-height:24px]"
            rows={1}
            disabled={isLoading}
          />
          <div className="flex gap-1.5 px-6 pb-3 pt-1 bg-transparent rounded-b-md items-center">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-full">
              {(["Easy", "Medium", "Hard"] as const).map((level) => (
                <button
                  key={level}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLoading) setDifficulty(level);
                  }}
                  disabled={isLoading}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border-primary ring-2 ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    difficulty === level
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {level === "Easy"
                    ? "쉬움"
                    : level === "Medium"
                    ? "중간"
                    : "어려움"}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerate();
                }}
                disabled={isLoading || !prompt.trim()}
                className={`h-9 w-9 flex items-center justify-center rounded-full transition-colors ${
                  isLoading || !prompt.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-primary hover:bg-primary-hover text-white"
                }`}
                aria-label="생성하기"
              >
                {isLoading ? <LoadingSpinnerIcon /> : <SendIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* --- Problem Type Presets --- */}
        <div className="flex flex-row flex-wrap gap-2 my-4 justify-center">
          {problemTypePresets.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-full text-sm font-medium transition-all border border-gray-200 text-secondary hover:text-primary hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-primary">{preset.icon}</span>
              {preset.label}
            </button>
          ))}
        </div>

        {/* --- Results / Status Area --- */}
        {showResultsArea && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[150px] max-h-[70vh] overflow-y-auto mt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              생성 상태 및 결과:
            </h3>

            {/* Status Messages */}
            {statusMessages.length > 0 && (
              <div
                ref={statusAreaRef}
                className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200 max-h-[20vh] overflow-y-auto mb-4"
                aria-live="polite"
              >
                {statusMessages.map((msg, index) => (
                  <p key={index} className="mb-1 last:mb-0">
                    <code>{msg}</code>
                  </p>
                ))}
              </div>
            )}

            {/* LLM Streaming Content (Optional but good for demo) */}
            {llmStreamContent && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-700 mb-2">
                  LLM 출력 (스트리밍):
                </h4>
                <pre className="whitespace-pre-wrap text-sm font-mono bg-black text-green-400 p-4 rounded-md max-h-[30vh] overflow-y-auto border border-gray-700">
                  {llmStreamContent}
                  {isLoading && (
                    <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></span>
                  )}
                </pre>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">
                <strong>오류:</strong> {error}
              </div>
            )}

            {/* Generated Problems List */}
            {generatedProblems.length > 0 &&
              !isLoading && ( // Show only when not loading
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-gray-600 mb-3">
                    생성된 문제 중 하나를 선택하여 풀이를 시작하세요:
                  </p>
                  {generatedProblems.map((problem) => (
                    <div
                      key={problem.id}
                      className="border border-gray-200 bg-white p-4 rounded-lg hover:shadow-md transition-all duration-200 ease-in-out"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-md font-semibold text-gray-900">
                          {problem.title}
                        </h4>
                        <span
                          className={`flex-shrink-0 ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                            problem.difficulty === "Easy"
                              ? "bg-green-100 text-green-800"
                              : problem.difficulty === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                      </div>
                      {/* Display description only if different from streamed content */}
                      {problem.description !== llmStreamContent && (
                        <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                          {problem.description}
                        </p>
                      )}
                      <Link
                        href={`/coding-test/progress?id=${
                          problem.id
                        }&title=${encodeURIComponent(
                          problem.title
                        )}&desc=${encodeURIComponent(problem.description)}`}
                        className="inline-block px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition duration-200 ease-in-out"
                      >
                        문제 풀기
                      </Link>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateProblemClient;
