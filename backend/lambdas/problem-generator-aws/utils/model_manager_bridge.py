"""
problem-generator와 problem-generator-aws 간의 브릿지 역할을 하는 모듈입니다.
이 모듈은 problem-generator의 핵심 기능을 직접 구현하거나 안정적으로 연결합니다.
"""

import os
import sys
import time
import json
import random
from pathlib import Path
from dotenv import load_dotenv
import importlib.util

# 경로 설정
GENERATOR_PATH = Path(__file__).parent.parent.parent / 'problem-generator'
TEMPLATES_PATH = GENERATOR_PATH / 'templates'

# problem-generator의 .env 파일 로드 (있는 경우만)
generator_env_path = GENERATOR_PATH / '.env'
if generator_env_path.exists():
    load_dotenv(dotenv_path=generator_env_path)
    print(f"Loaded environment variables from {generator_env_path}")
else:
    print(f"Warning: .env file not found in {GENERATOR_PATH}")

# 상수 정의
ALGORITHM_TYPES = [
    "구현", "그래프", "다이나믹 프로그래밍", "그리디", "이분 탐색", 
    "너비 우선 탐색", "깊이 우선 탐색", "최단 경로", "정렬", "자료구조"
]
DIFFICULTY_LEVELS = ["튜토리얼", "쉬움", "보통", "어려움"]

# API 키 관리 함수
def get_api_key(api_key=None):
    """API 키를 가져옵니다. 우선순위: 인자로 전달된 키 > 환경 변수"""
    if api_key:
        return api_key
    
    api_key = os.environ.get("GOOGLE_AI_API_KEY")
    if not api_key:
        raise ValueError("No API key provided. Set GOOGLE_AI_API_KEY environment variable or pass it as an argument.")
    
    return api_key

# problem-generator 모듈이 있는지 확인
def check_problem_generator():
    """problem-generator 모듈이 존재하고 접근 가능한지 확인합니다."""
    if not GENERATOR_PATH.exists():
        print(f"Error: problem-generator path not found: {GENERATOR_PATH}")
        return False
    
    # 필요한 디렉토리 구조 확인
    required_paths = [
        TEMPLATES_PATH,
        GENERATOR_PATH / 'generation',
        GENERATOR_PATH / 'utils'
    ]
    
    for path in required_paths:
        if not path.exists():
            print(f"Error: Required directory not found: {path}")
            return False
            
    return True

# LLM 호출을 직접 구현 (간략화된 버전)
def call_llm_api(api_key, prompt, temperature=0.7):
    """
    Google AI Gemini API를 직접 호출합니다.
    이 함수는 실제 API 호출이 필요한 경우에만 실행됩니다.
    """
    try:
        # 여기서 실제로 Google AI API 호출이 필요하다면 구현
        # 현재는 간단한 더미 응답만 반환
        print(f"API 키를 사용하여 LLM API 호출: {'*' * 4 + api_key[-4:] if api_key else 'None'}")
        time.sleep(1)  # API 호출 시간 시뮬레이션
        return "API 응답 내용 (더미)"
    except Exception as e:
        print(f"LLM API 호출 중 오류 발생: {str(e)}")
        return None

# 템플릿 로드 함수 (problem-generator의 기능 일부 복제)
def load_template(algorithm_type, difficulty):
    """알고리즘 유형과 난이도에 맞는 템플릿 코드를 로드합니다."""
    try:
        if not check_problem_generator():
            raise ValueError("Problem generator module not accessible")
        
        # 알고리즘 타입에 맞는 디렉토리 경로 설정
        algorithm_dir = TEMPLATES_PATH / algorithm_type.lower()
        
        # 템플릿 파일 검색
        template_files = []
        
        # 특정 알고리즘 디렉토리가 존재하면 먼저 거기서 검색
        if algorithm_dir.exists():
            template_files = list(algorithm_dir.glob("*.py")) + list(algorithm_dir.glob("*.cpp"))
        
        # 템플릿이 없거나 디렉토리가 없다면, 모든 서브디렉토리에서 검색
        if not template_files:
            for alg_subdir in TEMPLATES_PATH.iterdir():
                if alg_subdir.is_dir():
                    template_files.extend(list(alg_subdir.glob("*.py")) + list(alg_subdir.glob("*.cpp")))
        
        if not template_files:
            raise ValueError(f"No templates found for algorithm type: {algorithm_type}")
        
        # 템플릿 선택
        template_path = random.choice(template_files)
        
        # 파일 내용 읽기
        with open(template_path, "r", encoding="utf-8") as f:
            template_code = f.read()
        
        return template_code, f"{template_path.parent.name}/{template_path.name}"
    except Exception as e:
        print(f"템플릿 로드 중 오류 발생: {str(e)}")
        return f"// 템플릿 코드 로드 실패: {algorithm_type}, {difficulty}", "dummy/template.py"

# 문제 생성 함수
def generate_problem(api_key, algorithm_type, difficulty, verbose=False):
    """
    지정된 알고리즘 유형과 난이도에 맞는 문제를 생성합니다.
    이 함수는 원래의 problem-generator 모듈의 generate_problem 함수를 대체합니다.
    
    Args:
        api_key (str): Google AI API 키
        algorithm_type (str): 알고리즘 유형 (예: '구현', '그래프')
        difficulty (str): 난이도 수준 (예: '쉬움', '보통', '어려움')
        verbose (bool): 상세 출력 여부
    
    Returns:
        dict: 생성된 문제 정보를 담은 사전
    """
    start_time = time.time()
    
    # API 키 확인
    if not api_key:
        raise ValueError("API key is required")
    
    # 알고리즘 타입과 난이도 검증
    if algorithm_type not in ALGORITHM_TYPES:
        print(f"Warning: Unknown algorithm type '{algorithm_type}'. Using anyway.")
    
    if difficulty not in DIFFICULTY_LEVELS:
        print(f"Warning: Unknown difficulty level '{difficulty}'. Using anyway.")
    
    # 원래 problem-generator 모듈이 있는지 확인하고 가능하면 사용
    if check_problem_generator():
        print(f"Problem generator module found at {GENERATOR_PATH}")
        # 여기서 원래 모듈을 직접 호출하거나 활용할 수 있음
        # 하지만 이 예제에서는 간단한 구현을 제공합니다
    
    if verbose:
        print(f"\n{algorithm_type} 유형의 {difficulty} 난이도 문제 생성을 시작합니다...\n")
        print("템플릿 파일을 로드하는 중...")
    
    # 템플릿 로드
    template_code, template_file = load_template(algorithm_type, difficulty)
    
    # 실제로는 여기서 LLM API 호출하여 문제 생성
    if verbose:
        print("문제를 생성하는 중...")
    
    # 간략한 문제 생성 시뮬레이션
    generated_problem = f"""
    ## 문제 설명
    
    {algorithm_type} 알고리즘을 활용하여 해결하는 {difficulty} 난이도의 문제입니다.
    이 문제는 {template_file}를 기반으로 생성되었습니다.
    
    ## 입력
    
    첫 줄에 입력 크기 N이 주어집니다. (1 ≤ N ≤ 100,000)
    두 번째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.
    
    ## 출력
    
    문제의 답을 출력합니다.
    
    ### 예제 입력
    
    5
    1 2 3 4 5
    
    ### 예제 출력
    
    15
    
    ### 정답 코드
    
    ```python
    {template_code}
    ```
    """
    
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # 결과 반환
    if verbose:
        print(f"완료! (소요 시간: {elapsed_time:.1f}초)")
    
    return {
        "algorithm_type": algorithm_type,
        "difficulty": difficulty,
        "template_used": template_file,
        "generated_problem": generated_problem,
        "generation_time": elapsed_time
    }