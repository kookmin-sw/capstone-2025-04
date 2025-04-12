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
    """알고리즘 문제 생성을 위한 외부 스크립트 호출 (분리된 프로세스)."""
    # api_key = get_api_key(api_key) # 제거

    # --- 입력 값 검증 --- 
    if not algorithm_type or not difficulty:
        raise ValueError("'algorithm_type' and 'difficulty' are required.")

    # difficulty 검증 (기존 로직)
    if difficulty not in DIFFICULTY_LEVELS:
        raise ValueError(f"Invalid difficulty: {difficulty}. Must be one of {DIFFICULTY_LEVELS}")
    
    # algorithm_type 검증 추가
    if algorithm_type not in ALGORITHM_TYPES:
        raise ValueError(f"Invalid algorithm_type: {algorithm_type}. Must be one of {ALGORITHM_TYPES}")
    # --- 검증 끝 ---

    # generator.py 스크립트의 절대 경로 찾기
    generator_script_path = (Path(__file__).parent.parent.parent / 
                             'problem-generator' / 'generation' / 'generator.py')
    if not generator_script_path.exists():
        raise FileNotFoundError(f"Generator script not found at {generator_script_path}")

    # 현재 Python 인터프리터 경로
    python_executable = sys.executable

    # 실행할 명령어 구성 (API 키는 환경 변수로 전달됨)
    # 입력 값이 검증되었으므로 안전하게 사용 가능
    command = [
        python_executable, str(generator_script_path),
        '--type', algorithm_type, # 검증된 값 사용
        '--difficulty', difficulty, # 검증된 값 사용
        '--quiet' # 자식 프로세스의 print 출력을 억제
    ]

    if verbose:
        print(f"\n{algorithm_type} 유형의 {difficulty} 난이도 문제 생성을 시작합니다... (외부 프로세스 호출)\n")
        print(f"Executing command: {' '.join(command)}")

    try:
        # generator.py 스크립트를 별도 프로세스로 실행하고 출력을 캡처
        # API 키는 환경 변수로 전달되므로 명시적으로 설정할 필요 없음 (상속됨)
        # 만약 상속되지 않는 환경이라면, env 인자를 사용하여 전달해야 함:
        # process_env = os.environ.copy()
        # process_env["GOOGLE_AI_API_KEY"] = api_key
        result = subprocess.run(command, capture_output=True, text=True, check=True, encoding='utf-8')

        if verbose:
            print("External process output:")
            print(result.stdout)
            if result.stderr:
                print("External process error output:")
                print(result.stderr)

        # 프로세스 출력에서 JSON 결과 파싱
        try:
            output_data = json.loads(result.stdout)
            if not isinstance(output_data, list) or not output_data:
                raise json.JSONDecodeError("Expected a non-empty list as JSON output", result.stdout, 0)
            # 성공 시 첫 번째 문제 객체 반환 (현재 구조상 하나만 생성됨)
            return output_data[0]
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from subprocess output: {e}")
            print(f"Subprocess stdout: {result.stdout}")
            # 임시 에러 처리: 빈 딕셔너리 대신 구조화된 에러 반환 또는 예외 발생
            return {
                "error": "Failed to parse problem generation result",
                "details": str(e),
                "raw_output": result.stdout,
                "algorithm_type": algorithm_type,
                "difficulty": difficulty
            }

    except subprocess.CalledProcessError as e:
        print(f"Error running generator script: {e}")
        print(f"Return code: {e.returncode}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")
        # 에러 발생 시 구조화된 정보 반환
        return {
            "error": "Problem generation script failed",
            "details": str(e),
            "return_code": e.returncode,
            "stdout": e.stdout,
            "stderr": e.stderr,
            "algorithm_type": algorithm_type,
            "difficulty": difficulty
        }
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        # 기타 예외 처리
        return {
            "error": "An unexpected error occurred during problem generation",
            "details": str(e),
            "algorithm_type": algorithm_type,
            "difficulty": difficulty
        }

# Example usage (for local testing)
if __name__ == "__main__":
    # .env 파일 로드 (이 스크립트 위치 기준 또는 환경 변수 사용)
    load_dotenv()

    parser = argparse.ArgumentParser(description="Generate an algorithm problem via external script.")
    parser.add_argument("-t", "--type", required=True, help="Algorithm type (e.g., '구현', '그래프')")
    parser.add_argument("-d", "--difficulty", required=True, help="Difficulty level ('튜토리얼', '쉬움', '보통', '어려움')")
    # parser.add_argument("--api_key", help="Google AI API Key (optional, uses env var if not provided)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    args = parser.parse_args()

    try:
        # generate_problem 호출 시 api_key 인자 제거
        result_problem = generate_problem(
            api_key=None, # 명시적으로 None 전달 또는 인자 제거
            algorithm_type=args.type, 
            difficulty=args.difficulty, 
            verbose=args.verbose
        )
        print("\n--- Generated Problem Data ---")
        print(json.dumps(result_problem, indent=2, ensure_ascii=False))
    except ValueError as e:
        print(f"Error: {e}")
    except FileNotFoundError as e:
        print(f"Error: {e}")