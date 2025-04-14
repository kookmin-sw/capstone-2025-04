"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
// import type { ProblemDetail } from "@/types/problem"; // Assuming ProblemDetail type exists - Placeholder below
// import { sendChatMessage } from "../api/chatbotApi"; // Import the API function
import { toast } from "sonner"; // Use toast for error messages
// Langchain imports
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "@langchain/core/messages";

// Placeholder type - Define properly later
interface ProblemDetailPlaceholder {
  id: string | number;
  title: string;
  description?: string; // Add description for prompt context
  // Add other relevant fields from the actual type
}

// Define message structure - Use 'model' for AI role consistent with Langchain Gemini
interface ChatMessage {
  role: "user" | "model";
  content: string;
}

// Define component props
interface ChatbotProps {
  // TODO: Define ProblemDetail type properly based on codingTestApi.ts or types definition
  problemDetails: ProblemDetailPlaceholder | null;
  userCode: string;
}

// Simple Modal Component for Confirmation (Korean Text)
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-auto">
        <h3 className="text-lg font-semibold text-textPrimary mb-4">{title}</h3>
        <p className="text-sm text-textSecondary mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-textSecondary bg-background hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          >
            취소
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-error hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-1"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

const Chatbot: React.FC<ChatbotProps> = ({ problemDetails, userCode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for scrolling

  // State to hold the initialized Langchain model
  const [chatModel, setChatModel] = useState<ChatGoogleGenerativeAI | null>(
    null
  );
  const [initError, setInitError] = useState<string | null>(null);
  const hasLoadedInitialHistory = useRef(false); // Prevent writing initial empty state
  const [showClearConfirm, setShowClearConfirm] = useState(false); // State for modal visibility

  // Generate unique key for local storage based on problem ID
  const localStorageKey = useMemo(() => {
    return problemDetails?.id ? `chatbotHistory_${problemDetails.id}` : null;
  }, [problemDetails?.id]);

  // Initialize the Langchain Chat Model
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key not found in environment variables.");
      setInitError("API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요."); // Korean
      return;
    }
    try {
      const model = new ChatGoogleGenerativeAI({
        apiKey,
        model: "gemini-2.0-flash-lite",
        streaming: true,
        // Optional: Add safety settings if needed
        // safetySettings: [
        //   {
        //     category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        //     threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        //   },
        // ],
      });
      setChatModel(model);
      setInitError(null); // Clear any previous init error
      console.log("ChatGoogleGenerativeAI model initialized.");
    } catch (error) {
      console.error(
        "Failed to initialize ChatGoogleGenerativeAI model:",
        error
      );
      const errMsg = "AI 모델 초기화에 실패했습니다."; // Korean
      setInitError(errMsg);
      toast.error(errMsg);
    }
  }, []); // Run only once on mount

  // Load history from Local Storage when problemDetails/key is available
  useEffect(() => {
    if (localStorageKey) {
      console.log(`Attempting to load history from key: ${localStorageKey}`);
      try {
        const savedHistory = localStorage.getItem(localStorageKey);
        if (savedHistory) {
          const parsedHistory: ChatMessage[] = JSON.parse(savedHistory);
          // Basic validation
          if (
            Array.isArray(parsedHistory) &&
            parsedHistory.every((m) => m.role && m.content !== undefined)
          ) {
            setMessages(parsedHistory);
            console.log(
              `Loaded ${parsedHistory.length} messages from localStorage.`
            );
          } else {
            console.warn("Invalid history format found in localStorage.");
            localStorage.removeItem(localStorageKey); // Clear invalid data
          }
        } else {
          console.log("No previous history found in localStorage.");
        }
      } catch (error) {
        console.error(
          "Failed to load or parse history from localStorage:",
          error
        );
        // Optionally clear corrupted data
        localStorage.removeItem(localStorageKey);
      }
      hasLoadedInitialHistory.current = true; // Mark that we've attempted loading
    }
  }, [localStorageKey]); // Rerun when the key changes (new problem loaded)

  // Save history to Local Storage whenever messages change (after initial load)
  useEffect(() => {
    // Only save if we have a key, messages exist, and initial load attempt finished
    if (
      localStorageKey &&
      messages.length > 0 &&
      hasLoadedInitialHistory.current
    ) {
      console.log(
        `Saving ${messages.length} messages to key: ${localStorageKey}`
      );
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(messages));
      } catch (error) {
        console.error("Failed to save history to localStorage:", error);
        toast.error("채팅 기록을 저장하지 못했습니다."); // Korean
      }
    }
    // If messages become empty AFTER initial load, clear storage
    else if (
      localStorageKey &&
      messages.length === 0 &&
      hasLoadedInitialHistory.current
    ) {
      console.log(`Clearing history for key: ${localStorageKey}`);
      try {
        localStorage.removeItem(localStorageKey);
      } catch (error) {
        console.error("Failed to remove history from localStorage:", error);
      }
    }
  }, [messages, localStorageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom(); // Scroll when messages or streamingResponse changes
  }, [messages, streamingResponse]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(event.target.value);
  };

  // Function to open the confirmation modal
  const handleClearHistory = () => {
    setShowClearConfirm(true);
  };

  // Function to actually perform the clear action (called by modal)
  const confirmClearHistory = () => {
    if (!localStorageKey) {
      toast.error("기록을 삭제할 수 없습니다: 문제 ID를 찾을 수 없습니다."); // Korean
      return;
    }
    console.log(`Clearing history for key: ${localStorageKey}`);
    setMessages([]);
    setStreamingResponse("");
    try {
      localStorage.removeItem(localStorageKey);
      toast.success("채팅 기록이 삭제되었습니다."); // Korean
    } catch (error) {
      console.error("Failed to remove history from localStorage:", error);
      toast.error("저장소에서 채팅 기록을 삭제하지 못했습니다."); // Korean
    }
  };

  // System prompt construction using useMemo for stability
  const systemPromptContent = useMemo(() => {
    return `You are an AI assistant embedded in a coding test platform called ALPACO. Your goal is to help users solve programming problems without giving away the direct solution or writing complete code for them. Focus on providing hints, explaining concepts, clarifying problem statements, and suggesting debugging strategies based on the user's code and the problem description. Do NOT provide the final answer or complete code snippets that solve the problem. Be encouraging and supportive. The user is currently working on the problem titled '${
      problemDetails?.title || "Unknown Problem"
    }'.`;
  }, [problemDetails?.title]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading || !chatModel) {
      if (!chatModel) {
        toast.error(initError || "AI 모델이 초기화되지 않았습니다."); // Korean
      }
      return;
    }
    if (initError) {
      toast.error(initError); // initError already in Korean
      return;
    }

    const newUserMessage: ChatMessage = { role: "user", content: userInput };
    const currentInput = userInput;
    setUserInput("");

    // Add user message immediately
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);

    setIsLoading(true);
    setStreamingResponse("");
    let accumulatedResponse = "";
    let errorOccurred = false;

    try {
      // Construct Langchain message history
      const history = messages.map((msg) => {
        return msg.role === "user"
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content);
      });

      // Include problem details and user code in the context of the latest message
      const contextString = `Problem Description:\n${
        problemDetails?.description || "Not available"
      }\n\nUser Code:\n${userCode || "Not provided"}`;
      const latestHumanMessage = new HumanMessage(
        `${currentInput}\n\nContext:\n${contextString}`
      );

      const messagesToSend = [
        new SystemMessage(systemPromptContent),
        ...history,
        latestHumanMessage,
      ];

      console.log("Sending messages to Langchain Gemini:", messagesToSend);

      // Call the Langchain model's stream method
      const stream = await chatModel.stream(messagesToSend);

      // Process the stream
      for await (const chunk of stream) {
        if (chunk?.content) {
          const content = chunk.content as string; // Content is expected to be string
          accumulatedResponse += content;
          setStreamingResponse(accumulatedResponse);
        } else {
          console.warn("Received stream chunk without content:", chunk);
        }
      }
      console.log("Stream finished.");
    } catch (error) {
      console.error("Error during Gemini stream:", error);
      toast.error(
        `AI 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      ); // Korean
      errorOccurred = true;
    } finally {
      setIsLoading(false);
      // Add the complete assistant message if no error occurred and response exists
      if (!errorOccurred && accumulatedResponse.trim()) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "model", content: accumulatedResponse.trim() },
        ]);
      }
      setStreamingResponse(""); // Clear the streaming area
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Display initialization error if present
  if (initError && !chatModel) {
    return (
      <div className="flex flex-col h-full bg-background border border-error rounded-lg items-center justify-center p-4">
        <p className="text-error font-semibold">AI Assistant 오류</p>
        <p className="text-error text-sm mt-1">{initError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border border-gray-300 rounded-lg">
      {/* Header with Clear Button */}
      <div className="p-3 border-b border-gray-300 bg-gray-100 rounded-t-lg flex-shrink-0 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700">AI Assistant</h2>
        <button
          onClick={handleClearHistory} // Opens the modal
          title="채팅 기록 삭제" // Korean
          className="text-gray-500 hover:text-red-600 transition-colors duration-150 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          disabled={messages.length === 0 && !streamingResponse} // Disable if already empty
        >
          {/* Simple Trash Icon SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Message List Area */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-xs lg:max-w-md break-words ${
                msg.role === "user"
                  ? "bg-blue-500 text-white" // User message style
                  : "bg-gray-200 text-gray-800" // Model message style
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {/* Display streaming response from the model */}
        {streamingResponse && (
          <div className="flex justify-start">
            <div className="p-3 rounded-lg max-w-xs lg:max-w-md bg-gray-200 text-gray-800 break-words">
              {streamingResponse}
              {/* Simple pulse for loading indicator during streaming */}
              {isLoading && (
                <span className="inline-block w-2 h-2 ml-1 bg-gray-500 rounded-full animate-pulse"></span>
              )}
            </div>
          </div>
        )}
        {/* Placeholder while waiting for the first token */}
        {isLoading &&
          !streamingResponse &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="flex justify-start">
              <div className="p-3 rounded-lg max-w-xs lg:max-w-md bg-gray-200 text-gray-800">
                <span className="animate-pulse">▮</span>{" "}
                {/* Simple pulsing block */}
              </div>
            </div>
          )}
        {/* Element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-300 bg-gray-100 rounded-b-lg flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder={initError ? "AI 사용 불가" : "질문을 입력하세요..."} // Korean
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !chatModel || !!initError}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-200"
          />
          <button
            onClick={handleSendMessage}
            disabled={
              isLoading || !chatModel || !userInput.trim() || !!initError
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </div>

      {/* Confirmation Modal (Korean Text) */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearHistory}
        title="채팅 기록 삭제"
        message="이 문제에 대한 채팅 기록을 영구적으로 삭제하시겠습니까?"
      />
    </div>
  );
};

export default Chatbot;
