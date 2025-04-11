import os
# from dotenv import load_dotenv
from typing import Optional, Dict, Any, Union, List

# Langchain 컴포넌트 가져오기
from langchain_core.language_models import BaseLLM
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

# 향후 AWS Bedrock 지원을 위한 준비 
# from langchain_aws import BedrockChat

# 환경 변수 로드
# load_dotenv()

# 모델 제공자 상수
PROVIDER_GOOGLE = "google"
PROVIDER_BEDROCK = "bedrock"

# 모델 이름 매핑 딕셔너리
MODEL_NAME_MAPPING = {
    # 짧은 이름: 전체 이름 매핑
    "gemini-flash": "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-pro": "gemini-2.5-pro-exp-03-25",
    # 원래 이름도 그대로 사용할 수 있도록 유지
    "gemini-2.0-flash-thinking-exp-01-21": "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-2.5-pro-exp-03-25": "gemini-2.5-pro-exp-03-25",
}

def get_api_key(api_key=None):
    """API 키를 가져오고 검증"""
    if api_key is None:
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            raise ValueError("API 키가 제공되지 않았습니다. .env 파일에 GOOGLE_AI_API_KEY를 설정하거나 인자로 전달하세요.")
    return api_key

def _get_thinking_model(api_key=None, temperature=0.2):
    """[내부 함수] 추론 작업에 특화된 LLM 모델을 가져옴"""
    api_key = get_api_key(api_key)
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-thinking-exp-01-21",
        google_api_key=api_key,
        temperature=temperature,
        convert_system_message_to_human=True,
        max_output_tokens=4096
    )

def get_llm(api_key=None, model_name="gemini-flash", temperature=0.7, model_type=None):
    """일반 용도의 표준 LLM 모델이나 특화된 모델을 가져옴
    
    Args:
        api_key (str, optional): Google AI API 키
        model_name (str, optional): 사용할 모델 이름 (짧은 이름 또는 전체 이름)
        temperature (float, optional): 생성 온도 (낮을수록 결정적, 높을수록 창의적)
        model_type (str, optional): "thinking"일 경우 추론 특화 모델 반환
        
    Returns:
        ChatGoogleGenerativeAI: 설정된 LLM 모델 인스턴스
    """
    # 추론 특화 모델 요청 시 전용 함수 호출
    if model_type == "thinking":
        return _get_thinking_model(api_key=api_key, temperature=temperature)
    
    # 모델 이름 매핑 적용
    full_model_name = MODEL_NAME_MAPPING.get(model_name, model_name)
    
    # API 키 가져오기
    api_key = get_api_key(api_key)
    
    # 일반 표준 모델 설정
    return ChatGoogleGenerativeAI(
        model=full_model_name,
        google_api_key=api_key,
        temperature=temperature,
        convert_system_message_to_human=True
    )

def create_chain(prompt_template, model=None):
    """LCEL 파이프라인 구문을 사용하여 텍스트 생성을 위한 간단한 체인 생성
    
    Args:
        prompt_template (str): {variables} 형태의 변수를 포함한 프롬프트 템플릿
        model (ChatGoogleGenerativeAI, optional): 사용할 LLM 모델
        
    Returns:
        입력 변수를 받아 텍스트 출력을 반환하는 간단한 체인
        
    Example:
        ```python
        chain = create_chain("다음 주제에 대해 설명해 주세요: {topic}")
        result = chain.invoke({"topic": "LCEL 파이프라인"})
        ```
    """
    if model is None:
        model = get_llm(model_type="thinking")
    
    # f-string이 아닌 단순 문자열 템플릿을 가정하고 처리
    # 중괄호 이스케이프를 위해 .replace() 사용
    safe_template = prompt_template.replace('{', '{{}}').replace('}', '{{}}')
    
    # 변수 없는 채팅 프롬프트 템플릿 생성
    prompt = ChatPromptTemplate.from_messages([
        ("system", "당신은 알고리즘 분석과 문제 생성을 도와주는 전문 AI 어시스턴트입니다."),
        ("human", safe_template)
    ])
    
    # 체인 생성 및 반환
    output_parser = StrOutputParser()
    chain = prompt | model | output_parser
    
    return chain

def create_advanced_chain(
    prompt_templates: Dict[str, str],
    model=None,
    output_parser=None
):
    """LCEL 파이프라인 구문을 사용하여 여러 단계의 고급 체인 생성
    
    Args:
        prompt_templates (Dict[str, str]): 단계명: 프롬프트_템플릿 형태의 딕셔너리
        model (ChatGoogleGenerativeAI, optional): 사용할 LLM 모델
        output_parser (BaseOutputParser, optional): 최종 출력용 파서
        
    Returns:
        여러 단계를 처리하는 고급 체인
        
    Example:
        ```python
        prompts = {
            "analyze": "다음 코드를 분석하세요: {code}",
            "improve": "이 분석을 바탕으로 코드를 개선하세요: {analysis}"
        }
        chain = create_advanced_chain(prompts)
        result = chain.invoke({"code": "def add(a, b): return a + b"})
        ```
    """
    if model is None:
        model = get_llm(model_type="thinking")
        
    if output_parser is None:
        output_parser = StrOutputParser()
    
    # 초기 상태 생성
    initial_step = RunnablePassthrough()
    
    # 파이프라인의 각 단계 생성
    current_pipeline = initial_step
    steps = list(prompt_templates.keys())
    
    for i, step_name in enumerate(steps):
        # 첫 번째 단계는 입력에서 직접 처리
        if i == 0:
            # 이 단계의 프롬프트 템플릿 생성
            template = prompt_templates[step_name]
            prompt = ChatPromptTemplate.from_messages([
                ("system", "당신은 전문 AI 어시스턴트입니다."),
                ("human", template)
            ])
            
            # 단계를 파이프라인에 추가
            current_pipeline = current_pipeline.assign(
                **{step_name: prompt | model | StrOutputParser()}
            )
        else:
            # 이후 단계는 이전 단계의 결과 사용
            template = prompt_templates[step_name]
            prompt = ChatPromptTemplate.from_messages([
                ("system", "당신은 전문 AI 어시스턴트입니다."),
                ("human", template)
            ])
            
            # 단계를 파이프라인에 추가
            current_pipeline = current_pipeline.assign(
                **{step_name: prompt | model | StrOutputParser()}
            )
    
    # 전체 파이프라인 반환
    return current_pipeline

def create_json_chain(prompt_template, pydantic_model: type[BaseModel], model=None):
    """구조화된 JSON 출력을 반환하는 체인 생성 (Pydantic 모델 객체 반환)
    
    Args:
        prompt_template (str): {variables} 형태의 변수를 포함한 프롬프트 템플릿
        pydantic_model (Type[BaseModel]): 예상되는 출력 구조를 정의하는 Pydantic 모델
        model (ChatGoogleGenerativeAI, optional): 사용할 LLM 모델
        
    Returns:
        입력을 처리하고 구조화된 Pydantic 모델 인스턴스를 반환하는 체인
        
    Example:
        ```python
        from pydantic import BaseModel, Field
        class Person(BaseModel):
            name: str = Field(description="사람의 이름")
            age: int = Field(description="사람의 나이")
        
        chain = create_json_chain("다음 텍스트에서 이름과 나이를 추출하세요: {text}", Person)
        result = chain.invoke({"text": "홍길동은 30세입니다"})
        # 반환값: Person(name='홍길동', age=30)
        ```
    """
    if model is None:
        model = get_llm(model_type="thinking")
    
    # Pydantic 모델을 사용하는 파서 생성
    parser = PydanticOutputParser(pydantic_object=pydantic_model)
    
    # 프롬프트 템플릿 정의 (마크다운 금지 지침 추가)
    system_message = f"""
    당신은 전문 AI 어시스턴트입니다. 사용자의 요청을 처리하고 그 결과를 JSON 형식으로 반환하세요. 
    다음은 출력해야 할 JSON 객체의 형식입니다:\n{{format_instructions}}
    **중요: JSON 응답을 절대 마크다운 코드 블록(```)으로 감싸지 마세요.**
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_message),
        ("human", prompt_template) 
    ]).partial(format_instructions=parser.get_format_instructions())
    
    # 체인 구성: 마크다운 제거 단계 제거
    chain = prompt | model | parser # StrOutputParser와 RunnableLambda 제거
    
    return chain

# 디렉토리를 적절한 패키지로 만들기 위해 __init__.py 파일 추가
if not os.path.exists(os.path.dirname(os.path.abspath(__file__)) + "/__init__.py"):
    with open(os.path.dirname(os.path.abspath(__file__)) + "/__init__.py", "w") as f:
        pass
