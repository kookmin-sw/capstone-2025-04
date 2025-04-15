"use client";
import React, { useState } from "react";

const ProblemExample: React.FC = () => {
  const [query, setQuery] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSearch = () => {
    console.log("검색어:", query);

    if (false) {
      // 더미 로직 (나중에 필요할 경우를 위해 유지)
    }
  };

  return (
    <div className="p-16  bg-white rounded-lg shadow-sm w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          어떤 알고리즘 문제를 원하시나요?
        </h2>
        <p className="text-base text-gray-600">
          예시) 다이나믹 프로그래밍을 배워보고 싶은데 기본 예제 보여줘
        </p>
      </div>

      <div className="flex max-w-xl mx-auto mb-8">
        <input
          type="text"
          className="flex-1 p-3 px-4 border border-gray-300 border-r-0 rounded-l-lg text-base transition-all duration-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="알고리즘 문제를 입력하세요"
          value={query}
          onChange={handleInputChange}
        />
        <button
          className="bg-primary text-white border-none rounded-r-lg px-6 font-medium cursor-pointer transition-colors duration-200 hover:bg-primary-hover"
          onClick={handleSearch}
        >
          검색
        </button>
      </div>
    </div>
  );
};

export default ProblemExample;
