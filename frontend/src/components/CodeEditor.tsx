"use client";

import React from "react";
import Editor from "@monaco-editor/react";

export const CODE_TEMPLATES = {
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
  value?: string;
  readOnly?: boolean;
  theme?: "light" | "dark";
};

export default function CodeEditor({
  language = "python",
  onChange,
  value = "",
  readOnly = false,
  theme = "light",
}: CodeEditorProps) {
  const handleEditorChange = (newValue: string | undefined) => {
    if (onChange) {
      onChange(newValue || "");
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-grow border border-gray-300 rounded-md overflow-hidden">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          value={value ?? CODE_TEMPLATES[language] ?? ""}
          onChange={handleEditorChange}
          theme={theme === "dark" ? "vs-dark" : "vs-light"}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            readOnly: readOnly,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
