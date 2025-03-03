#!/bin/bash

# 개발 환경 설정 스크립트 for Mac
# 사용법: 터미널에서 `chmod +x setup_dev_env.sh && ./setup_dev_env.sh` 실행

echo "🚀 프로젝트 개발 환경을 설정합니다..."

# 1️⃣ Homebrew 설치 (이미 설치되어 있으면 건너뜀)
if ! command -v brew &>/dev/null; then
  echo "🍺 Homebrew를 설치합니다..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "✅ Homebrew가 이미 설치되어 있습니다."
fi

# 2️⃣ 필수 패키지 설치
echo "📦 필수 패키지를 설치합니다..."
brew install \
  git \
  node \
  python@3.9 \
  awscli \
  aws-sam-cli \
  terraform \
  docker \
  jq

# 3️⃣ Node.js 및 npm 패키지 설치 (프론트엔드 환경 설정)
if [ -d "frontend" ]; then
  echo "📦 프론트엔드 패키지 설치 중..."
  cd frontend
  npm install
  cd ..
else
  echo "⚠️ frontend 디렉토리가 없습니다. 프론트엔드 설치를 건너뜁니다."
fi

# 4️⃣ Python 가상 환경 설정 및 백엔드 패키지 설치
if [ -d "backend" ]; then
  echo "🐍 백엔드 Python 환경을 설정합니다..."
  cd backend
  
  # conda가 있는지 확인하고 우선 사용
  if command -v conda &>/dev/null; then
    echo "🐍 conda를 사용하여 Python 환경을 설정합니다..."
    
    # capstone 환경이 이미 있는지 확인
    if conda info --envs | grep -q "capstone"; then
      echo "✅ conda 환경 'capstone'이 이미 존재합니다."
    else
      echo "🔧 conda 환경 'capstone'을 생성합니다..."
      conda create -y -n capstone python=3.9
    fi
    
    # conda 환경 활성화 및 패키지 설치
    eval "$(conda shell.bash hook)"
    conda activate capstone
    pip install --upgrade pip
    pip install -r requirements.txt
    conda deactivate
    
    echo "🔔 백엔드 작업 시 'conda activate capstone' 명령으로 환경을 활성화하세요."
  else
    echo "🐍 conda가 없습니다. venv를 사용하여 Python 환경을 설정합니다..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    
    echo "🔔 백엔드 작업 시 'source venv/bin/activate' 명령으로 환경을 활성화하세요."
  fi
  
  cd ..
else
  echo "⚠️ backend 디렉토리가 없습니다. 백엔드 설정을 건너뜁니다."
fi

# 5️⃣ AWS 자격증명 설정 확인
if [ -f "$HOME/.aws/credentials" ]; then
  echo "✅ AWS 자격증명이 설정되어 있습니다."
else
  echo "⚠️ AWS 자격증명이 설정되지 않았습니다. 'aws configure'를 실행하여 설정하세요."
fi

# 6️⃣ Docker 데몬 실행 확인
if ! pgrep -x "Docker" > /dev/null; then
  echo "🐳 Docker가 실행되지 않았습니다. Docker를 실행해주세요."
else
  echo "✅ Docker가 실행 중입니다."
fi

# 7️⃣ Terraform 초기화
if [ -d "infrastructure" ]; then
  echo "🛠 Terraform 초기화 중..."
  cd infrastructure
  terraform init
  cd ..
else
  echo "⚠️ infrastructure 디렉토리가 없습니다. Terraform 초기화를 건너뜁니다."
fi

# 8️⃣ SAM 로컬 API 실행 (선택적)
echo "🚀 SAM 로컬 API 실행을 원하면 'cd infrastructure && sam local start-api'를 실행하세요."

echo "🎉 개발 환경 설정이 완료되었습니다!"
