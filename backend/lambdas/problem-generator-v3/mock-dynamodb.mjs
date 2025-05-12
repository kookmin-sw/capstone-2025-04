/**
 * mock-dynamodb.mjs
 * 
 * DynamoDB 모킹을 위한 간단한 구현입니다.
 * 테스트 목적으로만 사용됩니다.
 */

console.log('🔄 Loading mock-dynamodb.mjs module');

// 메모리에 저장될 가상의 DB
const memoryDb = new Map();

/**
 * 모의 DynamoDB 클라이언트 생성
 */
export function createMockDynamoDBClient() {
  console.log('⚙️ Creating mock DynamoDB client');
  // Return a minimal mock object that won't cause errors when used
  return {
    config: { region: 'mock-region' },
    middlewareStack: { add: () => {} },
    send: async () => {
      return { $metadata: { httpStatusCode: 200 } };
    }
  };
}

/**
 * 모의 DynamoDB Document 클라이언트 생성
 */
export function createMockDynamoDBDocumentClient() {
  console.log('⚙️ Creating mock DynamoDB Document client');
  
  return {
    send: async (command) => {
      console.log(`📥 Mock DynamoDB executing command: ${command.constructor.name}`);
      
      try {
        // PutCommand 처리 (항목 저장)
        if (command.constructor.name === 'PutCommand') {
          const { TableName, Item, ConditionExpression } = command.input;
          
          console.log(`📝 Mock PutCommand for ${TableName}:`, Item.problemId);
          
          if (ConditionExpression === "attribute_not_exists(problemId)") {
            // 이미 존재하는지 확인
            const key = `${TableName}:${Item.problemId}`;
            if (memoryDb.has(key)) {
              const error = {
                name: 'ConditionalCheckFailedException',
                message: 'The conditional request failed'
              };
              console.log(`⚠️ Mock PutCommand conditional check failed for ${key}`);
              throw error;
            }
          }
          
          // 메모리 DB에 저장
          const key = `${TableName}:${Item.problemId}`;
          memoryDb.set(key, Item);
          console.log(`✅ Mock DB saved item with key: ${key}`);
          return { $metadata: { httpStatusCode: 200 } };
        }
        
        // UpdateCommand 처리 (항목 업데이트)
        else if (command.constructor.name === 'UpdateCommand') {
          const { TableName, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = command.input;
          
          // 키 생성
          const key = `${TableName}:${Key.problemId}`;
          console.log(`📝 Mock UpdateCommand for ${key}`);
          
          // 아이템 가져오기
          const existingItem = memoryDb.get(key);
          if (!existingItem) {
            // In mock mode, just create a new item if it doesn't exist
            console.log(`⚠️ Item not found with key: ${key}, creating new`);
            memoryDb.set(key, Key);
            return { Attributes: {}, $metadata: { httpStatusCode: 200 } };
          }
          
          // 간단한 SET 표현식만 지원 (예: SET #a = :aVal, #b = :bVal)
          if (UpdateExpression.startsWith('SET ')) {
            const setParts = UpdateExpression.slice(4).split(', ');
            
            // 각 SET 부분 처리
            for (const part of setParts) {
              const [namePart, valuePart] = part.split(' = ');
              const attributeName = ExpressionAttributeNames[namePart];
              const attributeValue = ExpressionAttributeValues[valuePart];
              
              // 아이템 업데이트
              existingItem[attributeName] = attributeValue;
            }
            
            // 업데이트된 아이템 저장
            memoryDb.set(key, existingItem);
            console.log(`✅ Mock DB updated item with key: ${key}`);
          }
          
          return { Attributes: {}, $metadata: { httpStatusCode: 200 } };
        }
        
        // GetCommand 처리 (항목 조회)
        else if (command.constructor.name === 'GetCommand') {
          const { TableName, Key } = command.input;
          
          // 키 생성
          const key = `${TableName}:${Key.problemId}`;
          console.log(`📝 Mock GetCommand for ${key}`);
          
          // 아이템 가져오기
          const item = memoryDb.get(key);
          const found = item ? 'Found' : 'Not found';
          console.log(`🔍 Mock DB get result for ${key}: ${found}`);
          
          return { Item: item, $metadata: { httpStatusCode: 200 } };
        }
        
        // 지원하지 않는 명령
        else {
          console.warn(`⚠️ Unsupported mock DynamoDB command: ${command.constructor.name}`);
          return { $metadata: { httpStatusCode: 200 } };
        }
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          // This is expected in some cases, so just pass it through
          throw error;
        }
        console.error('❌ Error in mock DynamoDB:', error);
        // Return a mocked error to avoid breaking the pipeline
        return { 
          $metadata: { httpStatusCode: 500 },
          error: error.message
        };
      }
    }
  };
} 