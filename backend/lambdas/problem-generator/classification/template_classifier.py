import os
import argparse
import shutil
from pathlib import Path
from dotenv import load_dotenv
import logging
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# 시스템에서 사용하는 알고리즘 카테고리 정의
ALGORITHM_CATEGORIES = {
    "tree": "트리 자료구조 및 알고리즘",
    "string": "문자열 조작 및 패턴 매칭 알고리즘",
    "sorting": "정렬 알고리즘",
    "shortest_path": "다익스트라, 벨만-포드, 플로이드-워셜 같은 최단 경로 알고리즘",
    "prefix_sum": "누적합 기법",
    "parametric_search": "매개 변수 탐색 기법",
    "math": "수학적 알고리즘 및 정수론",
    "implementation": "코딩 능력 중심의 구현 문제",
    "greedy": "그리디 알고리즘",
    "graph_traversal": "BFS, DFS와 같은 그래프 탐색 기법",
    "graph_theory": "그래프 이론 알고리즘",
    "eratosthenes": "에라토스테네스의 체 등 소수 알고리즘",
    "dp": "다이나믹 프로그래밍 알고리즘",
    "divide_and_conquer": "분할 정복 패러다임",
    "data_structures": "자료구조 구현 및 기법",
    "bruteforcing": "완전 탐색 알고리즘",
    "bit_mask": "비트 조작 기법",
    "binary_search": "이진 탐색 및 관련 알고리즘"
}

def setup_langchain():
    """LangChain 컴포넌트 초기화 및 설정"""
    # API 키 확인
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_AI_API_KEY 환경 변수가 설정되지 않았습니다")
    
    # Google AI 설정
    genai.configure(api_key=api_key)
    
    # 코드 분류를 위한 프롬프트 정의
    prompt_template = """
    당신은 알고리즘 분류 전문가입니다. 주어진 코드 스니펫을 분석하여 어떤 알고리즘 카테고리에 속하는지 판별해주세요.
    
    사용 가능한 카테고리:
    {categories}
    
    규칙:
    1. 언어 특성이 아닌 알고리즘 구현에 집중하세요
    2. 시간 복잡도와 공간 복잡도를 고려하세요
    3. 핵심 자료구조와 알고리즘 패턴을 찾으세요
    4. 알고리즘의 주요 목적을 파악하세요
    5. 가장 구체적인 카테고리를 선택하세요
    
    분류할 코드:
    ```
    {code}
    ```
    
    먼저, 이 코드가 어떤 알고리즘이나 자료구조를 구현하는지 간략히 분석해 주세요.
    그리고 다음 형식으로 분류 정보를 제공해 주세요:
    
    PRIMARY_CATEGORY: <카테고리_이름>
    CONFIDENCE: <high|medium|low>
    EXPLANATION: <선택 이유에 대한 간략한 설명>
    ALTERNATIVE_CATEGORY: <해당되는 경우, 다른 가능한 카테고리>
    """
    
    # 프롬프트용 카테고리 문자열 포맷팅
    categories_str = "\n".join([f"- {name}: {desc}" for name, desc in ALGORITHM_CATEGORIES.items()])
    
    # 프롬프트 템플릿 생성
    prompt = ChatPromptTemplate.from_template(prompt_template)
    
    # LLM 설정
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0, google_api_key=api_key)
    
    # 분류 체인 생성
    classification_chain = prompt | llm | StrOutputParser()
    
    return classification_chain, categories_str

def extract_classification(response_text):
    """LLM 응답에서 주요 카테고리 추출"""
    lines = response_text.split("\n")
    primary_category = None
    confidence = None
    
    for line in lines:
        if line.startswith("PRIMARY_CATEGORY:"):
            primary_category = line.split(":", 1)[1].strip().lower()
        if line.startswith("CONFIDENCE:"):
            confidence = line.split(":", 1)[1].strip().lower()
    
    # 유효한 카테고리인지 검증
    if primary_category not in ALGORITHM_CATEGORIES:
        closest_match = find_closest_match(primary_category)
        logger.warning(f"'{primary_category}' 카테고리가 인식되지 않았습니다. 가장 유사한 매치 사용: {closest_match}")
        primary_category = closest_match
    
    return primary_category, confidence

def find_closest_match(category_name):
    """정확한 매치가 없을 경우 가장 유사한 카테고리 찾기"""
    # 간단한 문자열 유사성 검사
    for name in ALGORITHM_CATEGORIES.keys():
        if name in category_name or category_name in name:
            return name
    
    # 매치가 없으면 기본 카테고리로
    return "implementation"

def classify_template(file_path):
    """LangChain을 사용하여 템플릿 파일 분류"""
    # 코드 파일 읽기
    with open(file_path, 'r', encoding='utf-8') as f:
        code_content = f.read()
    
    # LangChain 설정
    classification_chain, categories_str = setup_langchain()
    
    # 분류 실행
    logger.info(f"코드 파일 분석 중: {file_path}")
    response = classification_chain.invoke({"categories": categories_str, "code": code_content})
    
    # 응답에서 분류 추출
    primary_category, confidence = extract_classification(response)
    
    logger.info(f"분류: {primary_category} (확신도: {confidence})")
    logger.debug(f"전체 응답: {response}")
    
    return primary_category, response

def save_template(file_path, category, templates_dir="templates", base_dir=None):
    """템플릿 파일을 적절한 카테고리 디렉토리에 저장"""
    # 기본 템플릿 디렉토리 경로 설정
    if base_dir is None:
        # classification 폴더에서 상위 디렉토리로 이동하여 templates 폴더 접근
        base_dir = Path(__file__).parent.parent / templates_dir
    else:
        base_dir = Path(base_dir) / templates_dir
    
    # 카테고리 디렉토리가 없으면 생성
    category_dir = base_dir / category
    category_dir.mkdir(parents=True, exist_ok=True)
    
    # 파일 이름 추출
    file_name = Path(file_path).name
    
    # 대상 경로 생성
    dest_path = category_dir / file_name
    
    # 파일 복사
    shutil.copy2(file_path, dest_path)
    logger.info(f"템플릿 저장 완료: {dest_path}")
    
    return dest_path

def main():
    parser = argparse.ArgumentParser(description='알고리즘 템플릿 코드를 분류하고 템플릿 디렉토리에 정리합니다')
    parser.add_argument('file_path', help='분류할 템플릿 코드 파일 경로')
    parser.add_argument('--templates_dir', default='templates', help='템플릿 저장 디렉토리 (스크립트 위치 기준 상대 경로)')
    parser.add_argument('--save', action='store_true', help='분류된 디렉토리에 파일 저장')
    parser.add_argument('--verbose', action='store_true', help='상세 로그 출력 활성화')
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    try:
        # 템플릿 분류
        category, full_response = classify_template(args.file_path)
        
        print(f"\n분류 결과:")
        print(f"카테고리: {category}")
        print(f"전체 분석:\n{full_response}")
        
        # 요청 시 템플릿 저장
        if args.save:
            dest_path = save_template(args.file_path, category, args.templates_dir)
            print(f"\n템플릿 저장 위치: {dest_path}")
        
    except Exception as e:
        logger.error(f"템플릿 처리 중 오류 발생: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())