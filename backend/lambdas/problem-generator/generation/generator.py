import os
import random
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
import sys
import time

# Fix import error when running directly
if __name__ == "__main__":
    # Add parent directory to sys.path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(script_dir)
    sys.path.insert(0, parent_dir)
    from utils.model_manager import get_llm, create_chain
else:
    # When imported as a module, use relative import
    from ..utils.model_manager import get_llm, create_chain

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
        test_cases = self._generate_test_cases(transformed_code, problem_description)
        
        # Step 5: Final integration
        self.show_progress(5, 6, "최종 문제 통합 중...")
        final_problem = self._integrate_results(
            problem_description, test_cases, transformed_code,
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
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 아래 템플릿 코드를 이전 분석을 바탕으로 변형해주세요:
        
        ## 템플릿 분석 결과
        {template_analysis}
        
        ## 원본 템플릿 코드
        ```
        {template_code}
        ```
        
        다음 요구사항에 맞게 코드를 변형해주세요:
        1. 템플릿의 알고리즘 구조는 유지하되, 구체적인 구현을 새롭게 변경
        2. 변경한 부분에는 명확한 주석 추가
        3. 변경된 코드가 올바르게 동작하는지 확인
        4. 테스트 케이스를 쉽게 만들 수 있는 형태로 구성
        
        변형된 코드만 python 코드 블록으로 반환해주세요.
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
        """Step 4: Generate test cases for the problem"""
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 아래 문제 설명과 코드를 바탕으로 테스트 케이스를 생성해주세요:
        
        ## 문제 설명
        {problem_description}
        
        ## 변형된 코드
        {transformed_code}
        
        다음 항목들을 생성해주세요:
        1. 테스트 케이스를 생성하는 Python 코드 (무작위 입력 생성 또는 특정 케이스 생성)
        2. 위 코드로 생성한 3~5개의 예제 입력과 해당하는 출력
        3. 문제 난이도에 적합한 다양한 테스트 케이스 (기본 케이스, 경계 케이스, 예외 케이스 등)
        
        모든 테스트 케이스는 변형된 코드로 해결할 수 있어야 합니다.
        """
        chain = create_chain(prompt, self.model)
        response = chain.invoke({})
        return response
    
    def _integrate_results(self, problem_description, test_cases, transformed_code, algorithm_type, difficulty):
        """Step 5: Integrate all previous steps into a complete problem"""
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 지금까지 생성된 내용을 통합하여 최종 문제를 완성해주세요:
        
        ## 문제 설명, 입력, 출력 형식
        {problem_description}
        
        ## 테스트 케이스 및 예제
        {test_cases}
        
        ## 변형된 코드
        {transformed_code}
        
        ## 입력 정보
        - 알고리즘 유형: {algorithm_type}
        - 난이도 수준: {difficulty}
        
        다음 정확한 형식으로 최종 문제를 구성해주세요:
        
        ## 문제 설명
        
        [통합된 문제 설명]
        
        ## 입력
        
        [입력 형식 설명]
        
        ## 출력
        
        [출력 형식 설명]
        
        ### 예제 입력
        
        [테스트 케이스에서 선택한 예제 입력]
        
        ### 예제 출력
        
        [테스트 케이스에서 선택한 예제 출력]
        
        {"### 사용되는 알고리즘" if difficulty == "튜토리얼" else ""}
        
        {"[알고리즘 유형에 대한 간략한 설명]" if difficulty == "튜토리얼" else ""}
        
        {"[이 문제가 해당 알고리즘에 어떻게 적용되는지 설명]" if difficulty == "튜토리얼" else ""}
        
        ### 정답 코드
        
        ```python
        [변형된 코드]
        ```
        
        ### 테스트 케이스 생성 코드
        
        ```python
        [테스트 케이스 생성 코드]
        ```
        
        각 부분을 유기적으로 연결하여 완성도 높은 최종 문제를 만들어주세요.
        """
        chain = create_chain(prompt, self.model)
        response = chain.invoke({})
        return response

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
            if args.output.endswith('.json'):
                json.dump(result, f, ensure_ascii=False, indent=2)
            else:
                f.write(result["generated_problem"])
        print(f"Problem saved to {args.output}")
    else:
        print("\n" + "="*50 + "\n")
        print(result["generated_problem"])

if __name__ == "__main__":
    main()