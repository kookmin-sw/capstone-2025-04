import gradio as gr
import os
from pathlib import Path

# 같은 디렉토리에서 임포트
from template_classifier import classify_template, save_template, ALGORITHM_CATEGORIES

def analyze_code(code, save_file=False):
    # 임시 파일에 코드 저장
    temp_file = Path("temp_code.cpp")
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(code)
    
    try:
        # 코드 분류
        category, full_analysis = classify_template(temp_file)
        
        # 요청 시 파일 저장
        save_message = ""
        if save_file:
            templates_dir = "templates"
            dest_path = save_template(temp_file, category, templates_dir)
            save_message = f"\n\n파일 저장 위치: {dest_path}"
        
        # 임시 파일 삭제
        temp_file.unlink()
        
        return f"카테고리: {category}\n\n{full_analysis}{save_message}"
    
    except Exception as e:
        # 임시 파일 정리
        if temp_file.exists():
            temp_file.unlink()
        return f"코드 분석 중 오류 발생: {str(e)}"

def analyze_file(file_path, save_file=False):
    if not file_path:
        return "파일이 제공되지 않았습니다"
    
    try:
        # 파일 읽기
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
        
        # 코드 분류
        category, full_analysis = classify_template(file_path)
        
        # 요청 시 파일 저장
        save_message = ""
        if save_file:
            templates_dir = "templates"
            dest_path = save_template(file_path, category, templates_dir)
            save_message = f"\n\n파일 저장 위치: {dest_path}"
        
        return f"카테고리: {category}\n\n{full_analysis}{save_message}"
    
    except Exception as e:
        return f"파일 분석 중 오류 발생: {str(e)}"

def main():
    # Gradio 인터페이스 생성
    with gr.Blocks(title="알고리즘 템플릿 분석기") as demo:
        gr.Markdown("# 알고리즘 템플릿 분석기")
        gr.Markdown("템플릿 코드를 붙여넣거나 파일을 업로드하여 알고리즘 유형을 분석합니다.")
        
        with gr.Tab("코드 입력"):
            code_input = gr.Code(language="cpp", label="템플릿 코드")
            save_checkbox = gr.Checkbox(label="분류 후 저장하기")
            analyze_button = gr.Button("분석하기")
            result = gr.Textbox(label="분석 결과", lines=10)
            
            analyze_button.click(
                fn=analyze_code,
                inputs=[code_input, save_checkbox],
                outputs=result
            )
        
        with gr.Tab("파일 업로드"):
            file_input = gr.File(label="템플릿 파일")
            save_file_checkbox = gr.Checkbox(label="분류 후 저장하기")
            file_analyze_button = gr.Button("파일 분석하기")
            file_result = gr.Textbox(label="분석 결과", lines=10)
            
            file_analyze_button.click(
                fn=analyze_file,
                inputs=[file_input, save_file_checkbox],
                outputs=file_result
            )
        
        # 사용 가능한 카테고리 표시
        categories_md = "## 사용 가능한 알고리즘 카테고리\n\n"
        for name, desc in ALGORITHM_CATEGORIES.items():
            categories_md += f"- **{name}**: {desc}\n"
        
        gr.Markdown(categories_md)
    
    # 앱 실행
    demo.launch()

if __name__ == "__main__":
    main()