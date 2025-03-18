"use client";
import React, { useState } from "react";
import styles from "../styles/components/ProblemExample.module.css";

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
    <div className={styles.container}>
      <div className={styles.heading}>
        <h2 className={styles.title}>어떤 알고리즘 문제를 원하시나요?</h2>
        <p className={styles.subtitle}>
          예시) 다이나믹 프로그래밍을 배워보고 싶은데 기본 예제 보여줘
        </p>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="알고리즘 문제를 입력하세요"
          value={query}
          onChange={handleInputChange}
        />
        <button className={styles.searchButton} onClick={handleSearch}>
          검색
        </button>
      </div>
    </div>
  );
};

export default ProblemExample;
