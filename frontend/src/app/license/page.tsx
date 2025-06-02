import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LicensePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">라이센스</h1>
            
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">ALPACO: AI & 클라우드 기반 코딩 테스트 학습 플랫폼</h2>
                <p className="text-gray-600 mb-4">
                  Copyright (c) 2025 ALPACO Team. All rights reserved.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">소프트웨어 라이센스 (코드)</h3>
                <div className="bg-gray-50 p-6 rounded-lg text-sm space-y-4">
                  <p>이 프로젝트는 국민대학교 캡스톤 프로그램의 일환으로 제작되었습니다.</p>
                  
                  <p>개인이나 기관은 비상업적, 교육적, 연구 목적으로만 이 코드와 문서를 보고, 연구하고, 사용할 수 있는 권한이 부여됩니다.</p>
                  
                  <p className="font-semibold text-red-600">
                    독점 제품에 통합, 영리 목적 재배포, 상업 서비스나 플랫폼에서의 사용을 포함하되 이에 국한되지 않는 상업적 사용은 ALPACO 팀의 사전 서면 허가 없이는 엄격히 금지됩니다.
                  </p>
                  
                  <p>무단 상업적 사용은 저작권법 위반에 해당할 수 있으며 법적 조치를 받을 수 있습니다.</p>
                  
                  <p>이 라이센스는 별도 명시되지 않는 한 이 저장소에 포함된 모든 소스 코드, 문서, 이미지 및 미디어에 적용됩니다.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">콘텐츠 라이센스 (문서, 이미지, 미디어)</h3>
                <div className="bg-gray-50 p-6 rounded-lg text-sm space-y-4">
                  <p>
                    모든 문서, 다이어그램, 포스터 및 미디어 콘텐츠는{" "}
                    <Link 
                      href="https://creativecommons.org/licenses/by-nc/4.0/" 
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Creative Commons Attribution-NonCommercial 4.0 International License
                    </Link>
                    에 따라 라이센스됩니다.
                  </p>
                  
                  <div className="ml-4">
                    <p className="font-semibold mb-2">허용사항:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>공유 — 모든 매체나 형식으로 자료를 복사하고 재배포</li>
                      <li>변경 — 자료를 리믹스, 변형하고 새로운 자료 제작</li>
                    </ul>
                    
                    <p className="font-semibold mb-2 mt-4">조건:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li><strong>저작자표시</strong> — 적절한 출처를 밝히고 라이센스 링크를 제공하며 변경사항을 표시해야 합니다.</li>
                      <li><strong>비영리</strong> — 상업적 목적으로 자료를 사용할 수 없습니다.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">상업적 라이센스 문의</h3>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <p className="text-sm">
                    상업적 라이센스 및 파트너십 문의는 프로젝트 팀에게 연락해 주세요.
                  </p>
                  <p className="text-sm mt-2 text-gray-600">
                    문의: pwh9882@kookmin.ac.kr
                  </p>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <Link 
                  href="/"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ← 홈으로 돌아가기
                </Link>
                <Link 
                  href="/terms"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  이용약관 보기 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 