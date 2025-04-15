"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
// Import the updated API function
import { streamChatbotResponse } from "../api/chatbotApi";
import { toast } from "sonner";
// Remove Langchain imports
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import {
//   SystemMessage,
//   HumanMessage,
//   AIMessage,
// } from "@langchain/core/messages";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

// Placeholder type - Define properly later
interface ProblemDetailPlaceholder {
  id: string | number;
  title: string;
  description?: string;
}

// Define message structure - Use 'model' for AI role
interface ChatMessage {
  role: "user" | "model"; // Changed 'assistant' to 'model' if backend uses that
  content: string;
}

// Define component props
interface ChatbotProps {
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

  // Remove Langchain model state
  // const [chatModel, setChatModel] = useState<ChatGoogleGenerativeAI | null>(
  //   null
  // );
  // const [initError, setInitError] = useState<string | null>(null);
  const hasLoadedInitialHistory = useRef(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const localStorageKey = useMemo(() => {
    return problemDetails?.id ? `chatbotHistory_${problemDetails.id}` : null;
  }, [problemDetails?.id]);

  // Remove Langchain model initialization useEffect
  // useEffect(() => { ... }, []);

  // Load history from Local Storage (Keep as is)
  useEffect(() => {
    if (localStorageKey) {
      console.log(`Attempting to load history from key: ${localStorageKey}`);
      try {
        const savedHistory = localStorage.getItem(localStorageKey);
        if (savedHistory) {
          const parsedHistory: ChatMessage[] = JSON.parse(savedHistory);
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
            localStorage.removeItem(localStorageKey);
          }
        } else {
          console.log("No previous history found in localStorage.");
        }
      } catch (error) {
        console.error(
          "Failed to load or parse history from localStorage:",
          error
        );
        localStorage.removeItem(localStorageKey);
      }
      hasLoadedInitialHistory.current = true;
    }
  }, [localStorageKey]);

  // Save history to Local Storage (Keep as is)
  useEffect(() => {
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
        toast.error("채팅 기록을 저장하지 못했습니다.");
      }
    } else if (
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

  // Scroll to bottom effect (Keep as is)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  // Input change handler (Keep as is)
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(event.target.value);
  };

  // Clear history handlers (Keep as is)
  const handleClearHistory = () => {
    setShowClearConfirm(true);
  };

  const confirmClearHistory = () => {
    if (!localStorageKey) {
      toast.error("기록을 삭제할 수 없습니다: 문제 ID를 찾을 수 없습니다.");
      return;
    }
    console.log(`Clearing history for key: ${localStorageKey}`);
    setMessages([]);
    setStreamingResponse("");
    try {
      localStorage.removeItem(localStorageKey);
      toast.success("채팅 기록이 삭제되었습니다.");
    } catch (error) {
      console.error("Failed to remove history from localStorage:", error);
      toast.error("저장소에서 채팅 기록을 삭제하지 못했습니다.");
    }
  };

  // Remove system prompt memoization, handled by backend now
  // const systemPromptContent = useMemo(() => { ... }, [problemDetails?.title]);

  const handleSendMessage = async () => {
    const messageToSend = userInput.trim();
    if (!messageToSend || isLoading) {
      return;
    }

    setIsLoading(true);
    setStreamingResponse(""); // Clear previous streaming buffer
    const newUserMessage: ChatMessage = {
      role: "user",
      content: messageToSend,
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setUserInput(""); // Clear input field immediately

    // Prepare context, filtering out the currently streaming response placeholder if any
    const historyForBackend = messages.filter(
      (msg) => msg.role !== "model" || msg.content !== "..."
    ); // Exclude placeholder if needed

    const context = {
      problemDetails: problemDetails,
      userCode: userCode,
      history: historyForBackend, // Send previous messages
    };

    let accumulatedResponse = ""; // Accumulate tokens locally

    try {
      console.log("Calling streamChatbotResponse...");
      await streamChatbotResponse(context, messageToSend, {
        onData: (token) => {
          // Append token to local accumulator and update state for UI
          accumulatedResponse += token;
          setStreamingResponse(accumulatedResponse);
        },
        onError: (error) => {
          console.error("Chatbot API Error:", error);
          toast.error(`AI 응답 오류: ${error.message}`); // Korean
          setIsLoading(false);
          setStreamingResponse(""); // Clear potentially partial stream
          // Optionally remove the user's last message or add an error message to history
          setMessages((prev) => prev.slice(0, -1)); // Remove last user message on error
        },
        onComplete: () => {
          console.log("Chatbot stream complete.");
          if (accumulatedResponse) {
            // Add the complete message from the stream to the history
            setMessages((prevMessages) => [
              ...prevMessages,
              { role: "model", content: accumulatedResponse },
            ]);
          }
          // Clear the streaming state and loading indicator
          setStreamingResponse("");
          setIsLoading(false);
        },
      });
    } catch (error) {
      // Catch errors from streamChatbotResponse setup itself (e.g., auth error)
      console.error("Error setting up chatbot stream:", error);
      toast.error(
        `AI 연결 오류: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsLoading(false);
      setStreamingResponse("");
      setMessages((prev) => prev.slice(0, -1)); // Remove last user message on setup error
    }
  };

  // Key down handler for Enter key (Keep as is)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent default form submission/newline
      handleSendMessage();
    }
  };

  // JSX Rendering (Update to display streamingResponse)
  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-border relative">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-white sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-textPrimary">AI Assistant</h2>
        <button
          onClick={handleClearHistory}
          disabled={isLoading || messages.length === 0}
          className="p-1.5 text-gray-500 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Clear chat history"
          title="Clear chat history"
        >
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

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                message.role === "user"
                  ? "bg-primary-200 text-neutral-700"
                  : "bg-white text-textPrimary border border-border"
              }`}
            >
              {/* Render content with markdown support */}
              <div className="text-sm font-sans whitespace-pre-wrap break-words">
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
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {/* Display streaming response */}
        {isLoading && streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg shadow-sm bg-white text-textPrimary border border-border">
              <div className="text-sm font-sans whitespace-pre-wrap break-words">
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
                  }}
                >
                  {streamingResponse}
                </ReactMarkdown>
                <span className="inline-block w-2 h-4 ml-1 bg-gray-600 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        {/* Placeholder when loading starts but no response yet */}
        {isLoading && !streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg shadow-sm bg-white text-textPrimary border border-border">
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse rounded-full" />
              <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse rounded-full" />
              <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse rounded-full" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* Element to scroll to */}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-white sticky bottom-0">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="AI에게 질문하세요..." // Korean placeholder
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !userInput.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearHistory}
        title="기록 삭제 확인" // Korean
        message="정말로 모든 채팅 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다." // Korean
      />
    </div>
  );
};

export default Chatbot;
