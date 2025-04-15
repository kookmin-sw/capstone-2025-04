terraform {
  backend "s3" {
    # backend-setup 결과와 이 모듈의 고유 키를 고정값으로 설정
    bucket         = "alpaco-tfstate-bucket-kmu" # backend-setup 출력값
    key            = "app/terraform.tfstate"     # App 모듈의 고유 키
    region         = "ap-northeast-2"            # 리전
    dynamodb_table = "alpaco-tfstate-lock-table" # backend-setup 출력값
    encrypt        = true
  }
}
