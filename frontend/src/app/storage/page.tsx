"use client";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { fetchAuthSession } from "aws-amplify/auth";
import { getProblems, ProblemSummary } from "@/api/problemApi";
import { format } from "date-fns";

// Format the date from ISO string
const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
  } catch {
    return dateStr;
  }
};

const StoragePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [userProblems, setUserProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("createdAt"); // Default sort by creation date
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default newest first
  
  // Fetch user-created problems
  useEffect(() => {
    const fetchUserProblems = async () => {
      try {
        setLoading(true);
        
        // Get user ID from token
        const session = await fetchAuthSession();
        const creatorId = session.tokens?.idToken?.payload?.sub as string;
        
        if (!creatorId) {
          throw new Error("사용자 정보를 가져올 수 없습니다.");
        }
        
        // Fetch problems created by this user
        const problems = await getProblems(creatorId);
        setUserProblems(problems);
      } catch (err) {
        console.error("Error fetching user problems:", err);
        setError(err instanceof Error ? err.message : "문제를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProblems();
  }, []);

  // Filter problems by search term
  const filteredProblems = userProblems.filter(
    (problem) =>
      (problem.title_translated || problem.title)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.algorithmType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort problems based on current column and direction
  const sortedProblems = [...filteredProblems].sort((a, b) => {
    // Default values for null/undefined fields
    const getValueA = () => {
      if (sortColumn === "title") return a.title_translated || a.title || "";
      if (sortColumn === "algorithmType") return a.algorithmType || "기타";
      if (sortColumn === "difficulty") return a.difficulty || "";
      if (sortColumn === "createdAt") return a.createdAt || "";
      return "";
    };
    
    const getValueB = () => {
      if (sortColumn === "title") return b.title_translated || b.title || "";
      if (sortColumn === "algorithmType") return b.algorithmType || "기타";
      if (sortColumn === "difficulty") return b.difficulty || "";
      if (sortColumn === "createdAt") return b.createdAt || "";
      return "";
    };
    
    const valueA = getValueA();
    const valueB = getValueB();
    
    // Specific handling for difficulty
    if (sortColumn === "difficulty") {
      const difficultyOrder = {"쉬움": 1, "Easy": 1, "보통": 2, "Medium": 2, "어려움": 3, "Hard": 3};
      const orderA = difficultyOrder[valueA as keyof typeof difficultyOrder] || 0;
      const orderB = difficultyOrder[valueB as keyof typeof difficultyOrder] || 0;
      return sortDirection === "asc" ? orderA - orderB : orderB - orderA;
    }
    
    // Default string comparison for other columns
    if (sortDirection === "asc") {
      return valueA.localeCompare(valueB);
    } else {
      return valueB.localeCompare(valueA);
    }
  });

  // Handle column header click
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If clicking a new column, set it as sort column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Render sort indicator
  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    
    return (
      <span className="ml-1 text-xs inline-block">
        {sortDirection === "asc" ? "▲" : "▼"}
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-4 md:mb-0">
                <span className="mr-2 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="h-8 w-8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </span>
                내 저장소
              </h1>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="문제 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-full"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="h-5 w-5 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  뒤로가기
                </Link>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-8">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="mr-2 text-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </span>
                  내가 생성한 문제
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  내가 생성한 문제들을 확인할 수 있습니다. 총{" "}
                  {filteredProblems.length}개의 문제가 있습니다.
                </p>
              </div>

              {loading ? (
                <div className="py-10 px-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-gray-500">문제를 불러오는 중...</p>
                </div>
              ) : error ? (
                <div className="py-10 px-6 text-center">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : sortedProblems.length > 0 ? (
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
                          onClick={() => window.location.href = `/coding-test/solve?id=${problem.problemId}`}
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
                                problem.difficulty === "쉬움" || problem.difficulty === "Easy"
                                  ? "bg-green-100 text-green-800"
                                  : problem.difficulty === "보통" || problem.difficulty === "Medium"
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
              ) : (
                <div className="py-10 px-6 text-center">
                  <p className="text-gray-500">생성한 문제가 없습니다. 문제를 생성해보세요!</p>
                  <Link
                    href="/generate-problem"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover transition"
                  >
                    문제 생성하기
                  </Link>
                </div>
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
