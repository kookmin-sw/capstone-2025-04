// src/app/generate-problem/GenerateProblemClient.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation"; // Added useRouter
import Link from "next/link"; // Add import for Link

import { fetchUserAttributes } from "aws-amplify/auth"; // Import fetchUserAttributes back
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

// Progress Step Interface
interface ProgressStep {
  id: number;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  logs: string[];
}

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

// Progress Step Icons
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
  </svg>
);

const PendingIcon = () => (
  <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
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

  // Progress Steps State
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { id: 1, title: "프롬프트 분석 및 의도 추출", status: 'pending', logs: [] },
    { id: 2, title: "테스트 케이스 설계", status: 'pending', logs: [] },
    { id: 3, title: "솔루션 코드 생성", status: 'pending', logs: [] },
    { id: 4, title: "솔루션 실행 및 검증", status: 'pending', logs: [] },
    { id: 5, title: "테스트 케이스 최종화", status: 'pending', logs: [] },
    { id: 6, title: "제약 조건 도출", status: 'pending', logs: [] },
    { id: 7, title: "시작 코드 생성", status: 'pending', logs: [] },
    { id: 8, title: "문제 검증", status: 'pending', logs: [] },
    { id: 9, title: "문제 설명 생성", status: 'pending', logs: [] },
    { id: 10, title: "문제 제목 생성", status: 'pending', logs: [] },
    { id: 11, title: "번역", status: 'pending', logs: [] },
    { id: 12, title: "완료", status: 'pending', logs: [] },
  ]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  // Add global log accumulator for showing all logs in current step
  const [allGenerationLogs, setAllGenerationLogs] = useState<string[]>([]);

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

  const resetProgressSteps = useCallback(() => {
    setProgressSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      message: undefined,
      logs: []
    })));
    setAllGenerationLogs([]); // Reset global logs
  }, []);

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
      resetProgressSteps(); // Reset progress steps
      textareaRef.current?.blur();

      // Get current user session to get user ID
      try {
        const userAttributes = await fetchUserAttributes();
        const creatorId = userAttributes.sub as string;
        const username = (userAttributes.nickname as string) || (userAttributes.cognito_username as string) || undefined;
        console.log("generate-problem creatorId:", creatorId);
        const params: CreateProblemRequest = {
          prompt: currentPrompt,
          difficulty: difficultyMap[difficulty],
          creatorId: creatorId, // Add creator ID if available
          author: username, // Add author if available
        };

        try {
          // Use the new streaming function
          await streamProblemGeneration(params, {
            onStatus: (status: ProblemStreamStatus) => {
              setStatusMessages((prev) => [...prev, status.message]);
              console.log("Status update:", status);
              
              // Add to global logs
              setAllGenerationLogs(prev => [...prev, `[Step ${status.step}] ${status.message}`]);
              
              // Update progress step based on status - use status.step directly
              const stepNumber = status.step;
              if (stepNumber !== null && stepNumber !== undefined) {
                // Mark previous steps as completed
                setProgressSteps(prev => prev.map(step => {
                  if (step.id < stepNumber && step.status !== 'completed') {
                    return { ...step, status: 'completed' };
                  } else if (step.id === stepNumber) {
                    return { ...step, status: 'running', message: status.message, logs: [...step.logs, status.message] };
                  }
                  return step;
                }));
              }
            },
            onResult: (result: ProblemStreamResult) => {
              console.log("Received final result:", result);
              if (result && result.payload) {
                setGeneratedProblem(result.payload); // Set the final detailed problem
                // Optionally add a final success message to status
                setStatusMessages((prev) => [...prev, "✅ 생성 완료!"]);
                // Mark all steps as completed
                setProgressSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
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
              // Mark current step as error
              setProgressSteps(prev => prev.map(step => {
                if (step.status === 'running') {
                  return { ...step, status: 'error', logs: [...step.logs, `❌ 오류: ${error.payload}`] };
                }
                return step;
              }));
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
      } catch (err) {
        // Catch errors from fetching user session
        const errorMsg =
          err instanceof Error
            ? err.message
            : "세션 정보를 가져오는 중 알 수 없는 오류";
        setError(errorMsg);
        setStatusMessages((prev) => [...prev, `❌ 오류: ${errorMsg}`]);
        setIsLoading(false);
      }
    },
    [prompt, isLoading, difficulty, resetProgressSteps] // Added missing dependencies
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
      <div className="max-w-6xl mx-auto">
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
            
            {/* Progress Steps Display */}
            {isLoading && (
              <div className="space-y-6 mb-6">
                {/* Completed Steps - Small Checkmarks */}
                {(() => {
                  const currentStepIndex = progressSteps.findIndex(step => step.status === 'running');
                  const currentStep = currentStepIndex !== -1 ? progressSteps[currentStepIndex] : null;
                  const completedSteps = progressSteps.filter(step => step.status === 'completed');
                  const isExpanded = currentStep ? expandedSteps.has(currentStep.id) : false;
                  
                  return (
                    <>
                      {/* Completed Steps Indicators */}
                      {completedSteps.length > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 shadow-sm">
                          <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex items-center space-x-2">
                              <div className="bg-green-500 text-white rounded-full p-1">
                                <CheckIcon />
                              </div>
                              <span className="text-sm font-semibold text-green-800">완료된 단계</span>
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                {completedSteps.length}/12
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {completedSteps.map((step) => (
                              <div key={step.id} className="flex items-center space-x-2 bg-white bg-opacity-70 text-green-700 px-3 py-2 rounded-lg text-sm font-medium shadow-sm border border-green-100">
                                <div className="bg-green-100 text-green-600 rounded-full p-0.5">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                </div>
                                <span>{step.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Current Active Step - Enhanced Main Box */}
                      {currentStep && (
                        <div className="relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl"></div>
                          <div className="relative bg-white m-0.5 rounded-xl shadow-lg">
                            <div 
                              className={`flex items-center justify-between p-6 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 ${
                                allGenerationLogs.length > 0 ? 'cursor-pointer' : 'cursor-default'
                              }`}
                              onClick={() => {
                                if (allGenerationLogs.length > 0) {
                                  setExpandedSteps(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(currentStep.id)) {
                                      newSet.delete(currentStep.id);
                                    } else {
                                      newSet.add(currentStep.id);
                                    }
                                    return newSet;
                                  });
                                }
                              }}
                            >
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0 relative">
                                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full p-3 shadow-lg">
                                    <div className="animate-spin">
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
                                        <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full p-1 animate-pulse">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                                    </svg>
                                  </div>
                                </div>
                                <div className="flex-grow">
                                  <h4 className="font-bold text-xl text-gray-800 mb-1">
                                    {currentStep.title}
                                  </h4>
                                  {currentStep.message && (
                                    <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium border-l-4 border-blue-400">
                                      {currentStep.message}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-3">
                                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                      Step {currentStep.id}/12
                                    </div>
                                    <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                                      진행 중...
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {allGenerationLogs.length > 0 && (
                                <div className="flex-shrink-0 text-blue-600 bg-blue-50 rounded-full p-2 shadow-sm">
                                  <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDownIcon />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Expandable Logs for All Progress */}
                            {isExpanded && allGenerationLogs.length > 0 && (
                              <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                                <div className="p-6">
                                  <div className="flex items-center space-x-2 mb-4">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-2">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                                      </svg>
                                    </div>
                                    <h5 className="font-bold text-gray-800">전체 진행 로그</h5>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                      {allGenerationLogs.length} 개 항목
                                    </span>
                                  </div>
                                  <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {allGenerationLogs.map((log, index) => (
                                      <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                                        <div className="flex items-start space-x-3">
                                          <div className="bg-gray-100 text-gray-600 rounded-full p-1 mt-0.5">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                            </svg>
                                          </div>
                                          <div className="flex-grow">
                                            <p className="text-sm font-mono text-gray-700 leading-relaxed">
                                              {log}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Error Step Display - Enhanced */}
                      {(() => {
                        const errorStep = progressSteps.find(step => step.status === 'error');
                        if (errorStep) {
                          return (
                            <div className="relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500 rounded-xl"></div>
                              <div className="relative bg-white m-0.5 rounded-xl shadow-lg">
                                <div className="flex items-center justify-between p-6">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                      <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full p-3 shadow-lg">
                                        <ErrorIcon />
                                      </div>
                                    </div>
                                    <div className="flex-grow">
                                      <h4 className="font-bold text-xl text-red-800 mb-1">
                                        {errorStep.title}
                                      </h4>
                                      {errorStep.message && (
                                        <p className="text-red-700 bg-red-50 px-3 py-2 rounded-lg text-sm font-medium border-l-4 border-red-400">
                                          {errorStep.message}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {errorStep.logs.length > 0 && (
                                  <div className="border-t border-red-200 bg-red-25 p-6">
                                    <div className="space-y-3">
                                      <h5 className="font-bold text-red-800 mb-3">오류 로그:</h5>
                                      {errorStep.logs.map((log, index) => (
                                        <div key={index} className="bg-white p-3 rounded-lg border border-red-200 shadow-sm">
                                          <p className="text-sm font-mono text-red-700">{log}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Fallback - Enhanced Next Pending Step */}
                      {!currentStep && !progressSteps.find(step => step.status === 'error') && (
                        (() => {
                          const nextPendingStep = progressSteps.find(step => step.status === 'pending');
                          if (nextPendingStep) {
                            return (
                              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                      <div className="bg-gray-200 text-gray-500 rounded-full p-3">
                                        <PendingIcon />
                                      </div>
                                    </div>
                                    <div className="flex-grow">
                                      <h4 className="font-semibold text-gray-600 mb-1">
                                        {nextPendingStep.title}
                                      </h4>
                                      <p className="text-gray-500 text-sm">곧 시작됩니다...</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* Status Messages (Fallback for non-loading states) */}
            {(!isLoading && statusMessages.length > 0) && (
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
