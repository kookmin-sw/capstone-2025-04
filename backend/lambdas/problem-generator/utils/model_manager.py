import os
from dotenv import load_dotenv
from typing import Optional

# Langchain 컴포넌트 가져오기
from langchain_core.language_models import BaseLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
import re

# 향후 AWS Bedrock 지원을 위한 준비 
# from langchain_aws import BedrockChat

# 환경 변수 로드
load_dotenv()

# 모델 제공자 상수
PROVIDER_GOOGLE = "google"
PROVIDER_BEDROCK = "bedrock"

def get_api_key(api_key=None):
    """Get and validate API key"""
    if api_key is None:
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        if not api_key:
            raise ValueError("No API key provided. Set GOOGLE_AI_API_KEY in .env file or pass it as an argument.")
    return api_key

def get_llm(api_key=None, model_name="gemini-1.5-pro", temperature=0.7):
    """Get a standard LLM for general use"""
    api_key = get_api_key(api_key)
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=temperature,
        convert_system_message_to_human=True
    )

def get_thinking_model(api_key=None, temperature=0.2):
    """Get an LLM specifically configured for reasoning tasks"""
    api_key = get_api_key(api_key)
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        google_api_key=api_key,
        temperature=temperature,
        convert_system_message_to_human=True,
        max_output_tokens=4096
    )

def create_chain(prompt_template, model=None):
    """Create a simple LangChain for text generation
    
    Args:
        prompt_template (str): The prompt template with {variables}
        model (ChatGoogleGenerativeAI, optional): LLM model to use
        
    Returns:
        A simple chain that takes input variables and returns text output
    """
    if model is None:
        model = get_thinking_model()
    
    # 가장 안전한 방법: 중괄호 이스케이프를 위해 모든 중괄호를 두 배로 처리
    safe_template = re.sub(r'{', r'{{', prompt_template)
    safe_template = re.sub(r'}', r'}}', safe_template)
    
    # Create a chat prompt template without variables
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert AI assistant that helps with algorithm analysis and problem generation."),
        ("human", safe_template)
    ])
    
    # Create and return the chain
    output_parser = StrOutputParser()
    chain = prompt | model | output_parser
    
    return chain

# 디렉토리를 적절한 패키지로 만들기 위해 __init__.py 파일 추가
if not os.path.exists(os.path.dirname(os.path.abspath(__file__)) + "/__init__.py"):
    with open(os.path.dirname(os.path.abspath(__file__)) + "/__init__.py", "w") as f:
        pass
