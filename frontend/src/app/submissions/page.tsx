"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  getSubmissions,
  SubmissionSummary,
  GetSubmissionsParams,
} from "@/api/submissionApi"; // API 함수 및 타입 import
import { toast } from "sonner";
import { format, isValid, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

const formatSubmissionTime = (timeValue: string | number | undefined | null): string => {
  if (timeValue === null || timeValue === undefined || String(timeValue).trim() === "") {
    // console.warn(`formatSubmissionTime received empty or invalid value: ${timeValue}`); // Can be noisy
    return "N/A";
  }

  let dateToFormat: Date | number;

  if (typeof timeValue === 'number') {
    dateToFormat = new Date(timeValue * 1000); 
  }
  else if (typeof timeValue === 'string') {
    if (/^\d+$/.test(timeValue)) {
      dateToFormat = new Date(parseInt(timeValue, 10) * 1000); 
    }
    else {
      dateToFormat = parseISO(timeValue);
    }
  }
  else {
    console.warn(`formatSubmissionTime received unhandled type: ${typeof timeValue}, value: ${timeValue}`);
    return String(timeValue); 
  }

  if (isValid(dateToFormat)) {
    try {
      return format(dateToFormat, "yyyy-MM-dd HH:mm:ss", { locale: ko });
    } catch (formatError) {
      console.error(`Error formatting date '${dateToFormat}':`, formatError);
      return String(timeValue); 
    }
  } else {
    // console.warn(`Failed to parse '${timeValue}' into a valid date.`); // Can be noisy
    return String(timeValue); 
  }
};

const getStatusClass = (status: SubmissionSummary["status"]) => {
  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-800";
    case "WRONG_ANSWER":
      return "bg-red-100 text-red-800";
    case "TIME_LIMIT_EXCEEDED":
      return "bg-yellow-100 text-yellow-800";
    case "RUNTIME_ERROR":
      return "bg-purple-100 text-purple-800";
    case "INTERNAL_ERROR":
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusKorean = (status: SubmissionSummary["status"]): string => {
  const map = {
    ACCEPTED: "정답",
    WRONG_ANSWER: "오답",
    TIME_LIMIT_EXCEEDED: "시간 초과",
    RUNTIME_ERROR: "런타임 오류",
    INTERNAL_ERROR: "내부 오류",
  };
  return map[status] || "알 수 없음";
};

const SubmissionsContent: React.FC = () => {
  const searchParamsHook = useSearchParams();

  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

   
  const [filterUserId, setFilterUserId] = useState(
    searchParamsHook.get("userId") || "",
  );
  const [filterAuthor, setFilterAuthor] = useState(
    searchParamsHook.get("author") || "",
  );
  const [filterProblemTitle, setFilterProblemTitle] = useState(
    searchParamsHook.get("problemTitle") || "",
  );
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const PAGE_SIZE = 20;

  const fetchSubmissions = useCallback(
    async (loadMore = false, keyForThisFetch?: string | null) => {
      setIsLoading(true);
      // Error will be cleared at the start of the try block

      const params: GetSubmissionsParams = {
        pageSize: PAGE_SIZE,
        sortOrder,
      };
      if (filterUserId) params.userId = filterUserId;
      if (filterAuthor) params.author = filterAuthor;
      if (filterProblemTitle) {
        params.problemTitleTranslated = filterProblemTitle;
      }
      
      if (loadMore && keyForThisFetch) {
        params.lastEvaluatedKey = keyForThisFetch;
      }

      try {
        setError(null); // Clear previous error before new attempt
        const response = await getSubmissions(params);
        if (loadMore) {
          setSubmissions((prev) => [...prev, ...response.items]);
        } else {
          setSubmissions(response.items); // Reset for new search/filter
        }
        setLastEvaluatedKey(response.lastEvaluatedKey); // Set key for *next* potential fetch
        setHasMore(
          !!response.lastEvaluatedKey && response.items.length === PAGE_SIZE,
        );
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "제출 목록을 불러오는데 실패했습니다.";
        setError(errorMsg);
        if (!loadMore) { // If initial/filter fetch fails, clear items
            setSubmissions([]);
            setHasMore(false); // No items means no more, or error prevents knowing
        }
        // For loadMore error, we keep existing items and button, but show error.
        // `hasMore` might remain true if the error was transient.
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    // Dependencies for useCallback:
    // These are the values from the component scope that the function closes over.
    // `lastEvaluatedKey` (state) is NOT a dependency here.
    // State setters (setSubmissions, etc.) are stable and don't need to be listed,
    // but linters might suggest them. PAGE_SIZE is a const within render so not a dep.
    [filterUserId, filterAuthor, filterProblemTitle, sortOrder, PAGE_SIZE] 
    // Note: Added PAGE_SIZE as it's used. If it were a prop/state, it'd be essential.
    // As a local const, its value is fixed per render cycle where useCallback is defined.
    // For full strictness, all used state setters & imported functions could be listed,
    // but the primary drivers of change for this callback's identity are filters/sortOrder.
  );

  // Effect for initial load and when filters/sortOrder change (which recreates fetchSubmissions)
  useEffect(() => {
    // Fetch the *first page* of data. `loadMore` is false, `keyForThisFetch` is undefined.
    fetchSubmissions(false);
  }, [fetchSubmissions]); // `fetchSubmissions` is a dependency. It changes when its own deps change.

  // Look for problemId in URL params and convert to problem title if needed
  useEffect(() => {
    const problemId = searchParamsHook.get("problemId");
    if (problemId && !filterProblemTitle) {
      // If we have a problemId in the URL but no problem title,
      // we could try to fetch the problem name from the API here in the future
      // For now, just provide a basic identifier from the ID
      const shortId = problemId.substring(0, 8);
      setFilterProblemTitle(`문제 ${shortId}...`);
    }
  }, [searchParamsHook, filterProblemTitle]);

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      // For "Load More", pass `true` for `loadMore` and the current `lastEvaluatedKey` from state.
      fetchSubmissions(true, lastEvaluatedKey);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 md:mb-0">
          제출 현황
        </h1>
        <Link
          href="/coding-test"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition text-sm"
        >
          코딩 테스트로 돌아가기
        </Link>
      </div>

      <div className="mb-6 p-4 bg-white shadow-sm rounded-lg border">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 문제 제목 필터 */}
          <div className="lg:col-span-2">
            <label
              htmlFor="problemTitleFilter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              문제 제목 (한글)
            </label>
            <div className="relative">
              <input
                type="text"
                id="problemTitleFilter"
                value={filterProblemTitle}
                onChange={(e) => setFilterProblemTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
                placeholder="문제이름"
              />
              {filterProblemTitle && (
                <div className="absolute right-2 top-2">
                  <button
                    onClick={() => setFilterProblemTitle('')}
                    className="text-gray-400 hover:text-gray-600"
                    title="문제 필터 지우기"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 작성자 필터 */}
          <div>
            <label
              htmlFor="authorFilter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              작성자 (닉네임)
            </label>
            <div className="relative">
              <input
                type="text"
                id="authorFilter"
                value={filterAuthor}
                onChange={(e) => setFilterAuthor(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
                placeholder="asdf"
              />
              {filterAuthor && (
                <div className="absolute right-2 top-2">
                  <button
                    onClick={() => setFilterAuthor('')}
                    className="text-gray-400 hover:text-gray-600"
                    title="작성자 필터 지우기"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {filterUserId && (
              <div className="mt-1 text-xs text-gray-500">
                사용자 ID가 설정된 경우 우선 적용됨
              </div>
            )}
          </div>

          {/* 정렬 필터 */}
          <div>
            <label
              htmlFor="sortOrderFilter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              정렬
            </label>
            <select
              id="sortOrderFilter"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "ASC" | "DESC")}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary bg-white"
            >
              <option value="DESC">최신순 (기본값)</option>
              <option value="ASC">오래된순</option>
            </select>
          </div>
        </div>
        
        {/* 활성 필터 표시 */}
        {(filterUserId || filterAuthor || filterProblemTitle) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-blue-700">
                <span className="font-medium">특정 사용자 &quot;asdf&quot;의 제출만 표시 중</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {filterProblemTitle && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      문제: &quot;{filterProblemTitle}&quot;
                    </span>
                  )}
                  {(filterUserId || filterAuthor) && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {filterUserId && filterAuthor 
                        ? `작성자: "${filterAuthor}" (ID 우선)`
                        : filterAuthor 
                          ? `작성자: "${filterAuthor}"`
                          : "사용자 ID로 필터링"}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => {
                  setFilterProblemTitle('');
                  setFilterAuthor('');
                  setFilterUserId('');
                }}
                className="text-xs bg-white px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                필터 초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading && submissions.length === 0 ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">제출 목록을 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-medium">오류 발생</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          조건에 맞는 제출 내역이 없습니다.
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    문제
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    결과
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    실행 시간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    언어
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제출자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제출 시각
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((sub) => (
                  <tr key={sub.submissionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/coding-test/result?id=${sub.problemId}&submissionId=${sub.submissionId}`}
                        className="text-sm text-primary hover:underline truncate block max-w-[100px] sm:max-w-[120px]"
                        title={sub.submissionId}
                      >
                        {sub.submissionId.substring(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/coding-test/solve?id=${sub.problemId}`}
                        className="text-sm text-gray-700 hover:text-primary hover:underline max-w-[120px] sm:max-w-[180px]"
                        title={sub.problemTitleTranslated || sub.problemTitle || sub.problemId}
                      >
                        {sub.problemTitleTranslated || sub.problemTitle || `문제 ${sub.problemId.substring(0, 8)}...`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(sub.status)}`}
                      >
                        {getStatusKorean(sub.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {sub.executionTime !== undefined && sub.executionTime !== null
                        ? `${sub.executionTime.toFixed(3)} 초`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {sub.language || "-"}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 truncate max-w-[100px] sm:max-w-[150px]"
                      title={sub.author}
                    >
                      {sub.author}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatSubmissionTime(sub.submissionTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm disabled:opacity-50"
              >
                {isLoading ? "로딩 중..." : "더 보기"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SubmissionsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>제출 현황 | ALPACO</title>
        <meta name="description" content="코딩 테스트 제출 현황 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow">
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }
          >
            <SubmissionsContent />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SubmissionsPage;