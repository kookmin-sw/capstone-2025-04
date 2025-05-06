/**
 * local-test.mjs
 * 
 * 로컬 환경에서 problem-generator-v2 파이프라인을 테스트하기 위한 스크립트입니다.
 * AWS Lambda의 streamifyResponse를 시뮬레이션하여 테스트합니다.
 */

// 명령줄 인자에 따라 실행 모드 결정
const args = process.argv.slice(2);

// DynamoDB 모킹 설정
const useMockDynamoDB = args.includes('mock');
const useRealDynamoDB = args.includes('real');

// 환경 변수 설정 (다른 모듈에서도 참조할 수 있도록)
if (useMockDynamoDB) {
  process.env.MOCK_DYNAMODB = 'true';
  console.log('🤖 DynamoDB 모킹 모드로 자동 실행합니다.');
} else if (useRealDynamoDB) {
  process.env.MOCK_DYNAMODB = 'false';
  console.log('🤖 실제 DynamoDB 연결 모드로 자동 실행합니다.');
}

import { pipeline } from './src/services/pipeline.mjs';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import readline from 'readline';
import { initDynamoDBClient } from './src/services/dynamoClient.mjs';

// 기본 환경 변수 설정
const DEFAULT_ENV = {
  PROBLEMS_TABLE_NAME: 'alpaco-Problems-production',
  GEMINI_MODEL_NAME: 'gemini-2.5-pro-exp-03-25',
  DEFAULT_LANGUAGE: 'python3.12',
  DEFAULT_TARGET_LANGUAGE: 'Korean',
  GENERATOR_VERBOSE: 'true',
  MAX_RETRIES: '2',
  MOCK_DYNAMODB: 'true'  // 로컬 테스트는 기본적으로 모킹 모드
};

// .env 파일이 있으면 환경 변수 로드
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  console.log('🔄 Loading environment variables from .env file');
  dotenv.config();
} else {
  console.warn('⚠️ .env file not found, using default configuration');
  // 기본 환경 변수 설정
  Object.entries(DEFAULT_ENV).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
      console.log(`🔧 Setting default ${key}=${value}`);
    }
  });
}

// 필수 환경 변수 확인
if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('❌ GOOGLE_AI_API_KEY environment variable is missing!');
  console.error('Please set it in your .env file or environment variables');
  process.exit(1);
} else {
  // 기본 환경 변수가 올바르게 설정되었는지 디버그 출력
  console.log('✅ GOOGLE_AI_API_KEY is set (length:', process.env.GOOGLE_AI_API_KEY.length, ')');
  // API 키의 처음 몇 자만 표시하여 확인
  if (process.env.GOOGLE_AI_API_KEY.length > 5) {
    console.log('   First few chars:', process.env.GOOGLE_AI_API_KEY.substring(0, 5) + '...');
  }
}

// AWS Lambda responseStream을 시뮬레이션하는 클래스
class MockResponseStream extends Readable {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    this.chunks = [];
    this._isClosed = false;
  }

  // Lambda responseStream의 write 메소드 시뮬레이션
  write(chunk) {
    if (this._isClosed) return;
    
    // 청크를 저장하고 콘솔에 출력
    this.chunks.push(chunk);
    
    // SSE 포맷으로 출력되는 경우, 파싱하여 보기 좋게 출력
    try {
      const dataStr = chunk.toString();
      if (dataStr.startsWith('data: ')) {
        const jsonStr = dataStr.substring(6); // 'data: ' 제거
        const data = JSON.parse(jsonStr);
        
        if (data.type === 'status') {
          console.log(`🔄 Step ${data.payload.step}: ${data.payload.message}`);
        } else if (data.type === 'error') {
          console.error(`❌ Error: ${data.payload}`);
        } else if (data.type === 'result') {
          console.log('✅ Result received!');
          // 결과를 파일로 저장
          fs.writeFileSync(
            `problem-gen-result-${Date.now()}.json`, 
            JSON.stringify(data.payload, null, 2),
            'utf8'
          );
          console.log(`💾 Result saved to file.`);
        }
      } else {
        console.log(`Raw output: ${dataStr}`);
      }
    } catch (e) {
      console.log(`Raw chunk: ${chunk}`);
    }
    
    return true;
  }

  // Lambda responseStream의 end 메소드 시뮬레이션
  end() {
    if (this._isClosed) return;
    this._isClosed = true;
    this.push(null);
    console.log('🏁 Stream ended');
  }

  // Node.js Readable의 필수 구현 메소드
  _read() {
    // 필요한 경우 여기서 데이터를 push
  }
}

/**
 * 테스트 함수 실행
 * 
 * @param {Object} eventData - Lambda 이벤트 객체 (HTTP 요청 데이터)
 */
async function runTest(eventData) {
  console.log('📋 Starting local test with event:', JSON.stringify(eventData, null, 2));
  console.log('🔧 Environment configuration:');
  console.log(`  - PROBLEMS_TABLE_NAME: ${process.env.PROBLEMS_TABLE_NAME}`);
  console.log(`  - GEMINI_MODEL_NAME: ${process.env.GEMINI_MODEL_NAME}`);
  console.log(`  - DEFAULT_LANGUAGE: ${process.env.DEFAULT_LANGUAGE}`);
  console.log(`  - DEFAULT_TARGET_LANGUAGE: ${process.env.DEFAULT_TARGET_LANGUAGE}`);
  console.log(`  - GENERATOR_VERBOSE: ${process.env.GENERATOR_VERBOSE}`);
  console.log(`  - MAX_RETRIES: ${process.env.MAX_RETRIES}`);
  console.log(`  - MOCK_DYNAMODB: ${process.env.MOCK_DYNAMODB}`);
  console.log(`  - GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? '[SET]' : '[MISSING]'}`);
  
  // 명시적으로 DynamoDB 클라이언트 초기화
  const useMock = process.env.MOCK_DYNAMODB === 'true';
  console.log(`🔄 Explicitly initializing DynamoDB client in ${useMock ? 'MOCK' : 'REAL'} mode`);
  initDynamoDBClient(useMock);
  
  const mockResponseStream = new MockResponseStream();
  const mockContext = { awsRequestId: 'local-test-' + Date.now() };
  
  try {
    console.log('🚀 Executing pipeline...');
    await pipeline(eventData, mockResponseStream, mockContext);
  } catch (error) {
    console.error('💥 Error occurred during pipeline execution:', 
      error instanceof Error ? error.stack || error.message : JSON.stringify(error, null, 2));
  }
}

/**
 * 명령줄에서 사용자 입력을 받아 문제 생성 테스트 실행
 */
async function promptAndRunTest() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log('🌟 Problem Generator V3 Local Testing Tool 🌟');
    console.log('------------------------------------------------------------');
    console.log('Environment setup:');
    console.log(`- Using ${process.env.MOCK_DYNAMODB === 'true' ? 'MOCK' : 'REAL'} DynamoDB`);
    console.log(`- Google AI Model: ${process.env.GEMINI_MODEL_NAME}`);
    console.log('------------------------------------------------------------');
    
    // 프롬프트, 난이도 등 입력 받기
    const prompt = await question('문제 생성 프롬프트를 입력하세요: ');
    const difficulty = await question('난이도를 입력하세요 (Easy, Medium, Hard) [Medium]: ') || 'Medium';
    const creatorId = await question('작성자 ID를 입력하세요 (선택사항): ');
    const author = await question('작성자 이름을 입력하세요 (선택사항): ');
    
    // 생성된 이벤트 객체
    const eventData = {
      body: {
        prompt,
        difficulty, 
        creatorId,
        author
      }
    };
    
    // 모킹 모드 확인
    const useMock = await question('DynamoDB 모킹을 사용하시겠습니까? (y/n) [y]: ');
    if (useMock.toLowerCase() === 'n') {
      process.env.MOCK_DYNAMODB = 'false';
      console.log('⚠️ DynamoDB 모킹을 비활성화합니다. 실제 AWS 자격 증명이 필요합니다.');
      initDynamoDBClient(false);
    } else {
      process.env.MOCK_DYNAMODB = 'true';
      console.log('✅ DynamoDB 모킹을 활성화합니다.');
      initDynamoDBClient(true);
    }
    
    console.log('\n📝 테스트를 시작합니다...');
    await runTest(eventData);
    
  } catch (error) {
    console.error('💥 Error occurred:', error);
  } finally {
    rl.close();
  }
}

// 테스트를 위한 샘플 이벤트 - 직접 수정 가능
const sampleEvent = {
  body: {
    // prompt: "정수 배열에서 가장 긴 연속된 증가 부분 수열의 길이를 찾는 문제",
    // prompt: "그래프 문제 아무거나",
    // prompt: "다이나믹 프로그래밍 기본 문제를 생성해 주세요.",
    // prompt: "DFS와 BFS를 활용한 그래프 문제를 생성해 주세요.",
    // prompt: "효율적인 정렬 알고리즘을 활용하는 문제를 생성해 주세요.",
    prompt: "이진 탐색 알고리즘을 활용하는 문제를 생성해 주세요.",
    // prompt: "그리디 알고리즘 접근법을 사용하는 문제를 생성해 주세요.",
    // prompt: "문자열 처리 문제를 생성해 주세요.",
    // prompt: "트리 구조를 활용하는 문제를 생성해 주세요.",
    // prompt: "그래프 탐색 문제를 생성해 주세요.",
    difficulty: "Medium",
    creatorId: "test-user",
    author: "Local Tester"
  }
};

// 명령줄 인자에 따라 실행 모드 결정
if (args.includes('auto')) {
  console.log('🤖 자동 테스트 모드로 실행합니다.');
  initDynamoDBClient(useMockDynamoDB);
  runTest(sampleEvent);
} else if (useMockDynamoDB) {
  initDynamoDBClient(true);
  runTest(sampleEvent);
} else if (useRealDynamoDB) {
  initDynamoDBClient(false);
  runTest(sampleEvent);
} else {
  promptAndRunTest();
} 