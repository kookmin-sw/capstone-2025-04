# VPC 생성
resource "aws_vpc" "grader_vpc" {
  cidr_block           = "10.0.0.0/16" # 예시 CIDR, 필요시 조정
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-GraderVPC-${var.environment}"
  })
}

# Internet Gateway 생성 및 VPC 연결
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.grader_vpc.id

  tags = merge(var.tags, {
    Name = "${var.project_name}-GraderGW-${var.environment}"
  })
}

# Public Subnet 생성 (최소 2개의 가용 영역에 걸쳐 생성 권장)
resource "aws_subnet" "public_subnet_a" {
  vpc_id                  = aws_vpc.grader_vpc.id
  cidr_block              = "10.0.1.0/24" # 예시 CIDR
  availability_zone       = "${var.aws_region}a" # 첫 번째 가용 영역
  map_public_ip_on_launch = true # Public IP 자동 할당

  tags = merge(var.tags, {
    Name = "${var.project_name}-PublicSubnetA-${var.environment}"
  })
}

resource "aws_subnet" "public_subnet_c" {
  vpc_id                  = aws_vpc.grader_vpc.id
  cidr_block              = "10.0.2.0/24" # 예시 CIDR
  availability_zone       = "${var.aws_region}c" # 다른 가용 영역
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-PublicSubnetC-${var.environment}"
  })
}

# Public Route Table 생성 및 설정
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.grader_vpc.id

  route {
    cidr_block = "0.0.0.0/0" # 모든 외부 트래픽
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-PublicRT-${var.environment}"
  })
}

# Route Table을 Public Subnet에 연결
resource "aws_route_table_association" "public_assoc_a" {
  subnet_id      = aws_subnet.public_subnet_a.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_assoc_c" {
  subnet_id      = aws_subnet.public_subnet_c.id
  route_table_id = aws_route_table.public_rt.id
}

# Fargate Task용 보안 그룹
resource "aws_security_group" "fargate_sg" {
  name        = "${var.project_name}-FargateSG-${var.environment}"
  description = "Security group for Fargate tasks"
  vpc_id      = aws_vpc.grader_vpc.id

  # 기본적으로 모든 아웃바운드 트래픽 허용 (ECR, S3 등 접근 위해)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # 모든 프로토콜
    cidr_blocks = ["0.0.0.0/0"]
  }

  # 인바운드 규칙은 필요시 추가 (예: 특정 서비스로부터의 호출)

  tags = merge(var.tags, {
    Name = "${var.project_name}-FargateSG-${var.environment}"
  })
}

# Lambda 함수용 보안 그룹
resource "aws_security_group" "lambda_sg" {
  name        = "${var.project_name}-LambdaSG-${var.environment}"
  description = "Security group for Lambda function (if running in VPC)"
  vpc_id      = aws_vpc.grader_vpc.id

  # 필요한 아웃바운드 규칙 추가 (예: ECS, DynamoDB, S3 접근)
  # VPC Endpoint를 사용하는 경우 해당 Endpoint에 대한 규칙 필요
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # 예시: 모든 아웃바운드 허용 (필요시 제한)
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-LambdaSG-${var.environment}"
  })
} 