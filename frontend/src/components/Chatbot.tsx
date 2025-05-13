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
import type { ProblemDetailAPI } from "@/api/generateProblemApi";
import Image from "next/image";

// Define message structure - Use 'model' for AI role
interface ChatMessage {
  role: "user" | "model"; // Changed 'assistant' to 'model' if backend uses that
  content: string;
}

// Define component props
interface ChatbotProps {
  problemDetails: ProblemDetailAPI | null;
  userCode: string;
  userInput: string; // New prop for controlled input
  setUserInput: (input: string) => void; // New prop for updating input
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

const Chatbot: React.FC<ChatbotProps> = ({ 
    problemDetails, 
    userCode,
    userInput, // Use prop
    setUserInput, // Use prop
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamingResponse, setStreamingResponse] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for scrolling
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for textarea

  const hasLoadedInitialHistory = useRef(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const localStorageKey = useMemo(() => {
    return problemDetails?.problemId
      ? `chatbotHistory_${problemDetails.problemId}`
      : null;
  }, [problemDetails?.problemId]);


  // Load history from Local Storage
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

  // Save history to Local Storage
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
      } catch (error)
        {
        console.error("Failed to remove history from localStorage:", error);
      }
    }
  }, [messages, localStorageKey]);

  // Scroll to bottom effect
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  // userInput이 변경될 때 사용자 입력과 외부 입력 구분
  const prevInputRef = useRef(userInput);
  const isUserTypingRef = useRef(false);
  
  // 사용자가 직접 입력 중인지 감지
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    isUserTypingRef.current = true;
    setUserInput(event.target.value);
  };
  
  // userInput이 변경될 때 효과
  useEffect(() => {
    // 이전 입력값과 현재 입력값 비교
    const prevInput = prevInputRef.current;
    
    // 사용자가 직접 타이핑하지 않았고, 이전 값과 다르면 외부에서 설정된 것으로 판단
    if (!isUserTypingRef.current && userInput !== prevInput) {
      // 외부에서 설정된 경우, 커서를 끝으로 이동
      if (textareaRef.current) {
        const length = userInput.length;
        setTimeout(() => {
          // 비동기로 처리하여 React 렌더링 사이클 이후에 포커스 설정
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(length, length);
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
          }
        }, 0);
      }
    }
    
    // 상태 업데이트
    prevInputRef.current = userInput;
    isUserTypingRef.current = false;
    
  }, [userInput]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      // Store current scroll position
      const scrollPosition = textareaRef.current.scrollTop;
      
      // Temporarily shrink it back to auto to measure the real content height
      textareaRef.current.style.height = "auto";
      
      // Get the proper scrollHeight
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Get the parent container height and calculate maxHeight as 1/3 of it
      const chatContainer = document.querySelector('.chat-container');
      const parentHeight = chatContainer ? chatContainer.clientHeight : window.innerHeight;
      const maxHeight = Math.max(200, Math.floor(parentHeight / 3));
      
      // Apply the new height
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = "hidden";
      }
      
      // Restore scroll position if needed
      if (scrollHeight > maxHeight) {
        textareaRef.current.scrollTop = scrollPosition;
      }
    }
  }, [userInput]); // Adjust height whenever userInput changes

  // Clear history handlers
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


  const handleSendMessage = async () => {
    const messageToSend = userInput.trim(); // Use prop userInput
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
    setUserInput(""); // Clear input field immediately using prop setUserInput
    if (textareaRef.current) { // Reset textarea height after sending
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }


    // Prepare context, filtering out the currently streaming response placeholder if any
    const historyForBackend = messages.filter(
      (msg) => msg.role !== "model" || msg.content !== "..."
    ); // Exclude placeholder if needed

    // Map ProblemDetailAPI to ProblemDetailPlaceholder for backend compatibility
    const mappedProblemDetails = problemDetails
      ? {
          id: problemDetails.problemId || "",
          title: problemDetails.title,
          description: problemDetails.description,
        }
      : null;

    const context = {
      problemDetails: mappedProblemDetails,
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

  // Key down handler for Enter key: Use prop userInput
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent default form submission/newline
      handleSendMessage();
    }
    // Allow Shift+Enter for new lines naturally with textarea
  };

  // Helper component for rendering markdown content
  const MarkdownContent = ({ content }: { content: string }) => (
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
      {content}
    </ReactMarkdown>
  );

  // JSX Rendering with the alpaca profile image
  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-border relative chat-container">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <Image 
              src="/alpaco-chatbot-profile.png" 
              alt="Alpaco Chatbot" 
              width={32} 
              height={32} 
              className="object-cover"
            />
          </div>
          <div className="flex flex-col space-y-0 -mt-1">
            <h2 className="text-lg font-semibold text-primary-700 leading-none mb-0.5">AI 핼퍼 알파코</h2>
            <p className="text-xs text-gray-500 leading-tight">언제든지 물어보세요! 🦙✨</p>
          </div>
        </div>
        <button
          onClick={handleClearHistory}
          disabled={isLoading || messages.length === 0}
          className="p-1.5 text-gray-500 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Clear chat history"
          title="채팅 기록 삭제"
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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-32 h-32 mb-6 rounded-full overflow-hidden border-4 border-primary-100 shadow-md">
              <Image 
                src="/alpaco-chatbot-profile.png" 
                alt="Alpaco Chatbot" 
                width={128} 
                height={128} 
                className="object-cover"
              />
            </div>
            <h3 className="text-xl font-semibold text-primary-700 mb-2">안녕하세요! 알파코예요! 🦙</h3>
            <p className="text-gray-600 max-w-md mb-2 break-keep">코딩 문제 해결을 도와드릴게요. <br/> 무엇이든 물어보세요!</p>
            <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded-lg max-w-sm mt-2">
              <p className="font-medium mb-1">💡 이런 것들을 물어볼 수 있어요:</p>
              <ul className="list-disc pl-5 text-left">
                <li>문제 해석이 어려워요</li>
                <li>알고리즘 접근 방법이 떠오르지 않아요</li>
                <li>코드에서 오류가 발생했어요</li>
                <li>시간 복잡도를 개선하고 싶어요</li>
              </ul>
            </div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } items-end space-x-2`}
          >
            {message.role === "model" && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <Image 
                  src="/alpaco-chatbot-profile.png" 
                  alt="Alpaco" 
                  width={32} 
                  height={32} 
                  className="object-cover"
                />
              </div>
            )}
            
            <div
              className={`max-w-[75%] p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-primary-200 text-neutral-700 rounded-br-none"
                  : "bg-white text-textPrimary border border-border rounded-bl-none"
              }`}
            >
              <div className="text-sm font-sans whitespace-pre-wrap break-words">
                <MarkdownContent content={message.content} />
              </div>
            </div>
            
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            )}
          </div>
        ))}
        
        {/* Display streaming response */}
        {isLoading && streamingResponse && (
          <div className="flex justify-start items-end space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <Image 
                src="/alpaco-chatbot-profile.png" 
                alt="Alpaco" 
                width={32} 
                height={32} 
                className="object-cover"
              />
            </div>
            <div className="max-w-[75%] p-3 rounded-lg bg-white text-textPrimary border border-border rounded-bl-none">
              <div className="text-sm font-sans whitespace-pre-wrap break-words">
                <MarkdownContent content={streamingResponse} />
                <span className="inline-block w-2 h-4 ml-1 bg-gray-600 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        
        {/* Placeholder when loading starts but no response yet */}
        {isLoading && !streamingResponse && (
          <div className="flex justify-start items-end space-x-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <Image 
                src="/alpaco-chatbot-profile.png" 
                alt="Alpaco" 
                width={32} 
                height={32} 
                className="object-cover"
              />
            </div>
            <div className="max-w-[75%] p-3 rounded-lg bg-white text-textPrimary border border-border rounded-bl-none">
              <div className="flex space-x-1">
                <span className="inline-block w-2 h-2 bg-gray-400 animate-pulse rounded-full" />
                <span className="inline-block w-2 h-2 bg-gray-400 animate-pulse rounded-full" />
                <span className="inline-block w-2 h-2 bg-gray-400 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} /> {/* Element to scroll to */}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-white sticky bottom-0">
        <div className="flex items-center space-x-2 overflow-visible"> {/* Changed items-end to items-center */}
          <div className="relative flex-1"> {/* Added wrapper div for textarea */}
            <textarea
              ref={textareaRef}
              rows={1} // Start with one row
              value={userInput} // Use prop userInput
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="AI에게 질문하세요..." // Korean placeholder
              disabled={isLoading}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed resize-none leading-normal min-h-[40px] transition duration-100 align-middle" // Added align-middle
              style={{ 
                height: "40px",
                boxSizing: "border-box",
                paddingBottom: "8px",
                verticalAlign: "middle",
                marginBottom: "0"
              }} // Added explicit styling to control spacing
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !userInput.trim()}
            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center" // Removed self-end
            aria-label="메시지 전송"
            title="메시지 전송"
            style={{ width: "40px", height: "40px" }} // Fixed size for button
          >
            {/* Modern send icon (paper plane) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="white"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 20l18-8-18-8v7l13 1-13 1v7z"
              />
            </svg>
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