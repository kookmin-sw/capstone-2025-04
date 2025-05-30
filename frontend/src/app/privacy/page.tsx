import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

const PrivacyPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>개인정보 처리방침 | ALPACO</title>
        <meta name="description" content="ALPACO 개인정보 처리방침" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-grow">
          <div className="max-w-5xl mx-auto p-12">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                개인정보 처리방침
              </h1>
              <Link
                href="/"
                className="px-4 py-2 border border-gray-300 rounded-md transition hover:bg-gray-100"
              >
                홈으로
              </Link>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                  제1조 (개인정보의 처리목적)
                </h2>

                <p className="mb-4 text-gray-600">
                  알파코는 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리지침을 수립․공개합니다.
                </p>

                <p className="mb-4 text-gray-600">
                  회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                </p>

                <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                  <li>
                    <strong>홈페이지 회원 가입 및 관리</strong>
                    <br />
                    회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별․인증, 회원자격 유지․관리, 제한적 본인확인제 시행에 따른 본인확인, 서비스 부정이용 방지, 만 14세 미만 아동의 개인정보 처리시 법정대리인의 동의여부 확인, 각종 고지․통지, 고충처리 등을 목적으로 개인정보를 처리합니다.
                  </li>
                  <li>
                    <strong>재화 또는 서비스 제공</strong>
                    <br />
                    물품배송, 서비스 제공, 계약서․청구서 발송, 콘텐츠 제공, 맞춤서비스 제공, 본인인증, 연령인증, 요금결제․정산, 채권추심 등을 목적으로 개인정보를 처리합니다.
                  </li>
                  <li>
                    <strong>고충처리</strong>
                    <br />
                    민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락․통지, 처리결과 통보 등의 목적으로 개인정보를 처리합니다.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PrivacyPage;
