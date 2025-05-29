"use client";
import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  getProblems,
  ProblemSummary,
  GetProblemsParams,
} from "@/api/problemApi";
import { format } from "date-fns";
import { toast } from "sonner";

// Format the date from ISO string
const formatDate = (dateStr: string) => {
  try {
    if (!dateStr) return "N/A";
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
  } catch {
    return dateStr;
  }
};

const PAGE_SIZE = 20;

const StoragePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [sortColumn, setSortColumn] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [currentCreatorId, setCurrentCreatorId] = useState<string | null>(null);

  useEffect(() => {
    const getCreatorId = async () => {
      try {
        const session = await fetchAuthSession();
        const creatorId = session.tokens?.idToken?.payload?.sub as string;
        if (creatorId) {
          setCurrentCreatorId(creatorId);
        } else {
          setError("사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.");
          setLoading(false);
          setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to fetch creator ID:", err);
        setError("세션 정보를 가져오는데 실패했습니다.");
        setLoading(false);
        setHasMore(false);
      }
    };
    getCreatorId();
  }, []);

  const fetchUserProblems = useCallback(
    async (loadMore = false, keyForThisFetch?: string | null) => {
      if (!currentCreatorId) {
        // setError will be set by getCreatorId or if still null, don't fetch
        if (!loading && !error)
          setError("Creator ID not available to fetch problems.");
        setLoading(false); // Ensure loading is false if we can't fetch
        return;
      }
      setLoading(true);

      const params: GetProblemsParams = {
        creatorId: currentCreatorId,
        pageSize: PAGE_SIZE,
        sortOrder: sortDirection as "ASC" | "DESC", // Backend sorts by createdAt based on this
      };

      if (loadMore && keyForThisFetch) {
        params.lastEvaluatedKey = keyForThisFetch;
      }

      try {
        setError(null);
        const response = await getProblems(params);
        setProblems((prev) =>
          loadMore ? [...prev, ...response.items] : response.items,
        );
        setLastEvaluatedKey(response.lastEvaluatedKey);
        setHasMore(
          !!response.lastEvaluatedKey && response.items.length === PAGE_SIZE,
        );
      } catch (err) {
        console.error("Failed to fetch user problems:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "문제를 불러오는데 실패했습니다.";
        setError(errorMsg);
        toast.error(errorMsg);
        if (!loadMore) {
          setProblems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [currentCreatorId, sortDirection], // sortColumn is not a dependency if only createdAt is backend-sorted
  );

  // Effect for initial load and when creatorId or sortDirection (for createdAt) changes
  useEffect(() => {
    if (currentCreatorId) {
      // Only fetch if creatorId is available
      fetchUserProblems(false);
    }
  }, [currentCreatorId, sortDirection, fetchUserProblems]); // Add fetchUserProblems (which depends on sortDirection)

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchUserProblems(true, lastEvaluatedKey);
    }
  };

  // Filter problems by search term (client-side for currently loaded items)
  const filteredProblems = problems.filter(
    (problem) =>
      (problem.title_translated || problem.title)
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      problem.algorithmType?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Sort problems (client-side for columns other than createdAt)
  const sortedProblems = [...filteredProblems].sort((a, b) => {
    // If sorting by createdAt, backend already handled it. Keep order.
    // For other columns, sort client-side.
    if (sortColumn !== "createdAt") {
      const getValueA = () => {
        if (sortColumn === "title") return a.title_translated || a.title || "";
        if (sortColumn === "algorithmType") return a.algorithmType || "기타";
        if (sortColumn === "difficulty") return a.difficulty || "";
        return "";
      };
      const getValueB = () => {
        if (sortColumn === "title") return b.title_translated || b.title || "";
        if (sortColumn === "algorithmType") return b.algorithmType || "기타";
        if (sortColumn === "difficulty") return b.difficulty || "";
        return "";
      };

      const valueA = getValueA();
      const valueB = getValueB();

      if (sortColumn === "difficulty") {
        const difficultyOrder = {
          쉬움: 1,
          Easy: 1,
          보통: 2,
          Medium: 2,
          어려움: 3,
          Hard: 3,
        };
        const orderA =
          difficultyOrder[valueA as keyof typeof difficultyOrder] || 0;
        const orderB =
          difficultyOrder[valueB as keyof typeof difficultyOrder] || 0;
        return sortDirection === "ASC" ? orderA - orderB : orderB - orderA;
      }

      if (sortDirection === "ASC") {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    }
    return 0; // Keep backend order for createdAt
  });

  const handleSort = (column: string) => {
    const newDirection =
      sortColumn === column && sortDirection === "ASC" ? "DESC" : "ASC";
    setSortColumn(column);
    setSortDirection(newDirection);
    // If sorting by 'createdAt', fetchUserProblems will be re-triggered by useEffect due to sortDirection change.
    // For other columns, client-side sort will apply.
    // Reset pagination for any sort change to ensure consistency if we decide to make them backend-sortable later.
    // For now, only `createdAt` is backend sorted.
    if (column === "createdAt") {
      setProblems([]); // Clear current problems to show loading spinner properly
      setLastEvaluatedKey(null);
      setHasMore(true);
      // fetchUserProblems will be called by useEffect
    }
  };

  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    return (
      <span className="ml-1 text-xs inline-block">
        {sortDirection === "ASC" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>내 저장소 | ALPACO</title>
        <meta name="description" content="ALPACO 내 저장소" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow">
          <div className="max-w-6xl mx-auto p-6 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-4 md:mb-0">
                {/* Icon */} 내 저장소
              </h1>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="문제 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-full"
                  />
                  {/* Search Icon */}
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 transition"
                >
                  {/* Back Icon */} 뒤로가기
                </Link>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  {/* List Icon */} 내가 생성한 문제
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  내가 생성한 문제들을 확인할 수 있습니다.
                  {/* Count will update dynamically based on filteredProblems, or total from backend if available */}
                </p>
              </div>

              {loading && problems.length === 0 ? (
                <div className="py-10 px-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-gray-500">문제를 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="py-10 px-6 text-center">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : problems.length === 0 && !loading ? ( // Check problems.length instead of sortedProblems for "no data" message
                <div className="py-10 px-6 text-center">
                  <p className="text-gray-500">
                    생성한 문제가 없습니다. 문제를 생성해보세요!
                  </p>
                  <Link
                    href="/generate-problem"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover transition"
                  >
                    문제 생성하기
                  </Link>
                </div>
              ) : sortedProblems.length === 0 && searchTerm ? ( // If search yields no results from current items
                <div className="py-10 px-6 text-center">
                  <p className="text-gray-500">
                    검색 조건에 맞는 문제가 없습니다.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("title")}
                          >
                            제목 {renderSortIndicator("title")}
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("algorithmType")}
                          >
                            알고리즘 유형 {renderSortIndicator("algorithmType")}
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("difficulty")}
                          >
                            난이도 {renderSortIndicator("difficulty")}
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("createdAt")}
                          >
                            생성 날짜 {renderSortIndicator("createdAt")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedProblems.map((problem) => (
                          <tr
                            key={problem.problemId}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() =>
                              (window.location.href = `/coding-test/solve?id=${problem.problemId}`)
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {problem.title_translated || problem.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {problem.algorithmType || "기타"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  problem.difficulty === "쉬움" ||
                                  problem.difficulty === "Easy"
                                    ? "bg-green-100 text-green-800"
                                    : problem.difficulty === "보통" ||
                                        problem.difficulty === "Medium"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {problem.difficulty}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDate(problem.createdAt)}
                              </div>
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
                        disabled={loading}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm disabled:opacity-50"
                      >
                        {loading ? "로딩 중..." : "더 보기"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default StoragePage;
