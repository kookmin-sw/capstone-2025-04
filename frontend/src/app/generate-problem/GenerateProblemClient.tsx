// src/app/generate-problem/GenerateProblemClient.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation"; // Added useRouter
import Link from "next/link"; // Add import for Link
// Import the REAL STREAMING API function and types
import {
  streamProblemGeneration, // Import the real streaming function
  CreateProblemRequest, // Use the request type for the streaming function
  ProblemDifficulty,
  ProblemDetailAPI, // Keep this for the final result
  // Remove unused imports if any
  // createProblemAPI, // Keep if needed for non-streaming fallback or other features
  // getProblemDetailAPI, // Keep for polling fallback or direct fetch if needed
} from "@/api/generateProblemApi";
import type {
  // Import specific types for SSE callbacks
  ProblemStreamStatus,
  ProblemStreamResult,
  ProblemStreamError,
} from "@/api/generateProblemApi";
import ReactMarkdown from "react-markdown"; // Import ReactMarkdown
import remarkGfm from "remark-gfm"; // Import GFM plugin for tables, etc.

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

const difficultyMap: Record<string, ProblemDifficulty> = {
  Easy: "쉬움",
  Medium: "보통",
  Hard: "어려움",
};

const GenerateProblemClient = () => {
  const searchParams = useSearchParams();
  // const router = useRouter(); // Added router
  const [prompt, setPrompt] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Medium"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // State to hold the final generated problem details from SSE
  const [generatedProblem, setGeneratedProblem] =
    useState<ProblemDetailAPI | null>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const statusAreaRef = useRef<HTMLDivElement>(null);
  // Removed polling-related state and refs

  // Ref to track if initial prompt from URL has been handled
  const initialPromptHandledRef = useRef(false);

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
  }, [statusMessages]);

  // Session Storage Logic (modified slightly to integrate with URL param loading)
  useEffect(() => {
    // Only load from session storage if no prompt came from URL initially
    if (!initialPromptHandledRef.current) {
      const savedProblems = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedProblems) {
        try {
          const parsedProblems = JSON.parse(savedProblems);
          // Load ProblemDetailAPI if available
          if (
            Array.isArray(parsedProblems) &&
            parsedProblems.length > 0 &&
            parsedProblems[0].problemId // Check if it looks like ProblemDetailAPI
          ) {
            setGeneratedProblem(parsedProblems[0]); // Load the first (likely only) saved detailed problem
          } else {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } catch (e) {
          console.error("Failed to parse problems from sessionStorage:", e);
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }
    setHasInitiallyLoaded(true);
  }, []); // Runs once on mount

  useEffect(() => {
    if (hasInitiallyLoaded) {
      if (generatedProblem) {
        // Save the full ProblemDetailAPI
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify([generatedProblem]) // Store as an array for consistency
        );
      } else {
        // Clear if no problem is generated/loaded
        if (sessionStorage.getItem(SESSION_STORAGE_KEY)) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }
  }, [generatedProblem, hasInitiallyLoaded]);

  // --- Remove Polling Logic ---
  // useEffect(() => { ... }, [problemId]); // This block is removed

  // --- Main Generation Logic (Updated for SSE) ---
  const handleGenerate = useCallback(
    async (e?: React.FormEvent, promptOverride?: string) => {
      e?.preventDefault();
      const currentPrompt = (promptOverride ?? prompt).trim();
      if (!currentPrompt || isLoading) return;

      setIsLoading(true);
      setError(null);
      setGeneratedProblem(null); // Clear previous final result
      setStatusMessages([
        `요청 시작: '${currentPrompt}' (${difficultyMap[difficulty]})`,
      ]);
      textareaRef.current?.blur();

      const params: CreateProblemRequest = {
        prompt: currentPrompt,
        difficulty: difficultyMap[difficulty],
      };

      try {
        // Use the new streaming function
        await streamProblemGeneration(params, {
          onStatus: (status: ProblemStreamStatus) => {
            setStatusMessages((prev) => [...prev, status.message]);
            console.log("Status update:", status);
          },
          onResult: (result: ProblemStreamResult) => {
            console.log("Received final result:", result);
            if (result && result.payload) {
              setGeneratedProblem(result.payload); // Set the final detailed problem
              // Optionally add a final success message to status
              setStatusMessages((prev) => [...prev, "✅ 생성 완료!"]);
            } else {
              console.error(
                "Received empty or invalid result payload:",
                result
              );
              setError("문제 생성 결과가 비어있거나 형식이 잘못되었습니다.");
              setStatusMessages((prev) => [
                ...prev,
                "❌ 문제 생성 결과가 잘못되었습니다.",
              ]);
            }
          },
          onError: (error: ProblemStreamError) => {
            console.error("Generation error:", error);
            setError(error.payload);
            setStatusMessages((prev) => [...prev, `❌ 오류: ${error.payload}`]);
            setIsLoading(false); // Stop loading on error
          },
          onComplete: () => {
            setIsLoading(false); // Stop loading when stream completes
            // Use function state reference instead of closure to avoid dependency issues
            setTimeout(() => {
              // Get current state via setGeneratedProblem's functional form
              setGeneratedProblem((currentProblem) => {
                if (!currentProblem) {
                  console.warn(
                    "Stream completed but generatedProblem is still null. This might indicate the 'result' event was never received."
                  );
                } else {
                  console.log(
                    "SSE Stream Completed with valid generatedProblem:",
                    currentProblem
                  );
                }
                return currentProblem; // Return same value to not change state
              });
            }, 100);
          },
        });
      } catch (err) {
        // Catch errors from the streamProblemGeneration setup itself
        const errorMsg =
          err instanceof Error
            ? err.message
            : "스트리밍 시작 중 알 수 없는 오류";
        setError(errorMsg);
        setStatusMessages((prev) => [...prev, `❌ 오류: ${errorMsg}`]);
        setIsLoading(false);
      }
    },
    [prompt, isLoading, difficulty] // Dependencies remain the same
  );

  // Effect to handle initial prompt from URL (Keep as is)
  useEffect(() => {
    const initialPrompt = searchParams.get("prompt");
    if (initialPrompt && !initialPromptHandledRef.current) {
      initialPromptHandledRef.current = true; // Mark as handled
      const decodedPrompt = decodeURIComponent(initialPrompt);
      setPrompt(decodedPrompt); // Set the state
      // Use the callback directly
      handleGenerate(undefined, decodedPrompt);
    }
  }, [searchParams, handleGenerate]); // handleGenerate is now stable

  // Remove dummy controllerRef cleanup
  // useEffect(() => { ... }, []);

  // --- handleKeyPress, applyPreset (Keep as is) ---
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

  // Update showResultsArea condition: show if loading, or if there are status messages/error, or if a final problem exists
  const showResultsArea =
    isLoading ||
    statusMessages.length > 1 ||
    generatedProblem !== null ||
    error;

  return (
    <div className="text-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* --- Input Section (No changes needed here) --- */}
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

        {/* --- Problem Type Presets (No changes needed here) --- */}
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

        {/* --- Results / Status Area (Updated) --- */}
        {showResultsArea && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[150px] max-h-[70vh] overflow-y-auto mt-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              생성 상태 및 결과:
            </h3>
            {/* Status Messages (No change needed) */}
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
            {/* Error Display (No change needed) */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">
                <strong>오류:</strong> {error}
              </div>
            )}
            {/* Final Problem Detail Display (Updated) */}
            {generatedProblem && !isLoading && (
              <div className="mt-5 space-y-4">
                {" "}
                {/* Increased spacing */}
                <div className="border border-gray-200 bg-white p-4 rounded-lg">
                  <div className="mb-3">
                    <span className="font-semibold text-xl">
                      {" "}
                      {/* Larger Title */}
                      {generatedProblem.targetLanguage &&
                      generatedProblem.title_translated
                        ? generatedProblem.title_translated
                        : generatedProblem.title}
                    </span>
                  </div>
                  <div className="mb-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        // Adjust styling based on difficulty value if needed
                        generatedProblem.difficulty === "쉬움" ||
                        generatedProblem.difficulty === "Easy"
                          ? "bg-green-100 text-green-800"
                          : generatedProblem.difficulty === "보통" ||
                            generatedProblem.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {/* Display Korean or English based on preference/mapping */}
                      {difficultyMap[generatedProblem.difficulty] ||
                        generatedProblem.difficulty}
                    </span>
                  </div>

                  {/* Render Description using ReactMarkdown */}
                  <div className="mb-4 prose prose-sm max-w-none text-gray-700">
                    <h4 className="font-semibold mb-2 text-base">문제 내용:</h4>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {generatedProblem.targetLanguage &&
                      generatedProblem.description_translated
                        ? generatedProblem.description_translated
                        : generatedProblem.description}
                    </ReactMarkdown>
                  </div>

                  {/* REMOVED separate constraints block */}

                  {/* Display other relevant details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 border-t pt-4 mt-4">
                    <div>
                      <span className="font-medium text-gray-800">
                        Problem ID:
                      </span>{" "}
                      {generatedProblem.problemId}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">
                        Language:
                      </span>{" "}
                      {generatedProblem.language}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">Status:</span>{" "}
                      {generatedProblem.generationStatus}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">
                        Created:
                      </span>{" "}
                      {new Date(generatedProblem.createdAt).toLocaleString()}
                    </div>
                    {generatedProblem.targetLanguage && (
                      <div>
                        <span className="font-medium text-gray-800">
                          Translation:
                        </span>{" "}
                        {generatedProblem.targetLanguage}
                      </div>
                    )}
                    {generatedProblem.completedAt && (
                      <div>
                        <span className="font-medium text-gray-800">
                          Completed:
                        </span>{" "}
                        {new Date(
                          generatedProblem.completedAt
                        ).toLocaleString()}
                      </div>
                    )}
                    {generatedProblem.analyzedIntent && (
                      <div className="col-span-1 md:col-span-2">
                        <span className="font-medium text-gray-800">
                          Analyzed Intent:
                        </span>{" "}
                        {generatedProblem.analyzedIntent}
                      </div>
                    )}
                    {/* Optionally show snippets or confirmation for code/specs */}
                    {generatedProblem.solutionCode && (
                      <div>
                        <span className="font-medium text-gray-800">
                          Solution Code:
                        </span>{" "}
                        Generated
                      </div>
                    )}
                    {generatedProblem.testGeneratorCode && (
                      <div>
                        <span className="font-medium text-gray-800">
                          Test Gen Code:
                        </span>{" "}
                        Generated
                      </div>
                    )}
                    {generatedProblem.testSpecifications && (
                      <div>
                        <span className="font-medium text-gray-800">
                          Test Specs:
                        </span>{" "}
                        Generated (JSON)
                      </div>
                    )}
                    {generatedProblem.constraints && (
                      <div>
                        <span className="font-medium text-gray-800">
                          Constraints Data:
                        </span>{" "}
                        Generated (JSON)
                      </div>
                    )}
                  </div>

                  {/* Go to Solve button */}
                  <div className="mt-6 flex justify-center">
                    <Link
                      href={`/coding-test/solve?id=${generatedProblem.problemId}`}
                      className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition text-center"
                    >
                      풀러가기
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {/* Optional: Show a loading indicator specifically for the result area if needed */}
            {isLoading && statusMessages.length > 1 && !generatedProblem && (
              <div className="text-center text-gray-500 text-sm">
                문제 생성 중...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateProblemClient;
