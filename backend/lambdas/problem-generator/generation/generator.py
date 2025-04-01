import os
import random
import json
import argparse
import re
from pathlib import Path
from dotenv import load_dotenv
import sys
import time
import tempfile
import subprocess
import importlib.util
from typing import List
from pydantic import BaseModel, Field

# Ensure the parent directory ('problem-generator') is in the path
# to allow imports like 'utils.model_manager'
problem_generator_dir = Path(__file__).parent.parent
if str(problem_generator_dir) not in sys.path:
    sys.path.insert(0, str(problem_generator_dir))

# Now import using the package structure relative to problem_generator_dir
from utils.model_manager import get_llm, create_chain, create_json_chain

# Load environment variables from .env file
load_dotenv()

# Available algorithm types and difficulty levels
ALGORITHM_TYPES = [
    "구현", "그래프", "다이나믹 프로그래밍", "그리디", "이분 탐색", 
    "너비 우선 탐색", "깊이 우선 탐색", "최단 경로", "정렬", "자료구조"
]
DIFFICULTY_LEVELS = ["튜토리얼", "쉬움", "보통", "어려움"]

# Difficulty descriptions for prompt generation
DIFFICULTY_DESCRIPTIONS = {
    "튜토리얼": """
        문제 지문은 Atcoder.jp 스타일을 사용해야 합니다.
        문제 하단에 사용된 자료구조 및 알고리즘에 대한 개략적인 설명을 덧붙이세요.
        초보자가 이해하기 쉽도록 알고리즘 개념과 구현 방법을 상세히 설명하세요.
    """,
    "쉬움": """
        기본적으로 Atcoder.jp 스타일 문제 지문을 따르세요.
        문제는 한 가지 핵심 알고리즘 개념만 사용하도록 구성하세요.
        입력 범위와 제약 조건은 비교적 작게 설정하세요.
    """,
    "보통": """
        문제 지문은 Atcoder.jp 스타일에서 백준 문제 스타일로 변경하세요.
        알고리즘을 유추할 수 있는 직접적인 힌트를 지문에 포함시키세요.
        시간복잡도가 낮은 알고리즘을 사용하면 "시간 초과(Time Limit Exceeded)"가 발생할 수 있도록 설계하세요.
        중간 수준의 난이도를 가진 입력 범위와 제약 조건을 설정하세요.
    """,
    "어려움": """
        보통 난이도의 모든 요소를 포함하되, 직접적인 힌트 대신 간접적인 힌트를 제공하세요.
        2개 이상의 알고리즘 또는 자료구조를 조합해서 해결해야 하는 문제를 설계하세요.
        효율적인 알고리즘을 사용해야만 해결할 수 있는 입력 범위와 제약 조건을 설정하세요.
    """
}

# Style descriptions
STYLE_DESCRIPTIONS = {
    "Atcoder": """
        Atcoder.jp 스타일: 문제 지문이 간결하고 핵심 설명에 집중되며, 입력과 출력에 대한 명확한 포맷이 제시됩니다.
        예제 입력과 출력이 직관적이며, 문제의 핵심 알고리즘 혹은 개념에 집중합니다.
    """,
    "Baekjoon": """
        백준 스타일: 문제 지문이 다소 상세하게 설명되며, 문제 해결을 위한 다양한 힌트가 제공될 수 있습니다.
        입력, 출력, 예제, 그리고 추가적인 설명이 포함되어 문제 이해를 돕습니다.
    """
}

def load_template(algorithm_type, difficulty):
    """Load and return a template code file for the given algorithm type and difficulty"""
    # 상위 디렉토리의 templates 폴더 접근
    templates_dir = Path(__file__).parent.parent / "templates"
    
    # Ensure templates directory exists
    if not templates_dir.exists():
        raise FileNotFoundError(f"Templates directory not found: {templates_dir}")
    
    # First look in the specific algorithm type directory
    algorithm_dir = templates_dir / algorithm_type.lower()
    
    # Find matching template files
    template_files = []
    
    # If specific algorithm directory exists, look there first
    if (algorithm_dir.exists()):
        template_files = list(algorithm_dir.glob("*.py")) + list(algorithm_dir.glob("*.cpp"))
    
    # If no templates found in specific directory or it doesn't exist, search all subdirectories
    if not template_files:
        for alg_subdir in templates_dir.iterdir():
            if alg_subdir.is_dir():
                template_files.extend(list(alg_subdir.glob("*.py")) + list(alg_subdir.glob("*.cpp")))
    
    if not template_files:
        raise ValueError(f"No templates found for algorithm type: {algorithm_type}")
    
    # For difficult problems, we might want to combine templates
    if difficulty == "어려움" and random.random() < 0.7 and len(template_files) >= 2:
        # Select two different templates
        selected_templates = random.sample(template_files, 2)
        template_paths = []
        template_codes = []
        
        for template_path in selected_templates:
            with open(template_path, "r", encoding="utf-8") as f:
                template_codes.append(f.read())
            template_paths.append(f"{template_path.parent.name}/{template_path.name}")
            
        combined_code = "\n\n# Template 1: " + template_paths[0] + "\n" + template_codes[0] + \
                        "\n\n# Template 2: " + template_paths[1] + "\n" + template_codes[1]
        return combined_code, "Combined: " + " + ".join(template_paths)
    else:
        # Randomly select a template
        template_path = random.choice(template_files)
        
        with open(template_path, "r", encoding="utf-8") as f:
            template_code = f.read()
        
        return template_code, f"{template_path.parent.name}/{template_path.name}"

class ProblemGenerator:
    def __init__(self, api_key=None, verbose=True):
        """Initialize the problem generator with API key"""
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not self.api_key:
            raise ValueError("No API key provided. Set GOOGLE_AI_API_KEY in .env file or pass it as an argument.")
        
        # Use our model manager instead of direct Google API
        self.model = get_llm(api_key=self.api_key, model_type="thinking")
        self.verbose = verbose
        
    def show_progress(self, step, total_steps=5, message=""):
        """Display progress information for the current step"""
        if not self.verbose:
            return
            
        progress_bar_length = 30
        filled_length = int(progress_bar_length * step / total_steps)
        
        bar = '█' * filled_length + '░' * (progress_bar_length - filled_length)
        percent = int(100 * step / total_steps)
        
        sys.stdout.write(f'\r[{bar}] {percent}% | 단계 {step}/{total_steps} | {message}')
        sys.stdout.flush()
        
        if step == total_steps:
            sys.stdout.write('\n')
        
    def generate_problem(self, algorithm_type, difficulty):
        """Generate a problem using multiple prompts in sequence (Chain-of-thoughts)"""
        if self.verbose:
            print(f"\n{algorithm_type} 유형의 {difficulty} 난이도 문제 생성을 시작합니다...\n")
            
        start_time = time.time()
        
        # Load template
        try:
            self.show_progress(0, 6, "템플릿 파일 불러오는 중...")
            template_code, template_file = load_template(algorithm_type, difficulty)
        except (ValueError, FileNotFoundError) as e:
            return {"error": str(e)}
        
        # Get difficulty-specific description for the prompt
        difficulty_desc = DIFFICULTY_DESCRIPTIONS.get(difficulty, "")
        
        # Determine style based on difficulty
        style_desc = STYLE_DESCRIPTIONS["Atcoder"]
        if difficulty in ["보통", "어려움"]:
            style_desc = STYLE_DESCRIPTIONS["Baekjoon"]
        
        # Step 1: Template analysis
        self.show_progress(1, 6, "템플릿 코드 분석 중...")
        template_analysis = self._analyze_template(template_code, algorithm_type, difficulty)
        
        # Step 2: Code transformation
        self.show_progress(2, 6, "코드 변형 중...")
        transformed_code = self._transform_code(template_code, template_analysis)
        
        # Step 3: Problem description generation
        self.show_progress(3, 6, "문제 설명 생성 중...")
        problem_description = self._generate_description(
            algorithm_type, difficulty, transformed_code, 
            style_desc, difficulty_desc
        )
        
        # Step 4: Test case generation
        self.show_progress(4, 6, "테스트 케이스 생성 중...")
        test_gen_result = self._generate_test_cases(transformed_code, problem_description)
        
        # Step 5: Final integration
        self.show_progress(5, 6, "최종 문제 통합 중...")
        final_problem = self._integrate_results(
            problem_description, test_gen_result, transformed_code,
            algorithm_type, difficulty
        )
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        # Final completion message
        self.show_progress(6, 6, f"완료! (소요 시간: {elapsed_time:.1f}초)")
        
        return {
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "template_used": template_file,
            "generated_problem": final_problem,
            "generation_time": elapsed_time
        }
    
    def _analyze_template(self, template_code, algorithm_type, difficulty):
        """Step 1: Analyze the template and plan modifications"""
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 다음 템플릿 코드를 분석하고 어떻게 변형할지 계획을 세워주세요:
        
        ## 입력 정보
        - 알고리즘 유형: {algorithm_type}
        - 난이도 수준: {difficulty}
        
        ## 템플릿 코드
        ```
        {template_code}
        ```
        
        다음 항목들을 분석해주세요:
        1. 이 코드가 구현하는 알고리즘의 핵심 아이디어는 무엇인가요?
        2. 어떤 부분을 변형하면 더 독창적인 문제가 될 수 있을까요?
        3. 난이도에 맞게 어떤 부분을 복잡하게 또는 단순하게 만들 수 있을까요?
        4. 이 코드를 기반으로 어떤 유형의 문제를 만들 수 있을까요?
        
        응답은 명확하고 구체적으로 작성해주세요.
        """
        # Create a chain for this specific prompt
        chain = create_chain(prompt, self.model)
        response = chain.invoke({})
        return response
    
    def _transform_code(self, template_code, template_analysis):
        """Step 2: Transform the template code based on the analysis"""
        # 템플릿 코드의 언어 감지 (Python인지 C++인지)
        is_python = bool(re.search(r'def\s+\w+\s*\(', template_code))
        is_cpp = bool(re.search(r'#include|using\s+namespace|int\s+main\s*\(', template_code))
        
        # 코드 언어에 따른 프롬프트 조정
        language_note = ""
        if is_cpp:
            language_note = "템플릿 코드는 C++로 작성되어 있습니다. 변환된 코드도 C++로 작성해주세요. 언어를 Python으로 바꾸지 마세요."
        elif is_python:
            language_note = "템플릿 코드는 Python으로 작성되어 있습니다. 변환된 코드도 Python으로 작성해주세요."
        else:
            language_note = "템플릿 코드의 프로그래밍 언어를 유지하며 변형해주세요."
        
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 아래 템플릿 코드를 이전 분석을 바탕으로 변형해주세요:
        
        ## 템플릿 분석 결과
        {template_analysis}
        
        ## 원본 템플릿 코드
        ```
        {template_code}
        ```
        
        ## 중요 지침
        {language_note}
        템플릿의 기본 구조와 알고리즘은 최대한 보존해야 합니다. 함수명과 주요 로직이 크게 변경되지 않도록 주의하세요.
        
        다음 요구사항에 맞게 코드를 변형해주세요:
        1. 템플릿의 알고리즘 구조는 유지하되, 구체적인 구현을 약간만 변경해 주세요.
        2. 변경한 부분에는 명확한 주석 추가
        3. 변경된 코드가 올바르게 동작하는지 확인
        4. 테스트 케이스를 쉽게 만들 수 있는 형태로 구성
        
        변형된 코드만 코드 블록으로 반환해주세요. 원본 언어(C++/Python)를 유지하세요.
        ```
        """
        chain = create_chain(prompt, self.model)
        response = chain.invoke({})
        return response
    
    def _generate_description(self, algorithm_type, difficulty, transformed_code, style_desc, difficulty_desc):
        """Step 3: Generate problem description based on the transformed code"""
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 변형된 코드를 바탕으로 문제 설명을 작성해주세요:
        
        ## 입력 정보
        - 알고리즘 유형: {algorithm_type}
        - 난이도 수준: {difficulty}
        
        ## 문제 포맷 스타일
        {style_desc}
        
        ## 난이도 요구사항
        {difficulty_desc}
        
        ## 변형된 코드
        {transformed_code}
        
        다음 내용을 포함한 문제 설명을 작성해주세요:
        1. 문제 배경 및 설명
        2. 입력 형식 설명
        3. 출력 형식 설명
        
        문제 설명은 명확하고 논리적이어야 하며, 지정된 스타일과 난이도 요구사항을 준수해야 합니다.
        예제 입력/출력은 아직 포함하지 마세요.
        """
        chain = create_chain(prompt, self.model)
        response = chain.invoke({})
        return response
    
    def _generate_test_cases(self, transformed_code, problem_description):
        """Step 4: Generate test case *code* and execute it safely."""
        # 1. LLM에게 테스트 케이스 생성 코드 요청 (원래 방식 복원)
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 아래 문제 설명과 코드를 바탕으로 테스트 케이스를 생성하는 **Python 코드**를 작성해주세요:
        
        ## 문제 설명
        {problem_description}
        
        ## 문제 해결 코드 (solution)
        ```python
        {transformed_code} # 실제로는 이 코드 기반으로 solution 함수 구현 필요
        ```
        
        다음 요구사항에 맞게 테스트 케이스 생성 코드를 작성해주세요:
        1. 코드는 Python으로 작성되어야 합니다.
        2. `generate_test_cases()` 함수를 포함해야 합니다. 이 함수는 테스트 케이스 목록을 반환하며, 각 테스트 케이스는 `{{\'input\': ..., \'output\': ...}}` 형식의 딕셔너리여야 합니다. (input/output은 문자열)
        3. `solution(input_str)` 함수를 포함해야 합니다. 이 함수는 문자열 입력을 받아 문제의 정답(문자열)을 반환합니다. (위의 '문제 해결 코드'를 참고하여 구현)
        4. `generate_test_cases()`는 최소 3개, 최대 5개의 다양한 테스트 케이스(기본, 경계값 등)를 생성해야 합니다.
        
        코드 전체를 단일 Python 코드 블록(```python ... ```)으로 반환해주세요. 다른 설명은 필요 없습니다.
        """
        
        generated_code_str = ""
        error_message = None
        executed_test_cases = []
        
        try:
            # LLM 호출 (create_chain 사용)
            chain = create_chain(prompt, self.model)
            llm_response = chain.invoke({})
            
            # 2. 코드 추출 (마크다운 코드 블록)
            import re
            code_pattern = r"```python\s*(.*?)\s*```"
            match = re.search(code_pattern, llm_response, re.DOTALL)
            
            if not match:
                # 코드 블록을 찾지 못한 경우
                raise ValueError(f"Could not extract Python code block from LLM response.\nResponse: {llm_response[:500]}...")
                
            generated_code_str = match.group(1).strip()
            
            # 3. 코드 실행 시도 (안전하게)
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding='utf-8') as tmp_file:
                tmp_file.write(generated_code_str)
                tmp_file_path = tmp_file.name
                
            # 모듈 로드 및 함수 실행
            spec = None
            module = None
            try:
                spec = importlib.util.spec_from_file_location("test_gen_module", tmp_file_path)
                if spec is None or spec.loader is None:
                     raise ImportError("Could not create module spec.")
                module = importlib.util.module_from_spec(spec)
                
                # 실행 시간 제한 추가 고려 (예: threading, multiprocessing, 또는 별도 라이브러리)
                spec.loader.exec_module(module) # 여기서 SyntaxError 등 발생 가능
                
                if not hasattr(module, 'generate_test_cases') or not callable(module.generate_test_cases):
                    raise AttributeError("Function 'generate_test_cases' not found or not callable.")
                if not hasattr(module, 'solution') or not callable(module.solution):
                    raise AttributeError("Function 'solution' not found or not callable.")
                    
                # 테스트 케이스 생성 실행
                generated_cases = module.generate_test_cases() # 여기서 Runtime Error 가능
                
                if not isinstance(generated_cases, list):
                    raise TypeError("generate_test_cases did not return a list.")
                
                # 생성된 테스트 케이스 검증 및 solution 실행
                for i, case in enumerate(generated_cases[:5]): # 최대 5개 사용
                     if not isinstance(case, dict) or 'input' not in case:
                         print(f"Warning: Test case {i} has invalid format. Skipping.")
                         continue
                     
                     input_str = str(case['input']) # 입력은 문자열로 강제
                     expected_output = str(case.get('output')) if case.get('output') is not None else None # 출력도 문자열로
                     
                     # solution 함수 실행 (오류 가능성 있음)
                     actual_output_str = str(module.solution(input_str))
                     
                     # 실행된 결과 저장
                     executed_test_cases.append({
                         'input': input_str,
                         'expected_output': expected_output, 
                         'actual_output': actual_output_str
                     })
                     
            except Exception as exec_err:
                 # 코드 실행 중 발생한 모든 예외 처리
                 error_message = f"Error executing generated code: {type(exec_err).__name__} - {str(exec_err)}"
                 print(f"Warning: {error_message}")
                 # 오류 발생 시 빈 테스트 케이스 목록 유지
                 executed_test_cases = []
                 
            finally:
                 # 임시 파일 정리
                 if tmp_file_path and os.path.exists(tmp_file_path):
                     os.remove(tmp_file_path)

        except Exception as e:
            # LLM 호출, 코드 추출 등 이전 단계 오류 처리
            error_message = f"Error in test case generation process: {type(e).__name__} - {str(e)}"
            print(f"Error: {error_message}")
            executed_test_cases = [] # 오류 시 빈 목록
        
        # 결과 반환 (오류 정보 포함)
        return {
            "error": error_message,
            "generated_code": generated_code_str,
            "executed_test_cases": executed_test_cases
        }
    
    def _integrate_results(self, problem_description, test_gen_result, transformed_code, algorithm_type, difficulty):
        """Step 5: Final integration into a structured JSON format"""
        
        # 테스트 케이스 결과 처리
        test_cases_list = test_gen_result.get("executed_test_cases", [])
        test_gen_code = test_gen_result.get("generated_code", "")
        test_gen_error = test_gen_result.get("error") # 오류 메시지 가져오기

        # 문제 설명에서 정보 추출 시도 (정규식 사용)
        input_format_desc = ""
        output_format_desc = ""
        constraints_desc = ""
        try:
            input_match = re.search(r"## 입력(?: 형식)?\s*(.*?)(?=##|\Z)", problem_description, re.DOTALL | re.IGNORECASE)
            if input_match:
                input_format_desc = input_match.group(1).strip()
            
            output_match = re.search(r"## 출력(?: 형식)?\s*(.*?)(?=##|\Z)", problem_description, re.DOTALL | re.IGNORECASE)
            if output_match:
                output_format_desc = output_match.group(1).strip()
                
            constraints_match = re.search(r"## 제약(?: 조건|사항)?\s*(.*?)(?=##|\Z)", problem_description, re.DOTALL | re.IGNORECASE)
            if constraints_match:
                constraints_desc = constraints_match.group(1).strip()
        except Exception as parse_err:
             print(f"Warning: Could not parse description parts: {parse_err}")

        # 최종 문제 JSON 구조 생성
        final_problem = {
            "title": f"{algorithm_type} 문제 ({difficulty})",
            "description": problem_description.strip(),
            "constraints": constraints_desc,
            "input_format": input_format_desc,
            "output_format": output_format_desc,
            "examples": [], # 예제는 비워둠 (Hallucination 방지)
            "solution_code": transformed_code.strip(), # 코드 앞뒤 공백 제거
            "test_cases": test_cases_list, # 실행된 테스트 케이스 포함
            "test_generator_code": test_gen_code, # 생성된 테스트 생성 코드
            "test_generation_error": test_gen_error # 테스트 생성/실행 중 오류 (None이면 성공)
        }
        
        return final_problem

def generate_problem(api_key, algorithm_type, difficulty, verbose=True):
    """
    Generate a problem using Langchain abstraction
    """
    generator = ProblemGenerator(api_key, verbose=verbose)
    return generator.generate_problem(algorithm_type, difficulty)

def main():
    parser = argparse.ArgumentParser(description='Generate algorithmic problems using Google AI')
    parser.add_argument('--api_key', help='Google AI Studio API key')
    parser.add_argument('--algorithm_type', choices=ALGORITHM_TYPES, help='Type of algorithm')
    parser.add_argument('--difficulty', choices=DIFFICULTY_LEVELS, help='Difficulty level')
    parser.add_argument('--output', help='Output file path (optional)')
    parser.add_argument('--quiet', action='store_true', help='Disable progress display')
    parser.add_argument('--json', action='store_true', help='Output in JSON format only')
    
    args = parser.parse_args()
    
    # Check for API key
    api_key = args.api_key or os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        print("Error: No API key provided. Use --api_key or set GOOGLE_AI_API_KEY environment variable.")
        return
    
    # Interactive mode if arguments are missing
    algorithm_type = args.algorithm_type
    if not algorithm_type:
        print("Available algorithm types:")
        for i, alg in enumerate(ALGORITHM_TYPES, 1):
            print(f"{i}. {alg}")
        choice = int(input("Enter your choice (number): "))
        algorithm_type = ALGORITHM_TYPES[choice-1]
    
    difficulty = args.difficulty
    if not difficulty:
        print("Difficulty levels:")
        for i, diff in enumerate(DIFFICULTY_LEVELS, 1):
            print(f"{i}. {diff}")
        choice = int(input("Enter your choice (number): "))
        difficulty = DIFFICULTY_LEVELS[choice-1]
    
    # Generate the problem
    print(f"Generating {difficulty} level problem for {algorithm_type}...")
    result = generate_problem(api_key, algorithm_type, difficulty, verbose=(not args.quiet))
    
    if "error" in result:
        print(f"Error: {result['error']}")
        return
    
    # Output result
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            if args.output.endswith('.json') or args.json:
                # 결과가 이미 구조화된 형태인지 확인
                if isinstance(result["generated_problem"], dict):
                    json_output = result.copy()
                    json_output["generated_problem"] = result["generated_problem"]
                else:
                    # 텍스트 응답을 받았을 경우, JSON으로 래핑
                    json_output = result.copy()
                    json_output["generated_problem"] = {"full_text": result["generated_problem"]}
                
                json.dump(json_output, f, ensure_ascii=False, indent=2)
            else:
                # 구조화된 출력인 경우 텍스트로 변환
                if isinstance(result["generated_problem"], dict) and "full_text" in result["generated_problem"]:
                    f.write(result["generated_problem"]["full_text"])
                else:
                    f.write(str(result["generated_problem"]))
        print(f"Problem saved to {args.output}")
    else:
        print("\n" + "="*50 + "\n")
        if args.json or isinstance(result["generated_problem"], dict):
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(result["generated_problem"])

if __name__ == "__main__":
    main()