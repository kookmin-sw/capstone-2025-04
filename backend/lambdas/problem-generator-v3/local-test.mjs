/**
 * local-test.mjs
 * 
 * 로컬 환경에서 problem-generator-v3 파이프라인을 테스트하기 위한 스크립트입니다.
 * AWS Lambda의 streamifyResponse를 시뮬레이션하여 테스트합니다.
 */

// 명령줄 인자에 따라 실행 모드 결정
const args = process.argv.slice(2);

// DynamoDB 모킹 설정
const argIncludesMock = args.includes('mock');
const argIncludesReal = args.includes('real');

// 환경 변수 설정 (다른 모듈에서도 참조할 수 있도록)
// 이 부분은 .env 및 DEFAULT_ENV 로딩 후 최종 결정됩니다.
if (argIncludesMock) {
  process.env.MOCK_DYNAMODB = 'true';
  console.log('🗣️ Command line argument "mock" received, setting MOCK_DYNAMODB=true.');
} else if (argIncludesReal) {
  process.env.MOCK_DYNAMODB = 'false';
  console.log('🗣️ Command line argument "real" received, setting MOCK_DYNAMODB=false.');
}

import { pipeline } from './src/services/pipeline.mjs';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import readline from 'readline';
import { initDynamoDBClient } from './src/services/dynamoClient.mjs'; // 이제 async 함수

// 기본 환경 변수 설정
const DEFAULT_ENV = {
  PROBLEMS_TABLE_NAME: 'alpaco-Problems-v3-production',
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
  dotenv.config(); // .env 파일이 MOCK_DYNAMODB를 덮어쓸 수 있음
}

// 기본 환경 변수 설정 (process.env에 아직 설정되지 않은 경우에만)
Object.entries(DEFAULT_ENV).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
    console.log(`🔧 Setting default ${key}=${value} (as it was not previously set by arg or .env)`);
  }
});

// 최종 MOCK_DYNAMODB 설정 로깅
console.log(`⚙️ Final MOCK_DYNAMODB setting before execution: ${process.env.MOCK_DYNAMODB}`);


// 필수 환경 변수 확인
if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('❌ GOOGLE_AI_API_KEY environment variable is missing!');
  console.error('Please set it in your .env file or environment variables');
  process.exit(1);
} else {
  console.log('✅ GOOGLE_AI_API_KEY is set (length:', process.env.GOOGLE_AI_API_KEY.length, ')');
  if (process.env.GOOGLE_AI_API_KEY.length > 5) {
    console.log('   First few chars:', process.env.GOOGLE_AI_API_KEY.substring(0, 5) + '...');
  }
}

// AWS Lambda responseStream을 시뮬레이션하는 클래스 (변경 없음)
class MockResponseStream extends Readable {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    this.chunks = [];
    this._isClosed = false;
  }

  write(chunk) {
    if (this._isClosed) return;
    this.chunks.push(chunk);
    try {
      const dataStr = chunk.toString();
      if (dataStr.startsWith('data: ')) {
        const jsonStr = dataStr.substring(6);
        const data = JSON.parse(jsonStr);
        if (data.type === 'status') {
          console.log(`🔄 Step ${data.payload.step}: ${data.payload.message}`);
        } else if (data.type === 'error') {
          console.error(`❌ Error: ${data.payload.payload}`); // Error payload is nested
        } else if (data.type === 'result') {
          console.log('✅ Result received!');
          fs.writeFileSync(
            `problem-gen-result-${Date.now()}.json`, 
            JSON.stringify(data.payload.payload, null, 2), // Result payload is nested
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

  end() {
    if (this._isClosed) return;
    this._isClosed = true;
    this.push(null);
    console.log('🏁 Stream ended');
  }

  _read() {}
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
  
  // DynamoDB 클라이언트는 process.env.MOCK_DYNAMODB를 기반으로 초기화됩니다.
  // initDynamoDBClient는 async 함수이므로 await를 사용해야 합니다.
  const useMock = process.env.MOCK_DYNAMODB === 'true';
  console.log(`🔄 Explicitly initializing DynamoDB client in ${useMock ? 'MOCK' : 'REAL'} mode for runTest`);
  await initDynamoDBClient(useMock); // await 추가
  
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
    console.log(`- Using ${process.env.MOCK_DYNAMODB === 'true' ? 'MOCK' : 'REAL'} DynamoDB (based on current env)`);
    console.log(`- Google AI Model: ${process.env.GEMINI_MODEL_NAME}`);
    console.log('------------------------------------------------------------');
    
    const prompt = await question('문제 생성 프롬프트를 입력하세요: ');
    const difficulty = await question('난이도를 입력하세요 (Easy, Medium, Hard) [Medium]: ') || 'Medium';
    const creatorId = await question('작성자 ID를 입력하세요 (선택사항): ');
    const author = await question('작성자 이름을 입력하세요 (선택사항): ');
    
    const eventData = {
      body: { prompt, difficulty, creatorId, author }
    };
    
    const useMockInput = await question(`DynamoDB 모킹을 사용하시겠습니까? (y/n) [current: ${process.env.MOCK_DYNAMODB === 'true' ? 'y' : 'n'}]: `) || (process.env.MOCK_DYNAMODB === 'true' ? 'y' : 'n');
    if (useMockInput.toLowerCase() === 'n') {
      process.env.MOCK_DYNAMODB = 'false';
      console.log('⚠️ DynamoDB 모킹을 비활성화합니다. 실제 AWS 자격 증명이 필요합니다.');
      await initDynamoDBClient(false); // await 추가
    } else {
      process.env.MOCK_DYNAMODB = 'true';
      console.log('✅ DynamoDB 모킹을 활성화합니다.');
      await initDynamoDBClient(true); // await 추가
    }
    
    console.log('\n📝 테스트를 시작합니다...');
    await runTest(eventData); // runTest 내부에서 initDynamoDBClient가 다시 호출될 수 있지만, mockMode가 이미 설정되어 문제는 없습니다.
    
  } catch (error) {
    console.error('💥 Error occurred:', error);
  } finally {
    rl.close();
  }
}

// 테스트를 위한 샘플 이벤트
const sampleEvent = {
  body: {
    prompt: "문자열 처리 문제를 생성해 주세요.",
    difficulty: "Medium",
    creatorId: "test-user",
    author: "Local Tester"
  }
};

// 메인 실행 로직
(async () => {
  // process.env.MOCK_DYNAMODB는 이미 위에서 args, .env, defaults 순으로 설정되었습니다.
  // initDynamoDBClient는 runTest 또는 promptAndRunTest 내부에서 호출됩니다.

  if (args.includes('auto') || argIncludesMock || argIncludesReal) {
    // 'auto', 'mock', 'real' 중 하나라도 있으면 non-interactive 모드로 간주
    // MOCK_DYNAMODB 환경 변수는 이미 설정되어 있음
    // runTest 내부에서 initDynamoDBClient가 호출됨
    console.log(`🤖 Non-interactive mode. DynamoDB Mock: ${process.env.MOCK_DYNAMODB}.`);
    // 명시적으로 한번 여기서 init 하고 runTest 안에서 다시 init 해도 괜찮음.
    // 또는 runTest 안에서만 init 하게끔 통일. 여기선 runTest에 맡기는 것으로.
    await runTest(sampleEvent);
  } else {
    // 그 외의 경우 (인자 없음 등) 대화형 모드 실행
    await promptAndRunTest();
  }
})();