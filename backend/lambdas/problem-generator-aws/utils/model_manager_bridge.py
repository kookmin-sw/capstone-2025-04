"""
problem-generator와 problem-generator-aws 간의 브릿지 역할을 하는 모듈입니다.
AWS 환경에서 problem-generator 기능을 사용할 수 있도록 연결합니다.
"""
import os
import sys
import time
import json
import importlib
import traceback
import subprocess
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# 경로 설정 - 올바른 경로로 수정
GENERATOR_PATH = Path(__file__).parent.parent.parent.parent / 'lambdas' / 'problem-generator'
TEMPLATES_PATH = GENERATOR_PATH / 'templates'

# problem-generator의 utils 폴더 경로 설정
GENERATOR_UTILS_PATH = GENERATOR_PATH / 'utils'
GENERATION_PATH = GENERATOR_PATH / 'generation'

# problem-generator 모듈을 패키지로 인식할 수 있도록 경로 설정
for path in [str(GENERATOR_PATH), str(GENERATOR_UTILS_PATH), str(GENERATION_PATH)]:
    if path not in sys.path:
        sys.path.insert(0, path)

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
        GENERATION_PATH,
        GENERATOR_UTILS_PATH
    ]
    
    for path in required_paths:
        if not path.exists():
            print(f"Error: Required directory not found: {path}")
            return False
            
    return True

# generator.py의 generate_problem 함수를 subprocess를 통해 호출
def generate_problem(api_key, algorithm_type, difficulty, verbose=True):
    """
    problem-generator의 generate_problem 함수를 subprocess를 통해 호출하여 문제를 생성합니다.
    
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
    
    # problem-generator 모듈 접근 가능 여부 확인
    if not check_problem_generator():
        raise ImportError("Cannot access problem-generator module")
    
    try:
        # 임시 파일 생성 (결과 저장용)
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False, mode='w', encoding='utf-8') as temp_file:
            temp_file_path = temp_file.name
        
        # generator.py 스크립트 경로
        generator_script_path = GENERATION_PATH / 'generator.py'
        
        # 환경 변수 설정
        env = os.environ.copy()
        env['GOOGLE_AI_API_KEY'] = api_key
        
        # 명령어 구성
        command = [
            sys.executable,
            str(generator_script_path),
            '--type', algorithm_type,
            '--difficulty', difficulty,
            '--output', temp_file_path,
        ]
        
        if not verbose:
            command.append('--quiet')
        
        # 명령어 실행
        if verbose:
            print(f"\n{algorithm_type} 유형의 {difficulty} 난이도 문제 생성을 시작합니다...\n")
        
        process = subprocess.Popen(
            command, 
            env=env, 
            stdout=subprocess.PIPE if not verbose else None, 
            stderr=subprocess.PIPE if not verbose else None,
            text=True
        )
        
        # 프로세스 완료 대기
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            error_msg = f"Problem generator process failed with code {process.returncode}"
            if stderr:
                error_msg += f": {stderr}"
            raise RuntimeError(error_msg)
        
        # 결과 파일 읽기
        try:
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                result = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON from output file: {str(e)}")
        except FileNotFoundError:
            raise FileNotFoundError(f"Output file not found at {temp_file_path}")
        finally:
            # 임시 파일 삭제
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
        # 처리 시간 기록
        end_time = time.time()
        result["generation_time"] = end_time - start_time
        
        # 결과가 JSON 구조인지 확인하고, 그렇지 않다면 적절한 구조로 변환
        if not isinstance(result.get("generated_problem"), dict):
            # 문자열 결과는 full_text 필드에 저장하고 JSON 구조로 변환
            original_problem = result.get("generated_problem", "")
            result["generated_problem"] = {
                "title": f"{algorithm_type} {difficulty} 문제",
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "full_text": original_problem
            }
        
        # 서브프로세스 실행 결과 포함
        if stdout:
            result["subprocess_stdout"] = stdout.strip()
        if stderr:
            result["subprocess_stderr"] = stderr.strip()
        
        if verbose:
            print(f"완료! (소요 시간: {end_time - start_time:.1f}초)")
        
        return result
        
    except Exception as e:
        print(f"problem-generator 모듈 호출 중 오류 발생: {str(e)}")
        traceback.print_exc()
        
        # 오류가 발생하면 최소한의 정보를 담은 결과 반환
        return {
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "error": str(e),
            "generated_problem": {
                "title": f"{algorithm_type} {difficulty} 문제",
                "algorithm_type": algorithm_type,
                "difficulty": difficulty,
                "full_text": f"문제 생성 중 오류 발생: {str(e)}"
            }
        }