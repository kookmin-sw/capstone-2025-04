import os
from dotenv import load_dotenv
from typing import Optional

# Langchain 컴포넌트 가져오기
from langchain_core.language_models import BaseLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

# 향후 AWS Bedrock 지원을 위한 준비 
# from langchain_aws import BedrockChat

# 환경 변수 로드
load_dotenv()

# 모델 제공자 상수
PROVIDER_GOOGLE = "google"
PROVIDER_BEDROCK = "bedrock"

def get_llm(
    provider: str = None, 
    model_name: str = None, 
    temperature: float = 0, 
    api_key: str = None
) -> BaseLLM:
    """
    지정된 제공자에 기반한 LLM을 초기화하고 반환합니다.
    
    Args:
        provider: 모델 제공자 (예: "google", "bedrock")
        model_name: 사용할 특정 모델
        temperature: 샘플링 온도
        api_key: 제공자에 대한 API 키
        
    Returns:
        초기화된 Langchain LLM
    """
    # 기본값은 환경 변수 설정을 사용
    provider = provider or os.getenv("LLM_PROVIDER", PROVIDER_GOOGLE)
    api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
    
    if provider == PROVIDER_GOOGLE:
        model_name = model_name or os.getenv("GOOGLE_MODEL", "gemini-2.0-flash")
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=api_key
        )
    
    elif provider == PROVIDER_BEDROCK:
        # AWS Bedrock 지원이 추가될 때를 위한 플레이스홀더
        model_name = model_name or os.getenv("BEDROCK_MODEL", "anthropic.claude-3-sonnet-20240229-v1:0")
        
        # Bedrock 구현 시 주석 해제
        # region = os.getenv("AWS_REGION", "us-east-1")
        # return BedrockChat(
        #     model_id=model_name,
        #     region_name=region,
        #     temperature=temperature
        # )
        
        raise NotImplementedError("AWS Bedrock 지원이 아직 구현되지 않았습니다")
    
    else:
        raise ValueError(f"지원되지 않는 모델 제공자: {provider}")

def create_chain(prompt_template: str, llm: Optional[BaseLLM] = None):
    """
    주어진 프롬프트 템플릿과 LLM으로 Langchain 처리 체인을 생성합니다.
    
    Args:
        prompt_template: 프롬프트 템플릿 문자열
        llm: 초기화된 LLM (None인 경우 기본 설정 사용)
        
    Returns:
        템플릿에 따라 입력을 처리하는 호출 가능한 체인
    """
    prompt = ChatPromptTemplate.from_template(prompt_template)
    llm = llm or get_llm()
    
    return prompt | llm | StrOutputParser()

def get_thinking_model(api_key=None):
    """Gemini의 'thinking' 변형을 특별히 반환합니다"""
    return get_llm(
        provider=PROVIDER_GOOGLE,
        model_name="gemini-2.0-flash-thinking-exp-01-21",
        api_key=api_key
    )

# 디렉토리를 적절한 패키지로 만들기 위해 __init__.py 파일 추가
if not os.path.exists(os.path.dirname(os.path.abspath(__file__)) + "/__init__.py"):
    with open(os.path.dirname(os.path.abspath(__file__)) + "/__init__.py", "w") as f:
        pass
