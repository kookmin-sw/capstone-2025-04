"use client";
import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  getProblems,
  ProblemSummary,
  GetProblemsParams,
} from "@/api/problemApi";
import { format } from "date-fns";
import { toast } from "sonner";

const formatDate = (dateStr: string) => {
  try {
    if (!dateStr) return "N/A";
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
  } catch {
    return dateStr;
  }
};

const getDifficultyClass = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
    case "쉬움":
      return "bg-green-100 text-green-800";
    case "medium":
    case "보통":
      return "bg-yellow-100 text-yellow-800";
    case "hard":
    case "어려움":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const PAGE_SIZE = 20;

const CodingTestPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [sortColumn, setSortColumn] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");

  const fetchAllProblems = useCallback(
    async (loadMore = false, keyForThisFetch?: string | null) => {
      setLoading(true);
      const params: GetProblemsParams = {
        pageSize: PAGE_SIZE,
        sortOrder: sortDirection, // Backend sorts by createdAt
      };
      if (loadMore && keyForThisFetch) {
        params.lastEvaluatedKey = keyForThisFetch;
      }

      try {
        setError(null);
        const response = await getProblems(params); // No creatorId for all problems
        setProblems((prev) =>
          loadMore ? [...prev, ...response.items] : response.items,
        );
        setLastEvaluatedKey(response.lastEvaluatedKey);
        setHasMore(
          !!response.lastEvaluatedKey && response.items.length === PAGE_SIZE,
        );
      } catch (err) {
        console.error("Failed to fetch all problems:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "전체 문제를 불러오는데 실패했습니다.";
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
    [sortDirection], // sortColumn is not a dependency if only createdAt is backend-sorted
  );

  useEffect(() => {
    fetchAllProblems(false);
  }, [sortDirection, fetchAllProblems]); // Add fetchAllProblems

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchAllProblems(true, lastEvaluatedKey);
    }
  };

  const filteredProblems = problems.filter(
    (problem) =>
      (problem.title_translated || problem.title)
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      problem.algorithmType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.author?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedProblems = [...filteredProblems].sort((a, b) => {
    if (sortColumn !== "createdAt") {
      // createdAt is sorted by backend
      const getValueA = () => {
        switch (sortColumn) {
          case "title":
            return a.title_translated || a.title || "";
          case "algorithmType":
            return a.algorithmType || "기타";
          case "difficulty":
            return a.difficulty || "";
          case "author":
            return a.author || "Unknown";
          default:
            return "";
        }
      };
      const getValueB = () => {
        switch (sortColumn) {
          case "title":
            return b.title_translated || b.title || "";
          case "algorithmType":
            return b.algorithmType || "기타";
          case "difficulty":
            return b.difficulty || "";
          case "author":
            return b.author || "Unknown";
          default:
            return "";
        }
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
      if (sortDirection === "ASC") return valueA.localeCompare(valueB);
      return valueB.localeCompare(valueA);
    }
    return 0; // Keep backend order for createdAt
  });

  const handleSort = (column: string) => {
    const newDirection =
      sortColumn === column && sortDirection === "ASC" ? "DESC" : "ASC";
    setSortColumn(column);
    setSortDirection(newDirection);
    if (column === "createdAt") {
      // Only reset for backend-sorted column
      setProblems([]);
      setLastEvaluatedKey(null);
      setHasMore(true);
      // fetchAllProblems will be called by useEffect
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
        <title>코딩 테스트 | ALPACO</title>
        <meta name="description" content="코딩 테스트 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow">
          <div className="max-w-6xl mx-auto p-6 sm:p-8">
            {/* Top Section: Test Selection and AI Generation Links */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">코딩 테스트</h1>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50 transition"
              >
                뒤로가기
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                원하는 테스트 유형을 선택하세요
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                문제은행에서 기존 문제를 선택하거나 AI를 활용해 새로운 문제를 생성할 수 있습니다
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {/* 문제은행에서 선택하기 카드 */}
                <Link href="/coding-test/selection" className="group">
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    {/* Large Background Icon */}
                    <div className="absolute -top-4 -right-4 w-32 h-32 text-blue-100 transition-colors duration-300 group-hover:text-blue-200">
                      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 3C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H11C11.6 21 12 20.6 12 20S11.6 19 11 19H5V5H19V11C19 11.6 19.4 12 20 12S21 11.6 21 11V5C21 3.9 20.1 3 19 3H5Z" />
                        <circle cx="18" cy="16" r="6" opacity="0.8" />
                        <path d="M16 14L17.5 15.5L21 12" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 7H17" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                        <path d="M7 9H15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                        <path d="M7 11H13" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                      </svg>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          문제은행에서 선택하기
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300 group-hover:w-32"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full opacity-60 transition-all duration-300 group-hover:opacity-100"></div>
                          <div className="w-1 h-1 bg-blue-300 rounded-full opacity-40 transition-all duration-300 group-hover:opacity-80"></div>
                        </div>
                      </div>
                      
                      {/* Description - only visible on hover */}
                      <div className="opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 mb-6">
                        <p className="text-gray-600 text-sm leading-relaxed break-keep">
                          검증된 알고리즘 문제들을 난이도별, 유형별로<br />
                          분류하여 제공합니다. 체계적인 학습과<br />
                          실력 향상에 최적화되어 있습니다.
                        </p>
                      </div>
                      
                      <div className="flex items-center text-sm text-primary font-medium">
                        문제 선택하기
                        <svg className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* AI로 문제 생성하기 카드 */}
                <Link href="/generate-problem" className="group">
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-purple-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    {/* Large Background Icon */}
                    <div className="absolute -top-4 -right-4 w-32 h-32 text-purple-100 transition-colors duration-300 group-hover:text-purple-200">
                      <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L8.5 8.5L2 12L8.5 15.5L12 22L15.5 15.5L22 12L15.5 8.5L12 2Z" opacity="0.9" />
                        <circle cx="6" cy="6" r="1.5" opacity="0.7" />
                        <circle cx="18" cy="6" r="1" opacity="0.6" />
                        <circle cx="6" cy="18" r="0.8" opacity="0.5" />
                        <circle cx="18" cy="18" r="1.2" opacity="0.8" />
                        <path d="M12 8L10 10L12 12L14 10L12 8Z" opacity="0.3" />
                      </svg>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          AI로 문제 생성하기
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-300 group-hover:w-32"></div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60 transition-all duration-300 group-hover:opacity-100"></div>
                          <div className="w-1 h-1 bg-purple-300 rounded-full opacity-40 transition-all duration-300 group-hover:opacity-80"></div>
                        </div>
                      </div>
                      
                      {/* Description - only visible on hover */}
                      <div className="opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 mb-6">
                        <p className="text-gray-600 text-sm leading-relaxed break-keep">
                          AI가 당신의 실력 수준과 선호도에 맞춰<br />
                          맞춤형 알고리즘 문제를 실시간으로 생성합니다.<br />
                          무한한 학습 기회를 제공합니다.
                        </p>
                      </div>
                      
                      <div className="flex items-center text-sm text-purple-600 font-medium">
                        문제 생성하기
                        <svg className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Problem List Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">
                  전체 문제 목록
                </h2>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="제목, 유형, 생성자 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm"
                  />
                  {/* Search Icon */}
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {loading && problems.length === 0 ? (
                  <div className="py-10 px-6 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-2 text-gray-500">
                      문제 목록을 불러오는 중...
                    </p>
                  </div>
                ) : error ? (
                  <div className="py-10 px-6 text-center">
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : problems.length === 0 && !loading ? (
                  <div className="py-10 px-6 text-center">
                    <p className="text-gray-500">등록된 문제가 없습니다.</p>
                    <Link
                      href="/generate-problem"
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover transition"
                    >
                      문제 생성하기
                    </Link>
                  </div>
                ) : sortedProblems.length === 0 && searchTerm ? (
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
                              알고리즘 유형{" "}
                              {renderSortIndicator("algorithmType")}
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort("difficulty")}
                            >
                              난이도 {renderSortIndicator("difficulty")}
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden md:table-cell"
                              onClick={() => handleSort("author")}
                            >
                              생성자 {renderSortIndicator("author")}
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden sm:table-cell"
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
                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
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
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyClass(problem.difficulty)}`}
                                >
                                  {problem.difficulty}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                {problem.author || "Unknown"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
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
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CodingTestPage;
