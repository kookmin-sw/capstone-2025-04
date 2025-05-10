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
    console.warn(`formatSubmissionTime received empty or invalid value: ${timeValue}`);
    return "N/A"; // 또는 다른 기본값
  }

  let dateToFormat: Date | number;

  // 1. 숫자형 타임스탬프 (초 단위라고 가정) 처리
  if (typeof timeValue === 'number') {
    dateToFormat = new Date(timeValue * 1000); // 초 단위를 밀리초로 변환
  }
  // 2. 문자열일 경우
  else if (typeof timeValue === 'string') {
    // 2a. 순수 숫자 문자열인지 확인 (Unix 타임스탬프 가능성)
    if (/^\d+$/.test(timeValue)) {
      dateToFormat = new Date(parseInt(timeValue, 10) * 1000); // 초 단위를 밀리초로 변환
    }
    // 2b. ISO 8601 형식 시도
    else {
      dateToFormat = parseISO(timeValue);
    }
  }
  // 3. 그 외 타입은 처리 불가
  else {
    console.warn(`formatSubmissionTime received unhandled type: ${typeof timeValue}, value: ${timeValue}`);
    return String(timeValue); // 원본 값 반환 또는 에러 표시
  }

  // 최종적으로 유효한 Date 객체인지 확인
  if (isValid(dateToFormat)) {
    try {
      return format(dateToFormat, "yyyy-MM-dd HH:mm:ss", { locale: ko });
    } catch (formatError) {
      console.error(`Error formatting date '${dateToFormat}':`, formatError);
      return String(timeValue); // 포맷팅 실패 시 원본 값 반환
    }
  } else {
    console.warn(`Failed to parse '${timeValue}' into a valid date.`);
    return String(timeValue); // 파싱 실패 시 원본 값 반환
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

  const searchParamsHook = useSearchParams(); // Renamed to avoid conflict

  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters and Sort State
  const [filterProblemId, setFilterProblemId] = useState(
    searchParamsHook.get("problemId") || "",
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterUserId, setFilterUserId] = useState(
    searchParamsHook.get("userId") || "",
  ); // For admin or specific user views

  const [filterAuthor, setFilterAuthor] = useState(
    searchParamsHook.get("author") || "",
  );
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const PAGE_SIZE = 20;

  const fetchSubmissions = useCallback(
    async (loadMore = false) => {
      setIsLoading(true);
      setError(null);

      const params: GetSubmissionsParams = {
        pageSize: PAGE_SIZE,
        sortOrder,
      };
      if (filterProblemId) params.problemId = filterProblemId;
      if (filterUserId) params.userId = filterUserId;
      if (filterAuthor) params.author = filterAuthor;
      if (loadMore && lastEvaluatedKey) {
        params.lastEvaluatedKey = lastEvaluatedKey;
      }

      try {
        const response = await getSubmissions(params);
        if (loadMore) {
          setSubmissions((prev) => [...prev, ...response.items]);
        } else {
          setSubmissions(response.items);
        }
        setLastEvaluatedKey(response.lastEvaluatedKey);
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
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [filterProblemId, filterUserId, filterAuthor, sortOrder, lastEvaluatedKey],
  ); // Add lastEvaluatedKey

  useEffect(() => {
    fetchSubmissions(false); // Initial fetch
  }, [fetchSubmissions]); // Rerun when filters or sortOrder change, but not lastEvaluatedKey here

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      fetchSubmissions(true);
    }
  };

  const handleApplyFilters = () => {
    setSubmissions([]); // Clear current submissions
    setLastEvaluatedKey(null); // Reset pagination
    setHasMore(true); // Assume there's more data for new filter
    // The useEffect for fetchSubmissions will trigger a new fetch
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

      {/* Filters - Basic Example */}
      <div className="mb-6 p-4 bg-white shadow-sm rounded-lg border">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label
              htmlFor="problemIdFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              문제 ID
            </label>
            <input
              type="text"
              id="problemIdFilter"
              value={filterProblemId}
              onChange={(e) => setFilterProblemId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
              placeholder="예: 123e4567-e89b-12d3-a456-426614174000"
            />
          </div>
          <div>
            <label
              htmlFor="authorFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              작성자 (닉네임)
            </label>
            <input
              type="text"
              id="authorFilter"
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
              placeholder="예: alpaco_user"
            />
          </div>
          <div>
            <label
              htmlFor="sortOrderFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
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
          <button
            onClick={handleApplyFilters}
            className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition text-sm"
          >
            적용
          </button>
        </div>
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
                        className="text-sm text-gray-700 hover:text-primary hover:underline truncate block max-w-[120px] sm:max-w-[180px]"
                        title={sub.problemId}
                      >
                        {/* 문제 제목을 표시하려면 problemApi에서 제목을 가져와야 함. 여기서는 ID 표시 */}
                        {sub.problemId.substring(0, 12)}...
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
                      {sub.executionTime !== undefined
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
                      {formatSubmissionTime(String(sub.submissionTime))}
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

// Main page component wrapping the content in Suspense
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
