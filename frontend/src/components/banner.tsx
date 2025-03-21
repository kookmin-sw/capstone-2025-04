// frontend/src/components/Banner.tsx

import React from "react";
import styles from "../styles/components/Banner.module.css";

const Banner: React.FC = () => {
  return (
    <section className={styles.banner}>
      <div className="container">
        <h1 className={styles.title}>
          개발자로 성장하는 여정,{" "}
          <span className={styles.highlight}>ALPACO</span>와 함께
        </h1>
        <p className={styles.description}>
          클라우드 기반 LLM을 활용한 개인 맞춤형 문제와 함께
          <br />
          체계적으로 개발자로 성장할 수 있는 환경을 제공합니다.
        </p>
      </div>
    </section>
  );
};

export default Banner;
