import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">ALPACO 서비스 이용약관</h1>
            
            <div className="space-y-8 text-sm leading-relaxed">
              
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제1조 (목적)</h2>
                <p>
                  본 약관은 ALPACO 팀이 제공하는 AI 기반 코딩 테스트 학습 플랫폼 &quot;ALPACO&quot; (이하 &quot;서비스&quot;)의 이용과 관련하여 
                  서비스 제공자와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제2조 (정의)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> &quot;서비스&quot;란 ALPACO 팀이 제공하는 AI 기반 코딩 문제 생성, 문제 풀이, AI 헬퍼, 커뮤니티 기능을 포함한 모든 서비스를 의미합니다.</p>
                  <p><strong>2.</strong> &quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.</p>
                  <p><strong>3.</strong> &quot;회원&quot;이란 서비스에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.</p>
                  <p><strong>4.</strong> &quot;콘텐츠&quot;란 서비스 내에서 이용자가 생성, 업로드, 공유하는 모든 형태의 정보(텍스트, 코드, 이미지 등)를 의미합니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제3조 (약관의 효력 및 변경)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
                  <p><strong>2.</strong> 서비스 제공자는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위에서 본 약관을 변경할 수 있으며, 약관이 변경되는 경우 변경사항을 서비스 내에서 공지합니다.</p>
                  <p><strong>3.</strong> 변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 탈퇴할 수 있습니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제4조 (서비스의 제공)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 서비스 제공자가 제공하는 서비스는 다음과 같습니다:</p>
                  <div className="ml-6 space-y-1">
                    <p>• AI 기반 코딩 문제 자동 생성 서비스</p>
                    <p>• 웹 기반 코드 에디터 및 실행 환경</p>
                    <p>• 자동 채점 시스템</p>
                    <p>• AI 헬퍼(챗봇) 서비스</p>
                    <p>• 커뮤니티 기능(게시글, 댓글, 좋아요)</p>
                    <p>• 개인 문제 저장소 및 제출 현황 관리</p>
                  </div>
                  <p><strong>2.</strong> 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 단, 시스템 정기점검, 증설 및 교체, 설비의 장애 등 부득이한 사유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</p>
                  <p><strong>3.</strong> 본 서비스는 국민대학교 캡스톤 프로그램의 일환으로 개발된 학술 연구 목적의 플랫폼입니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제5조 (회원가입 및 계정 관리)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 회원가입은 Google 계정을 통한 소셜 로그인을 통해서만 가능합니다.</p>
                  <p><strong>2.</strong> 이용자는 회원가입 시 정확하고 완전한 정보를 제공해야 하며, 이를 최신 상태로 유지할 책임이 있습니다.</p>
                  <p><strong>3.</strong> 회원은 자신의 계정 정보를 안전하게 관리할 책임이 있으며, 계정의 부정 사용으로 인한 모든 책임은 회원에게 있습니다.</p>
                  <p><strong>4.</strong> 회원은 언제든지 계정을 삭제하여 서비스 이용을 종료할 수 있습니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제6조 (개인정보보호)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 서비스 제공자는 이용자의 개인정보를 관련 법령에 따라 보호합니다.</p>
                  <p><strong>2.</strong> 개인정보의 수집, 이용, 보관, 처리에 관한 상세한 내용은 별도의 <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">개인정보 처리방침</Link>에서 정합니다.</p>
                  <p><strong>3.</strong> Google 소셜 로그인을 통해 수집되는 정보는 Google의 개인정보 처리방침을 따릅니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제7조 (이용자의 의무)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 이용자는 다음 행위를 하여서는 안 됩니다:</p>
                  <div className="ml-6 space-y-1">
                    <p>• 타인의 정보 도용, 허위 정보 제공</p>
                    <p>• 서비스의 안정적 운영을 방해하는 행위</p>
                    <p>• 다른 이용자의 개인정보를 수집, 저장, 공개하는 행위</p>
                    <p>• 음란, 폭력적, 불법적이거나 공서양속에 반하는 콘텐츠 게시</p>
                    <p>• 지적재산권을 침해하는 콘텐츠 게시</p>
                    <p>• 상업적 목적의 광고, 스팸 게시</p>
                    <p>• 서비스의 소스코드를 무단으로 복제, 배포하는 행위</p>
                    <p>• 자동화 도구나 봇을 이용한 부정한 서비스 이용</p>
                  </div>
                  <p><strong>2.</strong> 이용자는 관련 법령과 본 약관을 준수하여야 합니다.</p>
                  <p><strong>3.</strong> 이용자가 생성한 모든 콘텐츠에 대한 책임은 해당 이용자에게 있습니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제8조 (콘텐츠 및 지적재산권)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 이용자가 서비스 내에서 작성한 코드, 게시글, 댓글 등의 콘텐츠에 대한 저작권은 해당 이용자에게 있습니다.</p>
                  <p><strong>2.</strong> 이용자는 자신이 생성한 콘텐츠를 서비스에 게시함으로써 다른 이용자가 이를 학습 목적으로 조회, 참고할 수 있도록 허락하는 것으로 간주됩니다.</p>
                  <p><strong>3.</strong> 서비스 자체의 소프트웨어, 디자인, 로고 등에 대한 지적재산권은 ALPACO 팀에게 있습니다.</p>
                  <p><strong>4.</strong> AI가 생성한 문제 및 해답에 대한 권리는 별도의 라이센스 정책을 따릅니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제9조 (서비스 이용의 제한)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 서비스 제공자는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해하는 경우 사전 통지 없이 서비스 이용을 제한하거나 계정을 정지 또는 삭제할 수 있습니다.</p>
                  <p><strong>2.</strong> 서비스 제공자는 서비스 이용 제한의 구체적 사유와 기간을 해당 이용자에게 통지합니다. 단, 긴급한 경우 사후에 통지할 수 있습니다.</p>
                  <p><strong>3.</strong> 이용 제한에 이의가 있는 이용자는 이의신청을 할 수 있으며, 서비스 제공자는 이를 검토하여 조치를 취할 수 있습니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제10조 (서비스의 변경 및 중단)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 서비스 제공자는 운영상 또는 기술상의 필요에 따라 서비스를 변경할 수 있으며, 변경 전에 해당 내용을 서비스 내에서 공지합니다.</p>
                  <p><strong>2.</strong> 서비스 제공자는 경영상 또는 기술상 심각한 장애가 발생한 경우 서비스를 일시적 또는 영구적으로 중단할 수 있습니다.</p>
                  <p><strong>3.</strong> 본 서비스는 학술 연구 목적으로 제공되며, 연구 종료 또는 기타 사유로 인해 서비스가 종료될 수 있습니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제11조 (책임의 제한)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 서비스 제공자는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 서비스 제공에 대한 책임을 지지 않습니다.</p>
                  <p><strong>2.</strong> 서비스 제공자는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</p>
                  <p><strong>3.</strong> 서비스 제공자는 이용자가 서비스를 통해 얻은 정보나 자료의 신뢰성, 정확성에 대해 보증하지 않으며, 이로 인한 손해에 대해 책임을 지지 않습니다.</p>
                  <p><strong>4.</strong> 본 서비스는 무료로 제공되는 학술 연구 플랫폼으로, 상업적 서비스 수준의 품질이나 연속성을 보장하지 않습니다.</p>
                  <p><strong>5.</strong> AI가 생성한 콘텐츠의 정확성, 적절성에 대해 서비스 제공자는 책임을 지지 않습니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제12조 (분쟁 해결)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 서비스 이용과 관련하여 분쟁이 발생한 경우, 서비스 제공자와 이용자는 상호 신의성실의 원칙에 따라 해결하도록 노력합니다.</p>
                  <p><strong>2.</strong> 전항에 의해 분쟁이 해결되지 않은 경우, 관련 법령에 따른 절차를 거쳐 해결합니다.</p>
                  <p><strong>3.</strong> 본 약관에 관한 소송은 대한민국 법률을 적용하며, 서울중앙지방법원을 관할법원으로 합니다.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">제13조 (기타)</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 본 약관에서 정하지 아니한 사항과 본 약관의 해석에 관하여는 관련 법령 또는 상관례에 따릅니다.</p>
                  <p><strong>2.</strong> 서비스와 관련된 문의사항은 다음 연락처로 문의하시기 바랍니다:</p>
                  <div className="ml-6">
                    <p>이메일: pwh9882@kookmin.ac.kr</p>
                  </div>
                </div>
              </section>

              <section className="bg-blue-50 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">부칙</h2>
                <div className="space-y-2">
                  <p><strong>1.</strong> 본 약관은 2025년 1월 1일부터 시행됩니다.</p>
                  <p><strong>2.</strong> 본 서비스는 국민대학교 캡스톤디자인 프로그램의 일환으로 개발되었으며, 학술 연구 및 교육 목적으로 운영됩니다.</p>
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
                  href="/privacy"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  개인정보 처리방침 보기 →
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
