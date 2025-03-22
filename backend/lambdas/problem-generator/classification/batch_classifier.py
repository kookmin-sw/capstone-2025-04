import os
import argparse
import glob
import sys
import time
from pathlib import Path

# 같은 디렉토리에서 임포트
from template_classifier import classify_template, save_template

def main():
    parser = argparse.ArgumentParser(description='여러 템플릿 코드 파일 일괄 분류')
    parser.add_argument('--directory', '-d', required=True, help='템플릿 코드 파일이 있는 디렉토리')
    parser.add_argument('--pattern', '-p', default='*.cpp', help='파일 패턴 (기본값: *.cpp)')
    parser.add_argument('--templates_dir', default='templates', 
                       help='대상 템플릿 디렉토리 (problem-generator 디렉토리 기준 상대 경로)')
    parser.add_argument('--dry-run', action='store_true', help='저장 없이 분류만 수행')
    parser.add_argument('--delay', '-t', type=float, default=1.0, 
                       help='파일 처리 사이의 지연 시간(초) (기본값: 1.0)')
    
    args = parser.parse_args()
    
    # 파일 패턴에 맞는 파일 모두 가져오기
    file_pattern = os.path.join(args.directory, args.pattern)
    files = glob.glob(file_pattern)
    
    if not files:
        print(f"'{args.pattern}' 패턴과 일치하는 파일이 '{args.directory}' 디렉토리에 없습니다")
        return 1
    
    print(f"{len(files)}개 파일 처리 예정")
    
    # 각 파일 처리
    for i, file_path in enumerate(files):
        try:
            print(f"\n{file_path} 처리 중... ({i+1}/{len(files)})")
            category, _ = classify_template(file_path)
            
            if args.dry_run:
                print(f"  분류: {category} (DRY RUN - 저장하지 않음)")
            else:
                dest_path = save_template(file_path, category, args.templates_dir)
                print(f"  저장 위치: {dest_path}")
            
            # 마지막 파일이 아니면 지연 시간 적용
            if i < len(files) - 1:
                print(f"  다음 파일 처리 전 {args.delay}초 대기 중...")
                time.sleep(args.delay)
                
        except Exception as e:
            print(f"  {file_path} 처리 중 오류 발생: {str(e)}")
    
    return 0

if __name__ == "__main__":
    exit(main())