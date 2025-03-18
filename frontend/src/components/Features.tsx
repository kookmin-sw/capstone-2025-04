// frontend/src/components/Features.tsx
"use client";
import React from "react";
import styles from "../styles/components/Features.module.css";
import Link from "next/link";

interface Feature {
  title: string;
  description: string;
  link: string;
}

const features: Feature[] = [
  {
    title: "커뮤니티",
    description: "다양한 개발 문제를 공유하고 사용자들과 소통하세요.",
    link: "/community",
  },
  {
    title: "코딩 테스트",
    description: "원하는 난이도의 LLM 기반 개인 맞춤형 문제를 제공합니다.",
    link: "/coding-test",
  },
  {
    title: "내 저장소",
    description:
      "LLM이 생성한 문제를 저장하고 언제든지 다시 도전할 수 있습니다.",
    link: "/storage",
  },
];

const Features: React.FC = () => {
  return (
    <section className={styles.featureSection}>
      <div className="container">
        <div className={styles.grid}>
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.link}
              className={styles.featureLink}
            >
              <div className={styles.card}>
                <h3 className={styles.title}>{feature.title}</h3>
                <p className={styles.description}>{feature.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
