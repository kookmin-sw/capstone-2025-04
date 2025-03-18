import os
import random
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Remove unused LangChain imports that are causing errors
# If you need to use these in the future, use the langchain_community package instead:
# from langchain_community.llms import GooglePalm
# from langchain_community.chat_models import ChatGoogleGenerativeAI

# Add Google Generative AI import
import google.generativeai as genai

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

def setup_api(api_key):
    """Setup the Google Generative AI API with the provided key"""
    genai.configure(api_key=api_key)

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
    def __init__(self, api_key=None):
        """Initialize the problem generator with API key"""
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not self.api_key:
            raise ValueError("No API key provided. Set GOOGLE_AI_API_KEY in .env file or pass it as an argument.")
        setup_api(self.api_key)
        
    def generate_problem(self, algorithm_type, difficulty):
        """Generate a problem using the specified algorithm type and difficulty"""
        # Load template
        try:
            template_code, template_file = load_template(algorithm_type, difficulty)
        except (ValueError, FileNotFoundError) as e:
            return {"error": str(e)}
        
        # Get difficulty-specific description for the prompt
        difficulty_desc = DIFFICULTY_DESCRIPTIONS.get(difficulty, "")
        
        # Determine style based on difficulty
        style_desc = STYLE_DESCRIPTIONS["Atcoder"]
        if difficulty in ["보통", "어려움"]:
            style_desc = STYLE_DESCRIPTIONS["Baekjoon"]
        
        # Create the prompt for the LLM
        prompt = f"""
        당신은 알고리즘 문제 생성 전문가입니다. 다음 정보를 기반으로 고품질 알고리즘 문제를 생성해주세요:
        
        ## 문제 생성 프로세스
        1. 주어진 템플릿 코드를 변형하여 새롭고 독창적인 문제를 만드세요.
        2. 템플릿 코드의 일부를 변경하고, 변경된 부분에 주석으로 설명을 추가하세요.
        3. 변형된 코드에 맞는 문제 지문을 생성하세요.
        4. 테스트 케이스를 생성하는 코드를 작성하고, 이 코드로 예제 입력과 출력도 생성하세요.
        
        ## 입력 정보
        - 알고리즘 유형: {algorithm_type}
        - 난이도 수준: {difficulty}
        
        ## 난이도 요구사항
        {difficulty_desc}
        
        ## 문제 포맷 스타일
        {style_desc}
        
        ## 베이스 템플릿 코드
        ```
        {template_code}
        ```
        
        ## 요구사항:
        1. 반드시 템플릿 코드의 일부를 변형하고, 변경된 부분에 주석을 달아주세요.
        2. 문제 설명과 입출력 형식을 명확하게 작성하세요.
        3. 테스트 케이스 생성 코드는 문제의 입력과 예상 출력을 생성할 수 있어야 합니다.
        4. 예제 입력과 출력은 테스트 케이스 생성 코드를 사용하여 만들어야 합니다.
        
        다음 정확한 형식으로 응답해주세요:
        
        ## 문제 설명
        
        [Problem description]
        
        ## 입력
        
        [Input format description]
        
        ## 출력
        
        [Output format description]
        
        ### 예제 입력
        
        [Example input]
        
        ### 예제 출력
        
        [Example output]
        
        {"### 사용되는 알고리즘" if difficulty == "튜토리얼" else ""}
        
        {"[알고리즘 유형에 대한 간략한 설명]" if difficulty == "튜토리얼" else ""}
        
        {"[이 문제가 해당 알고리즘에 어떻게 적용되는지 설명]" if difficulty == "튜토리얼" else ""}
        
        ### 정답 코드
        
        ```python
        [변형된 템플릿 코드와 변경 사항에 대한 주석]
        ```
        
        ### 테스트 케이스 생성 코드
        
        ```python
        [예제 입력과 출력을 생성하는 코드]
        ```
        """
        
        # Get a response from the model
        model = genai.GenerativeModel('gemini-2.0-flash-thinking-exp-01-21')
        response = model.generate_content(prompt)
        
        return {
            "algorithm_type": algorithm_type,
            "difficulty": difficulty,
            "template_used": template_file,
            "generated_problem": response.text
        }

def generate_problem(api_key, algorithm_type, difficulty):
    """
    Generate a problem using the Google AI Studio API
    """
    generator = ProblemGenerator(api_key)
    return generator.generate_problem(algorithm_type, difficulty)

def main():
    parser = argparse.ArgumentParser(description='Generate algorithmic problems using Google AI')
    parser.add_argument('--api_key', help='Google AI Studio API key')
    parser.add_argument('--algorithm_type', choices=ALGORITHM_TYPES, help='Type of algorithm')
    parser.add_argument('--difficulty', choices=DIFFICULTY_LEVELS, help='Difficulty level')
    parser.add_argument('--output', help='Output file path (optional)')
    
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
    result = generate_problem(api_key, algorithm_type, difficulty)
    
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