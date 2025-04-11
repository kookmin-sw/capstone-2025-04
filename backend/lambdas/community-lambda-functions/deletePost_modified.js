const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.handler = async (event) => {
  // Handle OPTIONS preflight requests for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight check successful" }),
    };
  }

  try {
    const { postId } = event.pathParameters; // Get postId from request URL

    // Get user info from API Gateway JWT Authorizer (using optional chaining)
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims || !claims.username) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "인증 정보가 없습니다." }), // Stringify
      };
    }

    const username = claims.username;

    // Check if the post exists
    const getParams = {
      TableName: "alpaco-Community-production",
      Key: {
        PK: postId,
        SK: "POST",
      },
    };

    const result = await dynamoDB.get(getParams).promise();
    const post = result.Item;

    if (!post) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "게시글을 찾을 수 없습니다." }), // Stringify
      };
    }

    // Check if the user is the author
    if (post.author !== username) {
      return {
        statusCode: 403, // Forbidden
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({ message: "게시글을 삭제할 권한이 없습니다." }), // Stringify
      };
    }

    // Query comments (supports up to 24 comments in one transaction; pagination needed for more)
    const commentQuery = await dynamoDB
      .query({
        TableName: "alpaco-Community-production",
        KeyConditionExpression: "PK = :postId AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":postId": postId,
          ":prefix": "COMMENT#",
        },
        // Limit might be needed if pagination is implemented
      })
      .promise();

    const commentDeleteOps = commentQuery.Items.map((comment) => ({
      Delete: {
        TableName: "alpaco-Community-production",
        Key: {
          PK: comment.PK,
          SK: comment.SK,
        },
      },
    }));

    // Include the post delete operation
    const deletePostOp = {
      Delete: {
        TableName: "alpaco-Community-production",
        Key: {
          PK: postId,
          SK: "POST",
        },
      },
    };

    // Combine operations for transaction (max 25 items)
    const transactItems = [deletePostOp, ...commentDeleteOps];

    // Check transaction item limit
    if (transactItems.length > 25) {
      // Note: This simple check might not be sufficient for large numbers of comments.
      // A more robust solution would involve batching delete operations.
      console.warn(
        `Attempted to delete ${transactItems.length} items (max 25) for post ${postId}. Aborting.`
      );
      return {
        statusCode: 400, // Bad Request or potentially 500 Internal Server Error
        headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
        body: JSON.stringify({
          message:
            "댓글 수가 너무 많아 한 번에 삭제할 수 없습니다. 관리자에게 문의하세요.",
        }), // User-friendly message
      };
    }

    // Execute the transaction if within limits
    if (transactItems.length > 0) {
      await dynamoDB
        .transactWrite({
          TransactItems: transactItems,
        })
        .promise();
    } else {
      // Handle case where only the post exists and no comments (should be rare)
      await dynamoDB.delete(deletePostOp.Delete).promise();
    }

    // --- SUCCESS RESPONSE ---
    const responseBody = {
      message: "게시글과 관련 댓글이 성공적으로 삭제되었습니다.",
      deletedCommentsCount: commentDeleteOps.length, // Use a more descriptive key
    };
    return {
      statusCode: 200, // Or 204 No Content if preferred for DELETE
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
      body: JSON.stringify(responseBody), // Stringify
    };
  } catch (error) {
    console.error("게시글 삭제 중 오류 발생:", error);
    // --- ERROR RESPONSE ---
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add headers
      body: JSON.stringify({
        message: "서버 오류가 발생했습니다.",
        error: error.message,
      }), // Stringify
    };
  }
};
