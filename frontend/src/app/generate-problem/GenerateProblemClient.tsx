"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
// Import the dummy API function and types
import {
  generateProblemsDummyAPI,
  GenerateProblemParams,
  GeneratedProblem,
} from "@/api/dummy/generateProblemApi"; // Adjust path as needed

// Problem type presets (interface remains the same)
interface ProblemTypePreset {
  label: string;
  prompt: string;
  icon: React.ReactNode;
}

const SESSION_STORAGE_KEY = "alpaco_generated_problems";

// --- Icons remain the same ---
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
    "Medium",
  );
  const [isLoading, setIsLoading] = useState(false);
  // Use statusText for UI feedback during loading instead of streamingText
  const [statusText, setStatusText] = useState("");
  const [generatedProblems, setGeneratedProblems] = useState<
    GeneratedProblem[]
  >([]);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const statusAreaRef = useRef<HTMLDivElement>(null); // Renamed ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Presets remain the same ---
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

  // --- Hooks for textarea resize, sessionStorage remain the same ---
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 38;
      textareaRef.current.style.height = `${Math.max(
        minHeight,
        Math.min(scrollHeight, 200),
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
  }, [statusText]); // Scroll status area

  useEffect(() => {
    const savedProblems = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedProblems) {
      try {
        const parsedProblems = JSON.parse(savedProblems);
        if (Array.isArray(parsedProblems)) {
          setGeneratedProblems(parsedProblems);
          // Optionally show a status if problems were loaded from session
          // setStatusText("이전에 생성된 문제가 로드되었습니다.");
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Failed to parse problems from sessionStorage:", error);
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
          JSON.stringify(generatedProblems),
        );
      } else {
        // Only remove if it exists and problems are empty *after* initial load
        if (sessionStorage.getItem(SESSION_STORAGE_KEY)) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }
  }, [generatedProblems, hasInitiallyLoaded]);
  // --- End Hooks ---

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const currentPrompt = prompt.trim(); // Use a local variable for consistency
    if (!currentPrompt || isLoading) return;

    setIsLoading(true);
    setGeneratedProblems([]); // Clear previous results
    setStatusText(
      // Initial status message
      `'${currentPrompt}' (난이도: ${difficulty}) 문제 생성 요청 중...`,
    );
    textareaRef.current?.blur();

    try {
      // Prepare parameters for the API call
      const params: GenerateProblemParams = {
        prompt: currentPrompt,
        difficulty,
      };

      // *** Call the (dummy) API function ***
      const problems = await generateProblemsDummyAPI(params);
      // ************************************

      // --- Future API Integration Point ---
      // When switching to a real API:
      // const response = await fetch('/api/generate-problem', { // Your Lambda endpoint
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(params),
      // });
      // if (!response.ok) {
      //   throw new Error(`API Error: ${response.statusText}`);
      // }
      // const problems: GeneratedProblem[] = await response.json();
      // ------------------------------------

      setGeneratedProblems(problems);
      setStatusText(
        // Update status on success
        `✅ '${currentPrompt}' 문제 ${problems.length}개가 생성되었습니다.`,
      );
    } catch (error) {
      console.error("Error generating problems:", error);
      setStatusText(
        // Update status on error
        `❌ 문제 생성 중 오류가 발생했습니다: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      // Optionally clear problems on error, or keep old ones?
      // setGeneratedProblems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- handleKeyPress, applyPreset remain the same ---
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleGenerate(); // No event needed here now
    }
  };

  const applyPreset = (preset: ProblemTypePreset) => {
    setPrompt(preset.prompt);
    textareaRef.current?.focus();
  };
  // --- End ---

  // Determine when to show the results/status area
  const showResultsArea =
    isLoading || !!statusText || generatedProblems.length > 0;

  return (
    <div className="text-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* --- Input Section (remains structurally the same) --- */}
        <div
          className={`
            bg-white rounded-lg shadow-sm border transition-all duration-150 ease-in-out cursor-text
            ${
              isInputFocused
                ? "border-primary ring-2 ring-primary/20"
                : "border-gray-200 hover:border-gray-300"
            }
            ${isLoading ? "bg-gray-50 opacity-75" : "bg-white"}
          `}
          onClick={() => !isLoading && textareaRef.current?.focus()} // Prevent focus change when loading
        >
          <div className="px-6 pt-3 pb-0">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="생성하고 싶은 문제 유형을 입력하세요..."
              className="w-full pt-2 border-none focus:ring-0 outline-none text-gray-900 placeholder-gray-400 text-sm resize-none overflow-auto leading-relaxed bg-transparent disabled:text-gray-500"
              rows={1}
              disabled={isLoading}
              style={{ minHeight: "24px" }}
            />
          </div>
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
                  handleGenerate(); // No event needed here now
                }}
                disabled={isLoading || !prompt.trim()}
                className={`h-9 w-9 flex items-center justify-center rounded-full transition-colors ${
                  // Fixed width/height
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

        {/* --- Problem Type Presets (remains structurally the same) --- */}
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

        {/* --- Results Area (Modified for status text) --- */}
        {showResultsArea && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[150px] max-h-[60vh] overflow-y-auto mt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              생성 상태 및 결과:
            </h3>

            {/* Status Text Area */}
            {(isLoading || statusText) && (
              <div
                ref={statusAreaRef}
                className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded-md max-h-[15vh] overflow-y-auto mb-4 border border-gray-200"
                aria-live="polite" // For screen readers
              >
                {isLoading && !statusText // Show default loading if no specific status yet
                  ? "처리 중..."
                  : statusText}
              </div>
            )}

            {/* Generated Problems List */}
            {generatedProblems.length > 0 && !isLoading && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-gray-600 mb-3">
                  생성된 문제 중 하나를 선택하여 풀이를 시작하세요:
                </p>
                {generatedProblems.map((problem) => (
                  <div
                    key={problem.id} // Use generated ID
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
                              ? "bg-yellow-100 text-yellow-800" // Changed medium color for better contrast
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {problem.difficulty === "Easy"
                          ? "쉬움"
                          : problem.difficulty === "Medium"
                            ? "중간"
                            : "어려움"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {problem.description}
                    </p>
                    <Link
                      href={`/coding-test/progress?id=${
                        problem.id
                      }&title=${encodeURIComponent(
                        problem.title,
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
