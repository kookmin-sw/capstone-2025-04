import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">ALPACO 개인정보 처리방침</h1>
            
            <div className="space-y-8 text-sm leading-relaxed">
              
              <section className="bg-blue-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">개인정보 처리방침 개요</h2>
                <div className="space-y-2">
                  <p><strong>서비스명:</strong> ALPACO (AI Learning PAth COmpanion)</p>
                  <p><strong>서비스 제공자:</strong> ALPACO 팀 (국민대학교 캡스톤디자인 프로그램)</p>
                  <p><strong>연락처:</strong> pwh9882@kookmin.ac.kr</p>
                  <p><strong>시행일자:</strong> 2025년 1월 1일</p>
                  <p className="text-gray-600 mt-4">
                    ALPACO는 이용자의 개인정보를 중요시하며, 개인정보보호법, 정보통신망 이용촉진 및 정보보호에 관한 법률 등 관련 법령을 준수하고 있습니다.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제1조 (개인정보의 수집 및 이용목적)</h2>
                <div className="space-y-4">
                  <p>ALPACO는 다음과 같은 목적을 위하여 개인정보를 수집 및 이용합니다:</p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">1. 회원 가입 및 관리</h4>
                      <ul className="list-disc ml-6 space-y-1 text-gray-600">
                        <li>Google 소셜 로그인을 통한 회원 식별 및 인증</li>
                        <li>회원제 서비스 제공 및 본인확인</li>
                        <li>서비스 부정이용 방지 및 계정 보안</li>
                        <li>고객 지원 및 문의 응답</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">2. 서비스 제공</h4>
                      <ul className="list-disc ml-6 space-y-1 text-gray-600">
                        <li>AI 기반 코딩 문제 생성 및 맞춤형 서비스 제공</li>
                        <li>코드 실행, 채점 결과 제공</li>
                        <li>AI 헬퍼(챗봇) 서비스 제공</li>
                        <li>커뮤니티 기능 제공 (게시글, 댓글, 좋아요)</li>
                        <li>개인 문제 저장소 및 학습 기록 관리</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">3. 서비스 개선 및 연구</h4>
                      <ul className="list-disc ml-6 space-y-1 text-gray-600">
                        <li>서비스 이용 통계 분석 및 개선</li>
                        <li>학술 연구 목적의 익명화된 데이터 분석</li>
                        <li>AI 모델 성능 향상을 위한 피드백 수집</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제2조 (수집하는 개인정보 항목)</h2>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">1. Google 소셜 로그인을 통한 수집 정보</h4>
                    <ul className="list-disc ml-6 space-y-1 text-gray-600">
                      <li><strong>필수항목:</strong> 이메일 주소, Google 계정 고유 ID</li>
                      <li><strong>선택항목:</strong> 프로필 사진, 이름 (공개명으로 사용)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">2. 서비스 이용 과정에서 생성되는 정보</h4>
                    <ul className="list-disc ml-6 space-y-1 text-gray-600">
                      <li>닉네임 및 프로필 설정 정보</li>
                      <li>작성한 코드, 게시글, 댓글 등 콘텐츠</li>
                      <li>문제 풀이 기록, 채점 결과, 학습 진도</li>
                      <li>AI 헬퍼와의 대화 기록</li>
                      <li>서비스 이용 기록, 접속 로그, 쿠키</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">3. 자동 수집 정보</h4>
                    <ul className="list-disc ml-6 space-y-1 text-gray-600">
                      <li>IP 주소, 접속 시간, 브라우저 정보</li>
                      <li>기기 정보 (운영체제, 해상도 등)</li>
                      <li>서비스 이용 패턴 및 접속 빈도</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제3조 (개인정보의 수집 방법)</h2>
                <div className="space-y-2">
                  <p>ALPACO는 다음과 같은 방법으로 개인정보를 수집합니다:</p>
                  <ul className="list-disc ml-6 space-y-1 text-gray-600">
                    <li>Google OAuth 2.0을 통한 소셜 로그인</li>
                    <li>서비스 이용 과정에서 이용자가 직접 입력</li>
                    <li>웹사이트 이용 과정에서 자동 생성되는 정보 수집</li>
                    <li>고객 지원 과정에서의 이메일 문의</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제4조 (개인정보의 보유 및 이용기간)</h2>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">1. 회원 정보</h4>
                    <p className="text-gray-600 ml-4">회원 탈퇴 시까지 또는 서비스 종료 시까지 보유합니다.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">2. 학습 기록 및 콘텐츠</h4>
                    <p className="text-gray-600 ml-4">회원 탈퇴 후 즉시 삭제하거나, 익명화 처리하여 학술 연구 목적으로만 활용합니다.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">3. 접속 로그 및 이용 기록</h4>
                    <p className="text-gray-600 ml-4">수집일로부터 1년간 보유 후 자동 삭제합니다.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">4. 법령에 따른 보유</h4>
                    <p className="text-gray-600 ml-4">관련 법령에서 별도의 보유기간을 정한 경우 해당 기간 동안 보유합니다.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제5조 (개인정보의 제3자 제공)</h2>
                <div className="space-y-2">
                  <p>ALPACO는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
                  <ul className="list-disc ml-6 space-y-1 text-gray-600">
                    <li>이용자가 사전에 동의한 경우</li>
                    <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                    <li>서비스 제공을 위해 필요한 경우 (Google 인증 서비스 등)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제6조 (개인정보 처리 위탁)</h2>
                <div className="space-y-4">
                  <p>ALPACO는 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <p><strong>위탁받는 자:</strong> Amazon Web Services (AWS)</p>
                        <p><strong>위탁업무:</strong> 클라우드 서버 호스팅, 데이터 저장 및 처리</p>
                        <p><strong>보유기간:</strong> 서비스 제공 기간</p>
                      </div>
                      
                      <div>
                        <p><strong>위탁받는 자:</strong> Google LLC</p>
                        <p><strong>위탁업무:</strong> 소셜 로그인 인증 서비스</p>
                        <p><strong>보유기간:</strong> 서비스 제공 기간</p>
                      </div>
                      
                      <div>
                        <p><strong>위탁받는 자:</strong> OpenAI</p>
                        <p><strong>위탁업무:</strong> AI 기반 문제 생성 및 헬퍼 서비스</p>
                        <p><strong>보유기간:</strong> 서비스 제공 기간</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제7조 (정보주체의 권리․의무 및 행사방법)</h2>
                <div className="space-y-4">
                  <p>이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다:</p>
                  
                  <ul className="list-disc ml-6 space-y-2 text-gray-600">
                    <li><strong>개인정보 열람요구</strong> - 처리하고 있는 개인정보 확인 요구</li>
                    <li><strong>오류 등이 있을 경우 정정·삭제 요구</strong> - 잘못된 정보의 수정이나 삭제 요구</li>
                    <li><strong>처리정지 요구</strong> - 개인정보 처리 중단 요구</li>
                    <li><strong>손해배상청구</strong> - 개인정보 침해로 인한 정신적 피해 배상</li>
                  </ul>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mt-4">
                    <p className="font-semibold text-gray-700 mb-2">권리 행사 방법:</p>
                    <p className="text-gray-600">이메일(pwh9882@kookmin.ac.kr) 또는 서비스 내 문의를 통해 요청하실 수 있으며, 지체 없이 조치하겠습니다.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제8조 (개인정보의 파기)</h2>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">1. 파기절차</h4>
                    <p className="text-gray-600 ml-4">보유기간이 경과하거나 개인정보 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">2. 파기방법</h4>
                    <ul className="list-disc ml-6 space-y-1 text-gray-600">
                      <li><strong>전자적 파일:</strong> 기술적 방법을 사용하여 복구 불가능하게 삭제</li>
                      <li><strong>종이문서:</strong> 분쇄하거나 소각하여 파기</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제9조 (개인정보 보호책임자)</h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="font-semibold text-gray-700 mb-3">개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                  
                  <div className="space-y-2">
                    <p><strong>개인정보 보호책임자</strong></p>
                    <p>소속: ALPACO 팀</p>
                    <p>이메일: pwh9882@kookmin.ac.kr</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제10조 (개인정보 처리방침 변경)</h2>
                <div className="space-y-2">
                  <p>이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
                </div>
              </section>

              <section className="bg-yellow-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제11조 (학술 연구 목적 특별 고지)</h2>
                <div className="space-y-2">
                  <p><strong>중요:</strong> 본 서비스는 국민대학교 캡스톤디자인 프로그램의 일환으로 운영되는 학술 연구 플랫폼입니다.</p>
                  <ul className="list-disc ml-6 space-y-1 text-gray-600">
                    <li>수집된 데이터는 익명화 처리 후 학술 연구 목적으로만 활용될 수 있습니다.</li>
                    <li>연구 종료 시 개인식별 정보는 즉시 파기되며, 익명화된 데이터만 보존됩니다.</li>
                    <li>연구 결과는 학술적 목적으로만 발표되며, 개인을 식별할 수 있는 정보는 포함되지 않습니다.</li>
                  </ul>
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
