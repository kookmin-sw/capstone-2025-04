# AWS 배포 가이드 (SAM)

이 문서는 `@problem-generator-streaming` 및 `@problem-grader` 시스템을 AWS SAM을 사용하여 배포하는 간결 가이드입니다.

## 1. 사전 준비

- AWS 계정
- AWS CLI (`aws configure` 완료)
- AWS SAM CLI
- Docker (실행 중이어야 함)

## 2. 기본 인프라 준비 (직접 구성)

SAM 템플릿 배포 전에 다음 AWS 리소스가 **미리 준비되어 있어야 합니다**:

- **VPC:** Fargate 작업이 실행될 VPC
- **서브넷(Subnets):** Fargate 작업이 사용할 서브넷 ID 목록 (최소 1개 이상)
  - 외부 인터넷 접근이 필요하면 NAT Gateway 또는 VPC 엔드포인트 구성 필요
- **보안 그룹(Security Groups):** Fargate 작업에 적용할 보안 그룹 ID 목록 (최소 1개 이상)
  - 아웃바운드: ECR, S3, DynamoDB, Step Functions, CloudWatch Logs 등 AWS 서비스 및 Docker Hub 접근 허용 필요
  - 인바운드: 일반적으로 불필요
- **ECS 클러스터:** Fargate 작업을 위한 ECS 클러스터 (이름 필요)

**주의:** 위 리소스들의 ID(서브넷, 보안 그룹)와 이름(ECS 클러스터)을 기록해두세요. `sam deploy` 시 파라미터로 사용됩니다.

## 3. Code Runner Docker 이미지 빌드 및 푸시

Fargate Task(`code-runner`)가 사용할 이미지를 ECR에 업로드합니다.

1.  **ECR 리포지토리 생성:**

    ```bash
    # 예시: 리전과 리포지토리 이름 변경 필요
    aws ecr create-repository --repository-name problem-grader/code-runner --region YOUR_REGION
    ```

2.  **ECR 로그인:**

    ```bash
    # YOUR_REGION, YOUR_AWS_ACCOUNT_ID 를 실제 값으로 변경
    aws ecr get-login-password --region YOUR_REGION | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
    ```

3.  **이미지 빌드 및 태그:**

    ```bash
    # backend/lambdas/problem-grader 디렉토리에서 실행
    cd backend/lambdas/problem-grader
    docker build -t code-runner-image ./fargate

    # YOUR_AWS_ACCOUNT_ID, YOUR_REGION, 리포지토리 이름 확인 후 변경
    docker tag code-runner-image:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/problem-grader/code-runner:latest
    ```

4.  **이미지 푸시:**

    ```bash
    # YOUR_AWS_ACCOUNT_ID, YOUR_REGION, 리포지토리 이름 확인 후 변경
    docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/problem-grader/code-runner:latest
    ```

**주의:** 푸시된 이미지의 전체 URI (`YOUR_AWS_ACCOUNT_ID.dkr.ecr...:latest`)를 기록해두세요. `sam deploy` 시 파라미터로 사용됩니다.

## 4. SAM 애플리케이션 빌드 및 배포

`template.yaml`에 정의된 리소스를 배포합니다. **레이어 의존성 문제를 피하고 안정적인 배포를 위해 다음 단계를 따르는 것을 권장합니다.**

1.  **(선택사항) 이전 빌드 캐시 정리:**
    이전에 `--use-container` 옵션으로 빌드한 경우, `.aws-sam` 디렉토리에 권한 문제가 발생하여 삭제되지 않을 수 있습니다. 이 경우, 프로젝트 루트에서 다음 명령을 실행하여 캐시를 정리합니다. (비밀번호 입력 필요)

    ```bash
    sudo rm -rf .aws-sam
    ```

    일반적인 경우:

    ```bash
    rm -rf .aws-sam
    ```

2.  **빌드:**
    프로젝트 루트 디렉토리 (`capstone-2025-04/`)에서 다음 명령을 실행하여 Lambda 함수와 레이어를 빌드합니다. `--use-container` 옵션은 로컬 환경과 Lambda 실행 환경 간의 차이를 줄여줍니다.

    ```bash
    # 프로젝트 루트 디렉토리에서 실행
    sam build -t backend/lambdas/problem-grader/template.yaml --use-container
    ```

    **주의:** 빌드 후 `.aws-sam/build/` 디렉토리 내용을 확인하여 의도한 대로 함수와 레이어가 올바르게 패키징되었는지 확인하는 것이 좋습니다. 특히, 레이어를 사용하는 함수의 디렉토리(`.aws-sam/build/FunctionName/`) 안에 불필요한 의존성 라이브러리가 중복으로 포함되지 않았는지 확인하세요.

3.  **패키지:**
    빌드된 아티팩트(코드, 레이어)를 S3 버킷에 업로드하고, S3 경로를 참조하는 새로운 템플릿 파일 (`packaged.yaml`)을 생성합니다.

    ```bash
    # 프로젝트 루트 디렉토리에서 실행
    # YOUR_S3_BUCKET_NAME을 배포 아티팩트를 저장할 S3 버킷 이름으로 변경하세요.
    # GraderS3BucketName과 동일한 버킷을 사용해도 됩니다.
    sam package \\
      --template-file .aws-sam/build/template.yaml \\
      --s3-bucket YOUR_S3_BUCKET_NAME \\
      --output-template-file packaged.yaml \\
      --force-upload # S3 캐싱 문제를 방지하기 위해 추가
    ```

    **주의:** `YOUR_S3_BUCKET_NAME`은 SAM 배포 아티팩트를 저장하기 위한 S3 버킷입니다. `GraderS3BucketName`과 동일한 버킷을 사용해도 무방합니다.

4.  **배포:**
    `sam package` 명령으로 생성된 `packaged.yaml` 파일을 사용하여 CloudFormation 스택을 배포합니다.

    ```bash
    # 프로젝트 루트 디렉토리에서 실행
    # <YOUR_...> 값들을 실제 환경에 맞게 수정해야 합니다.
    sam deploy \\
      --template-file packaged.yaml \\
      --stack-name <YOUR_STACK_NAME> \\
      --region <YOUR_REGION> \\
      --capabilities CAPABILITY_IAM \\
      --parameter-overrides \\
        ProblemsTableName=<YOUR_PROBLEMS_TABLE> \\
        SubmissionsTableName=<YOUR_SUBMISSIONS_TABLE> \\
        GraderS3BucketName=<YOUR_GRADER_RESULTS_BUCKET> \\
        CodeRunnerImageUri=<YOUR_ECR_IMAGE_URI> \\
        EcsClusterName=<YOUR_ECS_CLUSTER_NAME> \\
        VpcSubnetIds="<SUBNET_ID_1,SUBNET_ID_2>" \\
        VpcSecurityGroupIds="<SG_ID_1,SG_ID_2>" \\
      --confirm-changeset
    ```

    **파라미터 설명:**

    - `YOUR_STACK_NAME`: CloudFormation 스택 이름 (예: `problem-solver-stack`)
    - `YOUR_REGION`: 배포할 AWS 리전 (예: `ap-northeast-2`)
    - `CAPABILITY_IAM`: IAM 역할 생성을 허용합니다.
    - `ProblemsTableName`: Problems DynamoDB 테이블 이름.
    - `SubmissionsTableName`: Submissions DynamoDB 테이블 이름.
    - `GraderS3BucketName`: Fargate 채점 결과가 저장될 S3 버킷 이름 (전역 고유).
    - `CodeRunnerImageUri`: 3단계에서 ECR에 푸시한 Docker 이미지의 전체 URI.
    - `EcsClusterName`: 2단계에서 준비한 ECS 클러스터 이름.
    - `VpcSubnetIds`: Fargate 작업이 사용할 서브넷 ID 목록 (쉼표로 구분, 따옴표로 감싸기).
    - `VpcSecurityGroupIds`: Fargate 작업에 적용할 보안 그룹 ID 목록 (쉼표로 구분, 따옴표로 감싸기).
    - `--confirm-changeset`: 배포 전에 변경 사항을 확인합니다.

**주의:** `template.yaml` 내 `ProblemGeneratorStreamingFunction`의 환경 변수 (`GOOGLE_AI_API_KEY` 등)는 SAM 배포 파라미터 또는 배포 후 Lambda 콘솔에서 별도로 설정해야 할 수 있습니다. Secrets Manager 사용을 권장합니다.

## 5. 배포 확인

`sam deploy` 완료 후 출력되는 `Outputs` 섹션의 값을 확인하고 사용합니다.

- `ProblemGeneratorStreamingApiEndpoint`: 문제 생성 API 엔드포인트 URL
- `ProblemGraderApiEndpoint`: 문제 채점 API 엔드포인트 URL
- `GraderStateMachineArn`: Step Functions 상태 머신 ARN
- `ProblemsTableNameOutput`: Problems 테이블 이름
- `SubmissionsTableNameOutput`: Submissions 테이블 이름
- `GraderS3BucketNameOutput`: 채점 결과 S3 버킷 이름

API 테스트, Step Functions 실행 확인, CloudWatch Logs 확인 등 필요한 테스트를 진행합니다.
