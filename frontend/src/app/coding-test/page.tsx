"use client"; // Needs to be a client component for state and effects
import React, { useState, useEffect } from "react"; // Import hooks
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getProblems, ProblemSummary } from "@/api/problemApi"; // Import API function and type
import { format } from "date-fns"; // Import date formatting utility

// Format the date from ISO string (same as storage page)
const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
  } catch {
    return dateStr; // Fallback
  }
};

// Difficulty badge styling function (can be shared or defined here)
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

const CodingTestPage: React.FC = () => {
  // --- State for the problem list ---
  const [searchTerm, setSearchTerm] = useState("");
  const [allProblems, setAllProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("createdAt"); // Default sort by creation date
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default newest first

  // --- Fetch all problems ---
  useEffect(() => {
    const fetchAllProblems = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all problems (no creatorId passed)
        const problems = await getProblems();
        setAllProblems(problems);
      } catch (err) {
        console.error("Error fetching all problems:", err);
        setError(
          err instanceof Error ? err.message : "전체 문제를 불러오는 데 실패했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllProblems();
  }, []); // Empty dependency array means run once on mount

  // --- Filtering logic ---
  const filteredProblems = allProblems.filter(
    (problem) =>
      problem.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.algorithmType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      // problem.creatorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.author?.toLowerCase().includes(searchTerm.toLowerCase()) // Also allow filtering by author
  );

  // --- Sorting logic ---
  const sortedProblems = [...filteredProblems].sort((a, b) => {
    const getValueA = () => {
      switch (sortColumn) {
        case "title": return a.title || "";
        case "algorithmType": return a.algorithmType || "기타";
        case "difficulty": return a.difficulty || "";
        // case "creatorId": return a.creatorId || "Unknown"; // Handle missing creatorId
        case "author": return a.author || "Unknown"; // Handle missing author
        case "createdAt": return a.createdAt || "";
        default: return "";
      }
    };

    const getValueB = () => {
       switch (sortColumn) {
        case "title": return b.title || "";
        case "algorithmType": return b.algorithmType || "기타";
        case "difficulty": return b.difficulty || "";
        // case "creatorId": return b.creatorId || "Unknown";
        case "author": return b.author || "Unknown";
        case "createdAt": return b.createdAt || "";
        default: return "";
      }
    };

    const valueA = getValueA();
    const valueB = getValueB();

    // Specific handling for difficulty
    if (sortColumn === "difficulty") {
      const difficultyOrder = { 쉬움: 1, Easy: 1, 보통: 2, Medium: 2, 어려움: 3, Hard: 3 };
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

  // --- Sort handling functions ---
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc"); // Default to ascending for new column
    }
  };

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
        <title>코딩 테스트 | ALPACO</title>
        <meta name="description" content="코딩 테스트 페이지" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          {/* --- Existing Top Section --- */}
          <div className="max-w-5xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">코딩 테스트</h1>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white hover:bg-gray-50 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                뒤로가기
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-12"> {/* Added mb-12 */}
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                원하는 테스트 유형을 선택하세요
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                다양한 난이도와 주제별 코딩 테스트에 도전하고 실력을 향상시켜
                보세요. 알고리즘 실력을 키우고 면접 준비에 도움이 됩니다.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/coding-test/selection"
                  className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-hover transition"
                >
                  테스트 선택하기
                </Link>
                <Link
                  href="/generate-problem"
                  className="inline-block px-6 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition"
                >
                  AI로 문제 생성하기 🤖
                </Link>
              </div>
            </div>

            {/* --- New Problem List Section --- */}
            <div className="mb-8"> {/* Wrapper for the list section */}
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
                     className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-full text-sm"
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
               </div>


              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {loading ? (
                  <div className="py-10 px-6 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-2 text-gray-500">문제 목록을 불러오는 중...</p>
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
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden md:table-cell" // Hide on small screens
                            onClick={() => handleSort("author")}
                          >
                            생성자 {renderSortIndicator("author")}
                          </th>
                          <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 hidden sm:table-cell" // Hide on very small screens
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
                              <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                {problem.title}
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
                ) : (
                  <div className="py-10 px-6 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? "검색 결과가 없습니다." : "등록된 문제가 없습니다."}
                    </p>
                     {!searchTerm && ( // Show generate button only if no problems and not searching
                        <Link
                            href="/generate-problem"
                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover transition"
                        >
                            문제 생성하기
                        </Link>
                     )}
                  </div>
                )}
              </div>
            </div> {/* End Problem List Section Wrapper */}
          </div> {/* End max-w-5xl container */}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CodingTestPage;