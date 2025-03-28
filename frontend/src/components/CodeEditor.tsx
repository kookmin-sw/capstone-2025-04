"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

const CODE_TEMPLATES = {
  python: `def solution(input_data):
    # 여기에 코드를 작성하세요
    return

# 아래 코드는 수정하지 마세요
if __name__ == "__main__":
    # 입력 처리
    n = int(input())
    numbers = list(map(int, input().split()))
    
    # 솔루션 함수 호출
    result = solution(numbers)
    
    # 결과 출력
    print(result)
`,
  javascript: `function solution(inputData) {
  // 여기에 코드를 작성하세요
  return;
}

// 아래 코드는 수정하지 마세요
function processInput(input) {
  const lines = input.trim().split('\\n');
  const n = parseInt(lines[0]);
  const numbers = lines[1].split(' ').map(Number);
  
  return solution(numbers);
}

// 노드 환경에서 실행될 때 사용
if (typeof process !== 'undefined') {
  let input = '';
  process.stdin.on('data', (chunk) => {
    input += chunk.toString();
  });
  
  process.stdin.on('end', () => {
    const result = processInput(input);
    console.log(result);
  });
}
`,
  java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        // 입력 처리
        int n = scanner.nextInt();
        int[] numbers = new int[n];
        for (int i = 0; i < n; i++) {
            numbers[i] = scanner.nextInt();
        }
        
        // 솔루션 함수 호출
        int result = solution(numbers);
        
        // 결과 출력
        System.out.println(result);
        
        scanner.close();
    }
    
    public static int solution(int[] inputData) {
        // 여기에 코드를 작성하세요
        return 0;
    }
}
`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

// 솔루션 함수
int solution(vector<int>& inputData) {
    // 여기에 코드를 작성하세요
    return 0;
}

int main() {
    // 입력 처리
    int n;
    cin >> n;
    
    vector<int> numbers(n);
    for (int i = 0; i < n; i++) {
        cin >> numbers[i];
    }
    
    // 솔루션 함수 호출
    int result = solution(numbers);
    
    // 결과 출력
    cout << result << endl;
    
    return 0;
}
`,
};

type CodeEditorProps = {
  language?: "python" | "javascript" | "java" | "cpp";
  onChange?: (value: string) => void;
  initialCode?: string | null;
  readOnly?: boolean;
};

export default function CodeEditor({
  language = "python",
  onChange,
  initialCode = null,
  readOnly = false,
}: CodeEditorProps) {
  const [code, setCode] = useState(
    initialCode || CODE_TEMPLATES[language] || ""
  );

  useEffect(() => {
    if (!initialCode) {
      setCode(CODE_TEMPLATES[language] || "");
    }
  }, [language, initialCode]);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
    if (onChange) {
      onChange(value || "");
    }
  };

  return (
    <div className="flex flex-col rounded-lg overflow-hidden shadow-md">
      <div className="flex justify-between items-center px-4 p-3 bg-[#1e1e1e] border-b border-white/10">
        <span className="text-white text-sm font-medium">
          Code Editor - {language.toUpperCase()}
        </span>
        <div className="flex gap-2">
          {/* Optional language selector can go here */}
        </div>
      </div>

      <div className="h-[50vh] border border-gray-300">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            readOnly: readOnly,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="flex justify-end px-4 p-3 bg-gray-50 border-t border-gray-300">
        <button className="bg-primary text-white border-none rounded px-4 py-2 text-sm font-medium cursor-pointer flex items-center gap-2 transition-colors duration-200 hover:bg-primary-hover">
          실행
        </button>
      </div>
    </div>
  );
}
