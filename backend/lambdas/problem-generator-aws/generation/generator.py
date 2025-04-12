import os
import random
import json
import argparse
from pathlib import Path
# from dotenv import load_dotenv
import sys
import time
import tempfile
import subprocess
import importlib.util
import textwrap
from typing import List, Dict, Any, Union
import asyncio
import traceback

# langchain 관련 import 추가
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import JsonOutputParser

# pydantic 모델은 더 이상 직접 사용하지 않을 수 있음 (파이프라인 내에서 처리)
# from pydantic import BaseModel, Field

# Ensure the parent directory ('problem-generator') is in the path
# to allow imports like 'utils.model_manager'
problem_generator_dir = Path(__file__).parent.parent
if str(problem_generator_dir) not in sys.path:
    sys.path.insert(0, str(problem_generator_dir))

# Now import using the package structure relative to problem_generator_dir
from utils.model_manager import get_llm # create_chain, create_json_chain 불필요

# Load environment variables from .env file
# load_dotenv()

# Available algorithm types and difficulty levels
ALGORITHM_TYPES = [
    "구현", "그래프", "다이나믹 프로그래밍", "그리디", "이분 탐색",
    "너비 우선 탐색", "깊이 우선 탐색", "최단 경로", "정렬", "자료구조",
    "백트래킹", "비트마스크", "브루트포스", "분할 정복", "소수 판정", "수학",
    "매개 변수 탐색", "누적 합", "문자열", "트리"
    # Note: "그래프" might need finer mapping (graph_theory vs graph_traversal)
]
DIFFICULTY_LEVELS = ["튜토리얼", "쉬움", "보통", "어려움"]

# --- Mapping from Korean Algorithm Type to English Directory Name ---
KOR_TO_ENG_ALG_MAP = {
    "구현": "implementation",
    "그래프": "graph_theory", # Default, might need specific mapping for BFS/DFS if separated
    "다이나믹 프로그래밍": "dp",
    "그리디": "greedy",
    "이분 탐색": "binary_search",
    "너비 우선 탐색": "graph_traversal", # Assuming BFS is here
    "깊이 우선 탐색": "graph_traversal", # Assuming DFS is here
    "최단 경로": "shortest_path",
    "정렬": "sorting",
    "자료구조": "data_structures",
    "백트래킹": "backtracking",
    "비트마스크": "bit_mask",
    "브루트포스": "bruteforcing",
    "분할 정복": "divide_and_conquer",
    "소수 판정": "eratosthenes", # Maps to eratosthenes template directory
    "수학": "math",
    "매개 변수 탐색": "parametric_search",
    "누적 합": "prefix_sum",
    "문자열": "string",
    "트리": "tree"
}
# ------------------------------------------------------------------

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

# Pydantic 모델 정의는 JsonOutputParser 사용 시 불필요할 수 있음
# class ProblemDescriptionOutput(BaseModel):
#     problem_title: str = Field(description="문제 제목")
#     description: str = Field(description="문제 배경 및 설명")
#     input_format: str = Field(description="입력 형식 설명")
#     output_format: str = Field(description="출력 형식 설명")
#     constraints: str = Field(description="제약 조건 설명")

# class TestCaseGeneratorOutput(BaseModel):
#     python_code: str = Field(description="테스트 케이스 생성을 위한 Python 코드 (solution 및 generate_test_cases 함수 포함)")

def load_template(algorithm_type, difficulty):
    """Load and return a template code file for the given algorithm type and difficulty"""
    # 상위 디렉토리의 templates 폴더 접근
    templates_dir = Path(__file__).parent.parent / "templates"

    # Ensure templates directory exists
    if not templates_dir.exists():
        # Attempt to locate templates relative to the lambda function root
        templates_dir = Path(__file__).resolve().parents[1] / "templates"
        if not templates_dir.exists():
             raise FileNotFoundError(f"Templates directory not found in standard paths: {templates_dir}")

    # --- Use mapping to get English directory name ---
    eng_alg_type = KOR_TO_ENG_ALG_MAP.get(algorithm_type)
    if not eng_alg_type:
        print(f"Warning: No English mapping found for Korean type '{algorithm_type}'. Falling back to direct conversion.")
        # Fallback logic or raise error - using direct conversion for now
        eng_alg_type = algorithm_type.lower().replace(" ", "_")
    # -------------------------------------------------

    # First look in the specific algorithm type directory
    algorithm_dir = templates_dir / eng_alg_type

    # Find matching template files (C++ and Python, prioritize C++ if both exist)
    template_files_cpp = []
    template_files_py = []

    # If specific algorithm directory exists, look there first
    if algorithm_dir.exists():
        template_files_cpp = list(algorithm_dir.glob("*.cpp"))
        template_files_py = list(algorithm_dir.glob("*.py"))

    # If no templates found in specific directory or it doesn't exist, search all subdirectories
    if not template_files_cpp and not template_files_py:
        for alg_subdir in templates_dir.iterdir():
            if alg_subdir.is_dir():
                template_files_cpp.extend(list(alg_subdir.glob("*.cpp")))
                template_files_py.extend(list(alg_subdir.glob("*.py")))

    # Combine lists, prioritizing C++
    template_files = template_files_cpp + template_files_py

    if not template_files:
        # Changed error message to reflect both languages were searched
        raise ValueError(f"No C++ or Python templates found for algorithm type: {algorithm_type}")

    # For difficult problems, we might want to combine templates
    if difficulty == "어려움" and random.random() < 0.7 and len(template_files) >= 2:
        # Select two different templates
        selected_templates = random.sample(template_files, 2)
        template_paths = []
        template_codes = []
        template_langs = [] # Store languages

        for template_path in selected_templates:
            with open(template_path, "r", encoding="utf-8") as f:
                template_codes.append(f.read())
            template_paths.append(f"{template_path.parent.name}/{template_path.name}")
            template_langs.append(template_path.suffix[1:]) # Get extension without dot

        # Determine combined language (prefer C++ if mixed)
        combined_lang = "cpp" if "cpp" in template_langs else "py"
        combined_code = f"// Template 1: {template_paths[0]}\n{template_codes[0]}\n\n// Template 2: {template_paths[1]}\n{template_codes[1]}" # Use // for C++ comments
        return combined_code, "Combined: " + " + ".join(template_paths), combined_lang # Return language
    else:
        # Randomly select a template
        template_path = random.choice(template_files)
        template_lang = template_path.suffix[1:] # Get extension without dot

        with open(template_path, "r", encoding="utf-8") as f:
            template_code = f.read()

        return template_code, f"{template_path.parent.name}/{template_path.name}", template_lang # Return language

def ensure_test_case_structure(parsed_json: dict) -> dict:
    if not isinstance(parsed_json, dict):
        return {"test_case_generation_code": "", "generated_examples": []}
    if not isinstance(parsed_json.get("generated_examples"), list):
        parsed_json["generated_examples"] = []
    if "test_case_generation_code" not in parsed_json:
         parsed_json["test_case_generation_code"] = ""
    return parsed_json

class ProblemGenerator:
    def __init__(self, api_key=None, verbose=True):
        """Initialize the problem generator with API key and pre-build components."""
        # Prioritize passed api_key, then check GOOGLE_AI_KEY env var
        self.api_key = api_key or os.getenv("GOOGLE_AI_KEY")
        if not self.api_key:
            # If still not found, try the old name for backward compatibility (optional)
            self.api_key = os.getenv("GOOGLE_AI_API_KEY")
            if not self.api_key:
                 raise ValueError("No API key provided. Set GOOGLE_AI_KEY environment variable.")

        self.model = get_llm(api_key=self.api_key, model_type="thinking")
        # self.standard_model = get_llm(api_key=self.api_key, model_type="standard") # Reverted: No separate standard model
        self.verbose = verbose

        # --- Pre-build Parsers, Lambda, Bound Model --- 
        self.json_parser = JsonOutputParser()
        self.ensure_structure_lambda = RunnableLambda(ensure_test_case_structure)
        # self.json_mode_model = self.standard_model.bind(generation_config={"response_mime_type": "application/json"}) # Reverted: No JSON mode model needed here

        # --- Build Prompts --- 
        self._build_prompts()

    def _build_prompts(self):
        """Build and assign all PromptTemplate instances using f-strings."""
        # 1. Template Analysis Prompt (No changes needed for language)
        self.template_analysis_prompt = PromptTemplate.from_template(
            textwrap.dedent(f'''\
                당신은 알고리즘 문제 생성 전문가입니다. 다음 템플릿 코드를 분석하고 문제 변형 계획을 세워주세요.

                ## 입력 정보
                - 알고리즘 유형: {{algorithm_type}}
                - 난이도 수준: {{difficulty}}

                ## 템플릿 코드 (C++ 또는 Python)
                ```{{language}} # 언어는 c++ 또는 python 일 수 있습니다.
                {{template_code}}
                ```

                ## 분석 요청 사항
                1. 코드의 핵심 알고리즘 아이디어는 무엇인가요?
                2. 독창적인 문제로 변형하기 위해 어떤 부분을 수정할 수 있을까요?
                3. 난이도 ({{difficulty}})에 맞게 코드를 어떻게 조정할 수 있을까요? (예: 복잡화, 단순화)
                4. 이 템플릿으로 어떤 유형의 문제를 만들 수 있을까요?

                분석 결과를 명확하고 구체적으로 작성해주세요.
            ''')
        )

        # 2. Code Transformation Prompt (Emphasize C++ output if input is C++)
        self.code_transform_prompt = PromptTemplate.from_template(
            textwrap.dedent(f'''\
                당신은 알고리즘 문제 생성 전문가입니다. 이전 분석을 바탕으로 아래 템플릿 코드를 **최소한으로 변형**해주세요.

                ## 템플릿 분석 결과
                {{template_analysis}}

                ## 원본 템플릿 코드 (C++ 또는 Python)
                ```{{language}} # 원본 코드의 언어
                {{template_code}}
                ```

                ## 코드 변형 요구사항
                1. **원본 코드의 프로그래밍 언어 ({{language}})를 반드시 유지하세요.** 다른 언어로 변경하지 마세요.
                2. **템플릿의 핵심 알고리즘 구조와 주요 로직 흐름을 반드시 유지하세요.** 함수/메서드 구조, 클래스 구조 등을 크게 변경하지 마세요.
                3. 변수명 변경, 상수 값 수정, 문자열 내용 변경, 주석 추가/수정 등 **가벼운 수정**을 통해 독창성을 더하세요. 복잡한 로직 변경은 최소화하세요.
                4. 변경된 부분에는 명확한 주석 (예: C++의 경우 //, Python의 경우 #)을 추가하여 의도를 설명해주세요.
                5. 변형된 코드가 문법적으로 올바르고 논리적으로 실행 가능한지 확인하세요.
                6. 생성될 테스트 케이스를 고려하여 입출력 처리가 용이한 형태로 코드를 구성하세요 (필요시 최소한의 수정).

                **반드시 원본과 동일한 언어({{language}})로 변형된 코드만 코드 블록 안에 작성해주세요.** 다른 설명은 포함하지 마세요.
                ```{{language}}
                // 변형된 C++ 코드 작성 시작 (또는 # Python 코드)
                ...
                // 변형된 C++ 코드 작성 끝 (또는 # Python 코드)
                ```
            ''')
        )

        # 3. Description Generation Prompt (Use solution_code, strengthen JSON req, remove example)
        self.description_prompt = PromptTemplate.from_template(
            textwrap.dedent(f'''\
                당신은 알고리즘 문제 생성 전문가입니다. 주어진 정보를 바탕으로 **정확한 JSON 형식으로만** 문제 설명을 작성해주세요.

                ## 입력 정보
                - 알고리즘 유형: {{algorithm_type}}
                - 난이도 수준: {{difficulty}}
                - 문제 스타일: {{style_desc}}
                - 난이도 요구사항: {{difficulty_desc}}

                ## 솔루션 코드 (참고용, C++ 또는 Python)
                ```{{language}}
                {{solution_code}}
                ```

                ## 작성 요청 내용 (JSON 필드)
                - `problem_title`: 창의적이고 내용과 관련 있는 문제 제목 (문자열)
                - `description`: 문제 배경 및 상세 설명 (스토리텔링 포함 가능, 문자열)
                - `input_format`: 명확하고 상세한 입력 형식 설명 (문자열)
                - `output_format`: 명확하고 상세한 출력 형식 설명 (문자열)
                - `constraints`: 입력 크기, 값의 범위 등 난이도에 맞는 제약 조건 (문자열)

                **주의:**
                - 지정된 스타일({{style_desc}})과 난이도 요구사항({{difficulty_desc}})을 준수하여 명확하고 논리적인 설명을 각 필드에 맞게 작성해주세요.
                - **다른 어떤 텍스트도 포함하지 말고, 위에 명시된 JSON 필드들을 가진 단일 JSON 객체만을 생성하세요.**
                - JSON 문자열 내부에 줄바꿈이 필요하면 `\n`을 사용하세요.
            ''')
        )

        # 4. Test Case Generation Prompt (Use solution_code, emphasize Python output, strengthen JSON req, remove example)
        self.test_cases_prompt = PromptTemplate.from_template(
            textwrap.dedent(f'''\
                당신은 알고리즘 문제 생성 전문가입니다. 주어진 문제 설명과 C++ 또는 Python 솔루션 코드를 바탕으로, **정확한 JSON 형식으로만** 테스트 케이스 생성 **Python 코드**와 예제를 생성해주세요.

                ## 문제 설명 (JSON 형태)
                {{problem_description}} # 주의: 이 입력은 실제로는 파싱된 dict 지만, 프롬프트에서는 문자열처럼 다룸

                ## 솔루션 코드 (C++ 또는 Python)
                ```{{language}}
                {{solution_code}}
                ```

                ## 생성 요청 내용 (JSON 필드)
                1. `test_case_generation_code` (문자열): **반드시 Python 언어로 작성되어야 합니다.**
                   - 주어진 솔루션 코드(`solution_code`)를 **내부적으로 시뮬레이션하거나 로직을 참고**하여, 다양한 테스트 케이스(기본, 경계, 예외 등)를 생성하는 Python 코드 문자열입니다.
                   - 이 Python 코드는 `generate_test_cases()` 라는 함수를 포함해야 합니다.
                   - `generate_test_cases()` 함수는 `[(입력 딕셔너리, 출력 딕셔너리), ...]` 형식의 리스트를 반환해야 합니다 (최소 3개, 최대 5개).
                     - 입력/출력 딕셔너리의 키는 문제에 맞게 자유롭게 설정하되, 입력과 출력을 명확히 구분해야 합니다.
                   - 생성된 `test_case_generation_code` 문자열은 Python 인터프리터로 직접 실행 가능해야 합니다.
                2. `generated_examples` (리스트):
                   - 위 `generate_test_cases()` 함수를 실행했을 때 반환될 것으로 **예상되는** (입력, 출력) 딕셔너리의 리스트입니다.

                **주의:**
                - **다른 어떤 텍스트도 포함하지 말고, 위에 명시된 `test_case_generation_code`(Python 코드 문자열)와 `generated_examples`(리스트) 두 필드를 가진 단일 JSON 객체만을 생성하세요.**
                - JSON 문자열 내부에 줄바꿈이 필요하면 `\n`을 사용하세요.
            ''')
        )

        # 5. Integration Prompt (Use solution_code, template_file, strengthen JSON req, remove example)
        self.integration_prompt = PromptTemplate.from_template(
            textwrap.dedent(f'''\
                당신은 알고리즘 문제 생성 전문가입니다. 지금까지 생성된 모든 구성 요소를 통합하여 **정확한 JSON 형식으로만** 최종 문제 결과물을 완성해주세요.

                ## 문제 기본 정보
                - 알고리즘 유형: {{algorithm_type}}
                - 난이도 수준: {{difficulty}}
                - 사용된 템플릿 파일: {{template_file}}

                ## 생성된 구성 요소
                1. 문제 설명 (JSON): {{problem_description}} # 주의: 이 입력은 dict
                2. 테스트 케이스 (JSON): {{test_cases}} # 주의: 이 입력은 dict
                3. 솔루션 코드 (문자열, C++ 또는 Python):
                   ```{{language}}
                   {{solution_code}}
                   ```

                ## 최종 결과물 필드 생성 지침
                - `problem_title`: `problem_description`의 `problem_title` 사용 (문자열).
                - `description`: `problem_description`의 `description` 사용 (문자열).
                - `input_format`: `problem_description`의 `input_format` 사용 (문자열).
                - `output_format`: `problem_description`의 `output_format` 사용 (문자열).
                - `constraints`: `problem_description`의 `constraints` 사용 (문자열).
                - `example_input`: `test_cases`의 `generated_examples` 리스트가 비어있지 않으면 첫 번째 요소의 `input` 딕셔너리 사용 (딕셔너리 또는 null).
                - `example_output`: `test_cases`의 `generated_examples` 리스트가 비어있지 않으면 첫 번째 요소의 `output` 딕셔너리 사용 (딕셔너리 또는 null).
                - `algorithm_hint`: 난이도가 "튜토리얼"일 경우 알고리즘 설명 및 적용 방식 서술 (문자열), 아닐 경우 빈 문자열 "" 사용.
                - `solution_code`: 입력으로 받은 `solution_code` 문자열 사용 (문자열).
                - `test_case_generation_code`: `test_cases`의 `test_case_generation_code` 사용 (문자열).
                - `template_source`: 입력으로 받은 `template_file` 문자열 사용 (문자열).
                - `testcases`: `test_cases`의 `generated_examples` 전체 리스트 사용 (리스트).
                - `algorithmType`: 입력으로 받은 `algorithm_type` 문자열 사용 (문자열).
                - `difficulty`: 입력으로 받은 `difficulty` 문자열 사용 (문자열).

                **주의:**
                - **다른 어떤 텍스트도 포함하지 말고, 위의 지침에 따라 각 필드를 채운 최종 단일 JSON 객체 하나만 생성하여 반환하세요.**
                - JSON 문자열 내부에 줄바꿈이 필요하면 `\n`을 사용하세요.
            ''')
        )

    def show_progress(self, step, total_steps=6, message=""): # 총 단계 수를 6으로 조정
        """Display progress information for the current step"""
        if not self.verbose:
            return

        progress_bar_length = 30
        filled_length = int(progress_bar_length * step / total_steps)

        bar = '█' * filled_length + '░' * (progress_bar_length - filled_length)
        percent = int(100 * step / total_steps)

        # 단계별 메시지 표시 개선
        sys.stdout.write(f'\r[{bar}] {percent}% | 단계 {step}/{total_steps} | {message:<50}') # 메시지 너비 확보
        sys.stdout.flush()

        if step == total_steps:
            sys.stdout.write('\n')

    def generate_problem(self, algorithm_type, difficulty):
        """Generate a problem using LCEL pipeline (using pre-built components)."""
        if self.verbose:
            print(f"\n{algorithm_type} 유형의 {difficulty} 난이도 문제 생성을 시작합니다...\n")
        start_time = time.time()
        try:
            self.show_progress(0, 6, "템플릿 파일 불러오는 중...")
            template_code, template_file, template_lang = load_template(algorithm_type, difficulty)
        except (ValueError, FileNotFoundError) as e:
            print(f"\n오류: {e}")
            return {"error": str(e)}
        difficulty_desc = DIFFICULTY_DESCRIPTIONS.get(difficulty, "")
        style_desc = STYLE_DESCRIPTIONS["Atcoder"]
        if difficulty in ["보통", "어려움"]:
            style_desc = STYLE_DESCRIPTIONS["Baekjoon"]

        # --- LCEL 파이프라인 구성 (self 속성 사용) ---
        self.show_progress(1, 6, "파이프라인 구성 중...")
        initial_state = {
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "template_code": template_code,
            "template_file": template_file,
            "style_desc": style_desc,
            "difficulty_desc": difficulty_desc
        }
        def wrap_with_progress(step, message, runnable):
            async def update_and_run(inputs):
                self.show_progress(step, 6, message)
                return await runnable.ainvoke(inputs)
            return update_and_run

        # self의 속성을 사용하여 파이프라인 정의
        pipeline = (
            RunnablePassthrough.assign(
                template_analysis=wrap_with_progress(2, "템플릿 분석 중...", self.template_analysis_prompt | self.model)
            )
            | RunnablePassthrough.assign(
                transformed_code=wrap_with_progress(3, "코드 변형 중...", self.code_transform_prompt | self.model)
            )
            | RunnablePassthrough.assign(
                problem_description=wrap_with_progress(4, "문제 설명 생성 중...", self.description_prompt | self.model | self.json_parser)
            )
            | RunnablePassthrough.assign(
                test_cases=wrap_with_progress(5, "테스트 케이스 생성 중...", self.test_cases_prompt | self.model | self.json_parser | self.ensure_structure_lambda)
            )
            | wrap_with_progress(6, "최종 결과 통합 중...", self.integration_prompt | self.json_parser)
        )

        # --- 파이프라인 실행 및 결과 반환 (변경 없음) ---
        try:
            result = pipeline.ainvoke(initial_state)
            end_time = time.time()
            elapsed_time = end_time - start_time
            self.show_progress(6, 6, f"완료! (소요 시간: {elapsed_time:.1f}초)")
            return {
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "template_used": template_file,
                "generated_problem_json": result,
                "generation_time": elapsed_time
            }
        except Exception as e:
            print(f"\n파이프라인 실행 중 오류 발생: {e}")
            self.show_progress(6, 6, "오류 발생으로 중단")
            return {"error": f"파이프라인 실행 실패: {e}"}

    def _clean_llm_code_output(self, code_str: str) -> str:
        """Removes markdown code blocks (```) from LLM string output."""
        lines = code_str.strip().split('\n')
        # Check and remove first line if it's a language identifier
        if lines and lines[0].startswith('```'):
            lines.pop(0)
        # Check and remove last line if it's the closing backticks
        if lines and lines[-1] == '```':
            lines.pop(-1)
        return '\n'.join(lines).strip()

    async def generate_problem_stream(self, algorithm_type, difficulty, stream_callback=None, verbose=False):
        """Generate a problem based on algorithm type and difficulty, streaming progress.

        Args:
            algorithm_type (str): The type of algorithm.
            difficulty (str): The difficulty level.
            stream_callback (Callable): An async function to call for streaming updates.
                                        Should accept (msg_type: str, payload: any).
            verbose (bool): Whether to print verbose output during generation.

        Returns:
            list: A list containing the generated problem dictionary(ies) upon successful completion,
                  or potentially an empty list/None if generation fails partially.
                  The main purpose is achieved via the stream_callback.
        """
        request_id = "N/A" # Placeholder, ideally get from context if passed down
        # If context is available (passed from handler), use its request_id
        # This might require modifying how handler calls this method

        if verbose:
            print(f"[{request_id}] Starting problem generation for: {algorithm_type}, Difficulty: {difficulty}")

        if stream_callback:
            # Ensure callback is awaitable if it's an async function
            async def safe_callback(msg_type, payload):
                 try:
                      await stream_callback(msg_type, payload)
                 except Exception as cb_e:
                      print(f"[{request_id}] Error in stream_callback: {cb_e}")
            await safe_callback("status", f"템플릿 로딩 중... ({algorithm_type}, {difficulty})")
        else:
             safe_callback = None # No callback to use

        try:
            # 1. Load Template
            print(f"[{request_id}] Step 1: Loading template...")
            template_code, template_name, template_lang = load_template(algorithm_type, difficulty) # Get language
            print(f"[{request_id}] Step 1: Template loaded: {template_name}")
            if verbose:
                print(f"Loaded template: {template_name}")
            if safe_callback:
                await safe_callback("template_loaded", {"name": template_name, "code_preview": textwrap.shorten(template_code, width=100), "language": template_lang})

            # --- Build Generation Chains --- (Moved here for clarity)
            print(f"[{request_id}] Building Langchain chains...")
            template_analysis_chain = self.template_analysis_prompt | self.model
            code_transform_chain = self.code_transform_prompt | self.model
            description_chain = self.description_prompt | self.model | self.json_parser # Using standard model
            test_case_chain = self.test_cases_prompt | self.model | self.json_parser | self.ensure_structure_lambda
            # Use the standard model for the integration step as well, relying on prompt and parser for JSON
            integration_chain = self.integration_prompt | self.model | self.json_parser 
            print(f"[{request_id}] Langchain chains built.")
            # -------------------------------

            # 2. Analyze Template
            print(f"[{request_id}] Step 2: Analyzing template...")
            if safe_callback:
                await safe_callback("status", "템플릿 코드 분석 중...")
            template_analysis_result = await template_analysis_chain.ainvoke({
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "template_code": template_code,
                "language": template_lang # Pass language
            })
            template_analysis = template_analysis_result.content # Assuming AIMessage
            print(f"[{request_id}] Step 2: Template analysis complete.")
            if verbose:
                print(f"\n--- Template Analysis ---\n{template_analysis}")
            if safe_callback:
                await safe_callback("analysis_complete", {"analysis": template_analysis})

            # 3. Transform Code
            print(f"[{request_id}] Step 3: Transforming code...")
            if safe_callback:
                await safe_callback("status", "코드 변형 중...")
            code_transform_result = await code_transform_chain.ainvoke({
                "template_analysis": template_analysis,
                "template_code": template_code,
                "language": template_lang # Pass language
            })
            solution_code = self._extract_code(code_transform_result.content)
            print(f"[{request_id}] Step 3: Code transformation complete.")
            if verbose:
                print(f"\n--- Solution Code ---\n{solution_code}") # Changed variable name in print
            if safe_callback:
                await safe_callback("code_transformed", {"code": solution_code})

            # 4. Generate Description
            print(f"[{request_id}] Step 4: Generating description...")
            if safe_callback:
                await safe_callback("status", "문제 설명 생성 중...")
            style_desc = STYLE_DESCRIPTIONS.get("Baekjoon" if difficulty in ["보통", "어려움"] else "Atcoder", "")
            difficulty_desc = DIFFICULTY_DESCRIPTIONS.get(difficulty, "")
            description_json = await description_chain.ainvoke({
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "style_desc": style_desc,
                "difficulty_desc": difficulty_desc,
                "solution_code": solution_code,
                "language": template_lang # Pass language
            })
            print(f"[{request_id}] Step 4: Description generation complete.")
            if verbose:
                print(f"\n--- Generated Description (JSON) ---\n{json.dumps(description_json, indent=2, ensure_ascii=False)}")
            if safe_callback:
                await safe_callback("description_generated", description_json)

            # 5. Generate Test Cases
            print(f"[{request_id}] Step 5: Generating test cases...")
            if safe_callback:
                await safe_callback("status", "테스트 케이스 생성 중...")
            test_case_json = await test_case_chain.ainvoke({
                "problem_description": json.dumps(description_json, ensure_ascii=False),
                "solution_code": solution_code,
                "language": template_lang, # Pass language
                # "num_examples": 5, # 생성할 예제 수 (프롬프트에 기본값 정의) - 주석 처리
                # "num_test_cases": 10 # 생성할 테스트케이스 수 (프롬프트에 기본값 정의) - 주석 처리
            })
            print(f"[{request_id}] Step 5: Test case generation complete.")
            if verbose:
                print(f"\n--- Generated Test Cases (JSON) ---\n{json.dumps(test_case_json, indent=2, ensure_ascii=False)}")
            if safe_callback:
                await safe_callback("testcases_generated", test_case_json)

            # 6. Compile and Validate Test Cases (Optional but recommended)
            print(f"[{request_id}] Step 6: Validating test cases (Skipped)...")
            if safe_callback:
                await safe_callback("status", "테스트 케이스 검증 중...")
            # ... (validation logic commented out) ...
            print("Skipping test case validation in this version.")
            if safe_callback:
                 await safe_callback("validation_complete", {"results": "Skipped"})
            print(f"[{request_id}] Step 6: Test case validation skipped.")

            # 7. Assemble Final Problem Data using Integration Chain
            print(f"[{request_id}] Step 7: Assembling final problem data...")
            if safe_callback:
                 await safe_callback("status", "최종 결과 통합 중...")

            final_problem_json = await integration_chain.ainvoke({
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "template_file": template_name,
                "problem_description": description_json, # Pass parsed dict directly
                "test_cases": test_case_json, # Pass parsed dict directly
                "solution_code": solution_code,
                "language": template_lang # Pass language
            })

            print(f"[{request_id}] Step 7: Final problem data assembled.")
            if verbose:
                print(f"\n--- Final Problem JSON ---\n{json.dumps(final_problem_json, indent=2, ensure_ascii=False)}")
            if safe_callback:
                await safe_callback("integration_complete", final_problem_json)

            # Successfully completed generation
            print(f"[{request_id}] Problem generation process completed successfully.")
            # Return the final JSON directly instead of a list containing it
            return final_problem_json

        except Exception as e:
            error_trace = traceback.format_exc()
            # Log the error with more context
            print(f"[{request_id}] ERROR during problem generation: {type(e).__name__} - {str(e)}")
            print(f"[{request_id}] Full error traceback:\n{error_trace}")
            if safe_callback:
                try:
                    await safe_callback("error", {"message": str(e), "traceback": error_trace})
                except Exception as cb_e:
                     print(f"[{request_id}] Error sending error via callback: {cb_e}")
            return None # Return None on failure (instead of empty list)

    def _extract_code(self, llm_output: str) -> str:
        """Extracts code from LLM output, handling potential code blocks."""
        # Simple extraction: find first code block or return the whole thing
        code_block_markers = ["```python", "```cpp", "```"]
        start_index = -1
        end_index = -1

        for marker in code_block_markers:
            if marker in llm_output:
                start_index = llm_output.find(marker) + len(marker)
                # Find the closing marker after the start
                end_marker_index = llm_output.find("```", start_index)
                if end_marker_index != -1:
                    end_index = end_marker_index
                break # Stop after finding the first block type

        if start_index != -1 and end_index != -1:
            return textwrap.dedent(llm_output[start_index:end_index].strip())
        elif start_index != -1: # Opening marker found, but no closing one?
             return textwrap.dedent(llm_output[start_index:].strip()) # Return rest of string
        else: # No markers found, assume the whole output is code (less ideal)
            return llm_output.strip()

    # ... (Other methods like validate_test_cases if they exist) ...

# Helper function (if used externally) - 이 부분은 유지하거나 필요에 맞게 수정
def generate_problem(api_key, algorithm_type, difficulty, verbose=True):
    generator = ProblemGenerator(api_key=api_key, verbose=verbose)
    return generator.generate_problem(algorithm_type, difficulty)

# Main execution part (if run as script) - 이 부분은 유지하거나 필요에 맞게 수정
def main():
    parser = argparse.ArgumentParser(description="알고리즘 문제 생성기")
    parser.add_argument("-t", "--type", type=str, required=True, choices=ALGORITHM_TYPES,
                        help="생성할 문제의 알고리즘 유형")
    parser.add_argument("-d", "--difficulty", type=str, required=True, choices=DIFFICULTY_LEVELS,
                        help="생성할 문제의 난이도")
    parser.add_argument("-o", "--output", type=str, help="생성된 문제를 저장할 JSON 파일 경로")
    parser.add_argument("-q", "--quiet", action="store_true", help="진행 상황 메시지 숨김")

    args = parser.parse_args()

    api_key = os.getenv("GOOGLE_AI_API_KEY")
    if not api_key:
        print("오류: GOOGLE_AI_API_KEY 환경 변수가 설정되지 않았습니다.")
        sys.exit(1)

    result = generate_problem(api_key, args.type, args.difficulty, verbose=not args.quiet)

    if "error" in result:
        print(f"\n문제 생성 실패: {result['error']}")
    else:
        print("\n문제 생성 완료!")
        # 결과 출력 또는 파일 저장
        generated_json = result.get("generated_problem_json")
        if generated_json:
            if args.output:
                try:
                    output_path = Path(args.output)
                    output_path.parent.mkdir(parents=True, exist_ok=True) # Ensure directory exists
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(generated_json, f, ensure_ascii=False, indent=2)
                    print(f"생성된 문제가 {args.output} 파일에 저장되었습니다.")
                except Exception as e:
                    print(f"파일 저장 오류: {e}")
                    print("\n생성된 문제 JSON:")
                    print(json.dumps(generated_json, ensure_ascii=False, indent=2)) # 오류 시 콘솔 출력
            else:
                # 파일 경로 미지정 시 콘솔에 출력
                print("\n생성된 문제 JSON:")
                print(json.dumps(generated_json, ensure_ascii=False, indent=2))
        else:
             print("결과에 생성된 문제 JSON이 없습니다.")
             print("전체 결과:", result) # 디버깅용


if __name__ == "__main__":
    main()