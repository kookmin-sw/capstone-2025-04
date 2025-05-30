"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchUserAttributes, updateUserAttributes } from "aws-amplify/auth";
import { toast } from "sonner";

// 로컬 스토리지 키 (Header와 동일하게 사용)
const NICKNAME_STORAGE_KEY = "alpaco_user_nickname";

const UserSettingsPage: React.FC = () => {
  const { authStatus } = useAuthenticator((context) => [
    context.authStatus,
  ]);
  const isAuthenticated = authStatus === "authenticated";

  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  useEffect(() => {
    const fetchAttributes = async () => {
      if (!isAuthenticated) return;
      
      try {
        setIsLoading(true);
        const userAttributes = await fetchUserAttributes();
        console.log("User Attributes:", userAttributes);
        
        if (userAttributes.nickname) {
          setNickname(userAttributes.nickname);
        } else {
          // 닉네임이 없는 경우 신규 사용자로 간주
          setIsNewUser(true);
        }
      } catch (error) {
        console.error("Error fetching user attributes:", error);
        toast.error("사용자 정보를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttributes();
  }, [isAuthenticated]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    
    if (!nickname.trim()) {
      toast.error("닉네임을 입력해주세요.");
      return;
    }
    
    try {
      setIsSaving(true);
      await updateUserAttributes({
        userAttributes: {
          nickname,
        },
      });
      
      // 로컬 스토리지에도 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
      }
      
      toast.success("닉네임이 성공적으로 설정되었습니다.");
      setIsNewUser(false); // 닉네임 설정 후 신규 사용자 상태 해제
    } catch (error) {
      console.error("Error updating user attributes:", error);
      toast.error("닉네임 업데이트에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-center">사용자 설정</h1>
            <p className="text-center text-gray-600">로그인이 필요한 페이지입니다.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-2 text-center">사용자 설정</h1>
          
          {isNewUser && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-700">
                <strong>환영합니다!</strong> 알파코에서 활동하기 위해 닉네임을 설정해주세요.
              </p>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                  닉네임 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nickname"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="닉네임을 입력하세요 (필수)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  다른 사용자에게 표시될 이름입니다. 최대 20자까지 입력 가능합니다.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={isSaving || !nickname.trim()}
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '저장 중...' : '저장하기'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserSettingsPage; 