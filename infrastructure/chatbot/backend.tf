terraform {
  backend "s3" {
    bucket         = "alpaco-tfstate-bucket-kmu" # backend-setup 출력값
    key            = "chatbot/terraform.tfstate" # Chatbot 모듈의 고유 키
    region         = "ap-northeast-2"            # 리전
    dynamodb_table = "alpaco-tfstate-lock-table" # backend-setup 출력값
    encrypt        = true
  }
} 