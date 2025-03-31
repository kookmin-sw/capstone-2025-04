"""
problem-generator와 problem-generator-aws 간의 브릿지 역할을 하는 모듈입니다.
이 모듈은 problem-generator의 핵심 기능을 직접 호출하여 연결합니다.
"""
import os
import sys
import time
import json
import importlib
import traceback
from pathlib import Path
from dotenv import load_dotenv

# 경로 설정 - 올바른 경로로 수정
GENERATOR_PATH = Path(__file__).parent.parent.parent.parent / 'lambdas' / 'problem-generator'
TEMPLATES_PATH = GENERATOR_PATH / 'templates'

# problem-generator 모듈을 패키지로 인식할 수 있도록 경로 설정
if str(GENERATOR_PATH.parent) not in sys.path:
    sys.path.insert(0, str(GENERATOR_PATH.parent))

# problem-generator의 .env 파일 로드 (있는 경우만)
generator_env_path = GENERATOR_PATH / '.env'
if generator_env_path.exists():
    load_dotenv(dotenv_path=generator_env_path)
    print(f"Loaded environment variables from {generator_env_path}")
else:
    print(f"Warning: .env file not found in {GENERATOR_PATH}")

# 상수 정의 (problem-generator의 상수와 동일하게 유지)
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

# generator.py의 generate_problem 함수를 import하고 호출
def generate_problem(api_key, algorithm_type, difficulty, verbose=False):
    """
    problem-generator의 generate_problem 함수를 호출하여 문제를 생성합니다.
    이 함수는 단순한 브릿지 역할을 하며, problem-generator의 기능을 그대로 활용합니다.
    
    Args:
        api_key (str): Google AI API 키
        algorithm_type (str): 알고리즘 유형 (예: '구현', '그래프')
        difficulty (str): 난이도 수준 (예: '쉬움', '보통', '어려움')
        verbose (bool): 상세 출력 여부
    
    Returns:
        dict: 생성된 문제 정보를 담은 사전 (문제 설명, 정답 코드, 테스트 케이스 포함)
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
    
    # problem-generator 모듈 접근 가능 여부 확인
    if not check_problem_generator():
        raise ImportError("Cannot access problem-generator module")
    
    try:
        # 커스텀 imports 방식으로 직접 필요한 모듈들을 import
        # 기존의 상대 경로 문제를 해결하기 위한 방식
        
        # 1. generator.py 파일 경로 설정
        generator_path = GENERATOR_PATH / 'generation' / 'generator.py'
        utils_path = GENERATOR_PATH / 'utils'
        
        # 2. model_manager.py 직접 import 준비
        sys.path.insert(0, str(utils_path))
        
        # 3. 먼저 model_manager 모듈 import
        try:
            from model_manager import get_llm, create_chain
            print("Successfully imported model_manager")
        except ImportError as e:
            print(f"Failed to import model_manager: {e}")
            raise
        
        # 4. generator.py 모듈 로드
        with open(generator_path, 'r') as f:
            generator_code = f.read()
            
        # 5. 상대 임포트 구문을 절대 임포트로 수정
        generator_code = generator_code.replace("from ..utils.model_manager", "from model_manager")
        
        # 6. 수정된 코드를 실행하기 위한 임시 모듈 생성
        module_name = "problem_generator_module"
        spec = importlib.util.spec_from_loader(module_name, loader=None)
        generator_module = importlib.util.module_from_spec(spec)
        
        # 7. 전역 변수 설정 (필요한 경우)
        generator_module.__file__ = str(generator_path)
        
        # 8. 코드 실행
        exec(generator_code, generator_module.__dict__)
        
        # 9. problem-generator의 generate_problem 함수 호출
        if verbose:
            print(f"\n{algorithm_type} 유형의 {difficulty} 난이도 문제 생성을 시작합니다...\n")
        
        # 10. generate_problem 함수 직접 호출
        result = generator_module.generate_problem(
            api_key=api_key,
            algorithm_type=algorithm_type,
            difficulty=difficulty,
            verbose=verbose
        )
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        # 메타데이터 추가
        result["generation_time"] = elapsed_time
        
        if verbose:
            print(f"완료! (소요 시간: {elapsed_time:.1f}초)")
        
        return result
    
    except Exception as e:
        print(f"problem-generator 모듈 호출 중 오류 발생: {str(e)}")
        traceback.print_exc()
        
        # 오류가 발생하면 최소한의 정보를 담은 결과 반환
        return {
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "error": str(e),
            "generated_problem": f"문제 생성 중 오류 발생: {str(e)}"
        }