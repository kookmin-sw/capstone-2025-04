import os
import random
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
import sys
import time
import tempfile
import subprocess
import importlib.util
import textwrap
from typing import List, Dict, Any, Union
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

# Pydantic 모델 정의
class ProblemDescriptionOutput(BaseModel):
    problem_title: str = Field(description="문제 제목")
    description: str = Field(description="문제 배경 및 설명")
    input_format: str = Field(description="입력 형식 설명")
    output_format: str = Field(description="출력 형식 설명")
    constraints: str = Field(description="제약 조건 설명")

class TestCaseGeneratorOutput(BaseModel):
    python_code: str = Field(description="테스트 케이스 생성을 위한 Python 코드 (solution 및 generate_test_cases 함수 포함)")

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
        problem_desc_output = self._generate_description(
            algorithm_type, difficulty, transformed_code, 
            style_desc, difficulty_desc
        )
        
        # 문제 설명 생성 실패 시 처리 추가
        if isinstance(problem_desc_output, dict) and "error" in problem_desc_output:
             return problem_desc_output # 오류 반환
        
        # Step 4: Test case generation
        self.show_progress(4, 6, "테스트 케이스 생성 중...")
        test_gen_result = self._generate_test_cases(transformed_code, problem_desc_output)
        
        # Step 5: Final integration
        self.show_progress(5, 6, "최종 문제 통합 중...")
        final_problem = self._integrate_results(
            problem_desc_output, test_gen_result, transformed_code,
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
        try:
            response = chain.invoke({})
            return response
        except Exception as e:
            return {"error": f"템플릿 분석 중 오류 발생: {e}"}
    
    def _transform_code(self, template_code, template_analysis):
        """Step 2: Transform the template code based on the analysis"""
        # 템플릿 코드의 언어 감지 (Python인지 C++인지) - re 대신 in 사용
        is_python = 'def ' in template_code and '(' in template_code and '):' in template_code
        is_cpp = '#include' in template_code or 'using namespace' in template_code or 'int main(' in template_code
        
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
        try:
            response = chain.invoke({})
            # 코드 블록만 추출 (LLM이 코드만 반환하도록 유도했지만, 안전장치)
            code_match = response.split("```")
            if len(code_match) >= 2:
                # 언어 식별자 제거 (예: ```python)
                code_content = code_match[1]
                if code_content.startswith(("python", "cpp", "c++")):
                     code_content = code_content.split("\n", 1)[1]
                return code_content.strip()
            return response # 코드 블록 없으면 그대로 반환 (오류 가능성 있음)
        except Exception as e:
            return {"error": f"코드 변형 중 오류 발생: {e}"}
    
    def _generate_description(self, algorithm_type, difficulty, transformed_code, style_desc, difficulty_desc) -> Union[ProblemDescriptionOutput, Dict[str, Any]]:
        """Step 3: Generate problem description based on the transformed code (returns Pydantic model or error dict)"""
        # 프롬프트 생성을 위한 문자열 포매팅 개선
        title_example = f"{algorithm_type} 기초 ({difficulty})" # 예시 제목 포맷
        prompt_template = textwrap.dedent(f"""
            당신은 알고리즘 문제 생성 전문가입니다. 변형된 코드를 바탕으로 문제 설명을 작성해주세요.

            ## 입력 정보
            - 알고리즘 유형: {{algorithm_type}}
            - 난이도 수준: {{difficulty}}

            ## 문제 포맷 스타일
            {{style_desc}}

            ## 난이도 요구사항
            {{difficulty_desc}}

            ## 변형된 코드
            ```
            {{transformed_code}}
            ```

            예제 입력/출력은 생성하지 마세요.
            """)

        # JSON 출력을 위한 체인 생성
        chain = create_json_chain(prompt_template, ProblemDescriptionOutput, self.model)
        try:
            # invoke 시점에 변수 전달
            response = chain.invoke({
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "style_desc": style_desc,
                "difficulty_desc": difficulty_desc,
                "transformed_code": transformed_code
            })
            return response
        except Exception as e:
            print(f"Error generating description: {e}") # 디버깅용 로그
            return {"error": f"문제 설명 생성 중 오류 발생: {e}"}
    
    def _generate_test_cases(self, transformed_code, problem_desc_output: ProblemDescriptionOutput) -> Dict[str, Any]:
        """Step 4: Generate test case *code* and execute it safely."""

        # 문제 설명 부분만 추출
        problem_description_text = f"""
        ## 문제 설명
        {problem_desc_output.description}

        ## 입력 형식
        {problem_desc_output.input_format}

        ## 출력 형식
        {problem_desc_output.output_format}

        ## 제약 조건
        {problem_desc_output.constraints}
        """

        # 프롬프트 구조 정의 (json_example 제거)
        prompt_structure = textwrap.dedent("""
            당신은 알고리즘 문제 생성 전문가입니다. 아래 문제 설명과 해결 코드를 바탕으로 테스트 케이스를 생성하는 **Python 코드**를 작성해주세요.

            ## 문제 설명
            {problem_description_text}

            ## 문제 해결 코드 (참고용)
            ```python
            {transformed_code}
            ```

            다음 요구사항에 맞게 **Python 코드 문자열 하나만 포함하는 JSON 객체**를 생성해주세요. JSON 키는 `python_code` 이어야 합니다.

            `python_code` 값의 요구사항:
            1. 코드는 Python으로 작성되어야 합니다.
            2. `generate_test_cases()` 함수를 포함해야 합니다. 이 함수는 테스트 케이스 목록을 반환하며, 각 테스트 케이스는 `{{\"input\": ..., \"output\": ...}}` 형식의 딕셔너리여야 합니다. (input/output은 문자열)
            3. `solution(input_str)` 함수를 포함해야 합니다. 이 함수는 문자열 입력을 받아 문제의 정답(문자열)을 반환합니다. (위의 '문제 해결 코드'를 참고하여 구현하되, 필요시 수정 가능)
            4. `generate_test_cases()`는 최소 3개, 최대 5개의 다양한 테스트 케이스(기본, 경계값 등)를 생성해야 합니다.
            """)
        
        # 변수만 사용하여 프롬프트 템플릿 완성
        prompt_template = prompt_structure.format(
            problem_description_text="{problem_description_text}", 
            transformed_code="{transformed_code}"
        )
        
        chain = create_json_chain(prompt_template, TestCaseGeneratorOutput, self.model)
        # invoke 시 필요한 변수만 전달
        llm_response = chain.invoke({
            "problem_description_text": problem_description_text,
            "transformed_code": transformed_code
        }) # llm_response는 TestCaseGeneratorOutput 인스턴스

        # JSON 응답에서 코드 추출 (Pydantic 모델 사용)
        generated_code_str = llm_response.python_code.strip()

        # generated_code_str가 비어있는 경우 예외 처리
        if not generated_code_str:
             raise ValueError("LLM did not return any Python code for test case generation.")

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
                raise AttributeError("Generated code missing function 'generate_test_cases' or it's not callable.")
            if not hasattr(module, 'solution') or not callable(module.solution):
                raise AttributeError("Generated code missing function 'solution' or it's not callable.")

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
                 expected_output_str = str(case.get('output')) if case.get('output') is not None else None # 출력도 문자열로

                 # solution 함수 실행 (오류 가능성 있음)
                 actual_output_str = str(module.solution(input_str))

                 # 실행된 결과 저장
                 executed_test_cases.append({
                     'input': input_str,
                     # 생성된 코드의 solution 함수가 output을 직접 생성하므로, expected_output 대신 actual_output 저장
                     # 'expected_output': expected_output_str, # LLM이 생성한 output은 부정확할 수 있음
                     'output': actual_output_str # 실제 실행 결과 저장
                 })

        except Exception as exec_err:
             # 코드 실행 중 발생한 모든 예외 처리
             error_message = f"Error executing generated test code: {type(exec_err).__name__} - {str(exec_err)}"
             print(f"Warning: {error_message}\nGenerated Code:\n{generated_code_str[:500]}...") # 오류 시 코드 일부 출력
             # 오류 발생 시 빈 테스트 케이스 목록 유지
             executed_test_cases = []

        finally:
             # 임시 파일 정리
             if 'tmp_file_path' in locals() and tmp_file_path and os.path.exists(tmp_file_path):
                 os.remove(tmp_file_path)

        # 결과 반환 (오류 정보 포함)
        return {
            "error": error_message,
            "generated_code": generated_code_str,
            "executed_test_cases": executed_test_cases
        }
    
    def _integrate_results(self, problem_desc_output: ProblemDescriptionOutput, test_gen_result: Dict[str, Any], transformed_code, algorithm_type, difficulty):
        """Step 5: Final integration into a structured JSON format using Pydantic model output"""

        # 테스트 케이스 결과 처리
        test_cases_list = test_gen_result.get("executed_test_cases", [])
        test_gen_code = test_gen_result.get("generated_code", "")
        test_gen_error = test_gen_result.get("error") # 오류 메시지 가져오기

        # 최종 문제 JSON 구조 생성 (Pydantic 모델 필드 사용)
        final_problem = {
            "title": problem_desc_output.problem_title, # 모델에서 가져옴
            "description": problem_desc_output.description.strip(), # 모델에서 가져옴
            "constraints": problem_desc_output.constraints.strip(), # 모델에서 가져옴
            "input_format": problem_desc_output.input_format.strip(), # 모델에서 가져옴
            "output_format": problem_desc_output.output_format.strip(), # 모델에서 가져옴
            "examples": [], # 예제는 여전히 비워둠
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