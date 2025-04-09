const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3001; // Keep community mock on 3001

app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Middleware to parse JSON bodies

// --- In-Memory Data Store ---
// Simulating DynamoDB structure (PK, SK)
let communityData = []; // Array to hold all items (posts and comments)

// Helper to find post item
const findPost = (postId) =>
  communityData.find((item) => item.PK === postId && item.SK === "POST");
// Helper to find comment item
const findComment = (postId, commentId) =>
  communityData.find(
    (item) => item.PK === postId && item.SK === `COMMENT#${commentId}`
  );
// Helper to find comments for a post
const findCommentsForPost = (postId) =>
  communityData.filter(
    (item) => item.PK === postId && item.SK.startsWith("COMMENT#")
  );

const { jwtDecode } = require("./node_modules/jwt-decode/build/cjs"); // Import jwt-decode

// --- Mock Authentication Middleware ---
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let username = "mockUser"; // Default user

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwtDecode(token);
      // Cognito typically puts username in 'username' or 'cognito:username' claim
      username = decoded.username || decoded["cognito:username"] || username;
      console.log(
        `[Community Mock Auth] Token decoded. User set to '${username}'.`
      );
    } catch (error) {
      console.warn(
        `[Community Mock Auth] WARN: Could not decode token: ${error.message}. Falling back to '${username}'.`
      );
    }
  } else {
    console.warn(
      `[Community Mock Auth] WARN: No valid mock auth header found. Using default user '${username}'.`
    );
    // In a real scenario, this should return 401
    // return res.status(401).json({ message: "인증 정보가 없습니다." });
  }

  req.user = { username: username }; // Attach user info to request
  next();
};

// --- API Endpoint Implementations ---

// 1. [POST] /community - Create Post
app.post("/community", mockAuth, (req, res) => {
  const { title, content, job_id } = req.body;
  const author = req.user.username; // Get from mockAuth

  if (!title || !content) {
    return res
      .status(400)
      .json({ message: "title과 content는 필수 항목입니다." });
  }

  const postId = uuidv4();
  const createdAt = new Date().toISOString();
  const newPost = {
    PK: postId,
    SK: "POST",
    postId: postId,
    author,
    title,
    content,
    createdAt,
    likesCount: 0,
    likedUsers: [],
    commentCount: 0,
    ...(job_id && { job_id }),
  };

  communityData.push(newPost);
  console.log(`[Community Mock API] Post created: ${postId}`);

  // Return data similar to backend response
  res.status(201).json({
    message: "게시글이 성공적으로 작성되었습니다.",
    postId,
    author,
    title,
    content,
    createdAt,
    ...(job_id && { job_id }),
  });
});

// 2. [GET] /community - Get Post List
app.get("/community", (req, res) => {
  const posts = communityData
    .filter((item) => item.SK === "POST")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by newest first
    .map((post) => ({
      // Map to PostSummary format
      postId: post.postId,
      title: post.title,
      author: post.author,
      createdAt: post.createdAt,
      likesCount: post.likesCount || 0,
      commentCount: post.commentCount || 0,
      job_id: post.job_id || null,
    }));
  console.log(`[Community Mock API] Fetched ${posts.length} posts.`);
  res.status(200).json(posts);
});

// 3. [GET] /community/{postId} - Get Post Detail
app.get("/community/:postId", (req, res) => {
  const { postId } = req.params;
  const post = findPost(postId);

  if (!post) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }

  console.log(`[Community Mock API] Fetched post detail: ${postId}`);
  // Map to PostDetail format
  res.status(200).json({
    postId: post.postId,
    title: post.title,
    content: post.content,
    author: post.author,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt || null,
    likesCount: post.likesCount || 0,
    likedUsers: post.likedUsers || [],
    job_id: post.job_id || null,
  });
});

// 4. [PATCH] /community/{postId} - Update Post
app.patch("/community/:postId", mockAuth, (req, res) => {
  const { postId } = req.params;
  const { title, content } = req.body;
  const author = req.user.username;

  if (!title || !content) {
    return res
      .status(400)
      .json({ message: "title과 content는 필수 항목입니다." });
  }

  const postIndex = communityData.findIndex(
    (item) => item.PK === postId && item.SK === "POST"
  );
  if (postIndex === -1) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }

  const post = communityData[postIndex];
  if (post.author !== author) {
    return res
      .status(403)
      .json({ message: "게시글을 수정할 권한이 없습니다." });
  }

  post.title = title;
  post.content = content;
  post.updatedAt = new Date().toISOString();
  communityData[postIndex] = post; // Update in the array

  console.log(`[Community Mock API] Post updated: ${postId}`);
  res.status(200).json({
    message: "게시글이 성공적으로 수정되었습니다.",
    post: {
      // Return updated post details
      postId: post.postId,
      title: post.title,
      content: post.content,
      author: post.author,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likesCount: post.likesCount,
      likedUsers: post.likedUsers,
      commentCount: post.commentCount,
      job_id: post.job_id,
    },
  });
});

// 5. [DELETE] /community/{postId} - Delete Post
app.delete("/community/:postId", mockAuth, (req, res) => {
  const { postId } = req.params;
  const author = req.user.username;

  const postIndex = communityData.findIndex(
    (item) => item.PK === postId && item.SK === "POST"
  );
  if (postIndex === -1) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }

  if (communityData[postIndex].author !== author) {
    return res
      .status(403)
      .json({ message: "게시글을 삭제할 권한이 없습니다." });
  }

  // Find and remove comments associated with the post
  const commentsToDelete = findCommentsForPost(postId);
  const initialLength = communityData.length;
  communityData = communityData.filter((item) => !(item.PK === postId)); // Remove post and its comments
  const deletedCommentsCount = initialLength - communityData.length - 1; // -1 for the post itself

  console.log(
    `[Community Mock API] Post deleted: ${postId} (and ${deletedCommentsCount} comments)`
  );
  res.status(200).json({
    message: "게시글과 모든 댓글이 성공적으로 삭제되었습니다.",
    deletedComments: deletedCommentsCount,
  });
});

// 6. [POST] /community/{postId}/like - Toggle Like
app.post("/community/:postId/like", mockAuth, (req, res) => {
  const { postId } = req.params;
  const userId = req.user.username;

  const postIndex = communityData.findIndex(
    (item) => item.PK === postId && item.SK === "POST"
  );
  if (postIndex === -1) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }

  const post = communityData[postIndex];
  const likedUsersSet = new Set(post.likedUsers || []);
  let isLikedNow;
  let message;

  if (likedUsersSet.has(userId)) {
    likedUsersSet.delete(userId);
    message = "좋아요가 취소되었습니다.";
    isLikedNow = false;
  } else {
    likedUsersSet.add(userId);
    message = "좋아요가 추가되었습니다.";
    isLikedNow = true;
  }

  post.likedUsers = Array.from(likedUsersSet);
  post.likesCount = likedUsersSet.size;
  communityData[postIndex] = post; // Update in the array

  console.log(
    `[Community Mock API] Like toggled for post: ${postId} by ${userId}. Liked: ${isLikedNow}`
  );
  res.status(200).json({
    message,
    likedUsers: post.likedUsers,
    likesCount: post.likesCount,
    isLiked: isLikedNow,
  });
});

// 7. [POST] /community/{postId}/comment - Create Comment
app.post("/community/:postId/comment", mockAuth, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const author = req.user.username;

  if (!content) {
    return res.status(400).json({ message: "content는 필수 항목입니다." });
  }

  const postIndex = communityData.findIndex(
    (item) => item.PK === postId && item.SK === "POST"
  );
  if (postIndex === -1) {
    return res
      .status(404)
      .json({ message: "댓글을 작성할 게시글을 찾을 수 없습니다." });
  }

  const commentId = uuidv4();
  const createdAt = new Date().toISOString();
  const newComment = {
    PK: postId,
    SK: `COMMENT#${commentId}`,
    commentId,
    author,
    content,
    createdAt,
  };

  communityData.push(newComment);

  // Increment commentCount on the post
  communityData[postIndex].commentCount =
    (communityData[postIndex].commentCount || 0) + 1;

  console.log(
    `[Community Mock API] Comment created: ${commentId} on post ${postId}`
  );
  res.status(201).json({
    message: "댓글이 성공적으로 추가되었습니다.",
    postId,
    commentId,
    author,
    content,
    createdAt,
  });
});

// 8. [GET] /community/{postId}/comment - Get Comments
app.get("/community/:postId/comment", (req, res) => {
  const { postId } = req.params;
  const comments = findCommentsForPost(postId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort newest first
    .map((comment) => ({
      // Map to Comment format
      commentId: comment.commentId,
      content: comment.content,
      author: comment.author,
      createdAt: comment.createdAt,
    }));

  const post = findPost(postId);
  const commentCount = post ? post.commentCount || 0 : comments.length; // Use stored count if possible

  console.log(
    `[Community Mock API] Fetched ${comments.length} comments for post: ${postId}`
  );
  res.status(200).json({ comments, commentCount });
});

// 9. [DELETE] /community/{postId}/comment/{commentId} - Delete Comment
app.delete("/community/:postId/comment/:commentId", mockAuth, (req, res) => {
  const { postId, commentId } = req.params;
  const author = req.user.username;

  const commentIndex = communityData.findIndex(
    (item) => item.PK === postId && item.SK === `COMMENT#${commentId}`
  );
  if (commentIndex === -1) {
    return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
  }

  const comment = communityData[commentIndex];
  if (comment.author !== author) {
    return res.status(403).json({ message: "댓글을 삭제할 권한이 없습니다." });
  }

  communityData.splice(commentIndex, 1); // Remove comment from data

  // Decrement commentCount on the post
  const postIndex = communityData.findIndex(
    (item) => item.PK === postId && item.SK === "POST"
  );
  if (postIndex !== -1) {
    communityData[postIndex].commentCount = Math.max(
      0,
      (communityData[postIndex].commentCount || 0) - 1
    );
  }

  console.log(
    `[Community Mock API] Comment deleted: ${commentId} from post ${postId}`
  );
  res.status(200).json({ message: "댓글이 성공적으로 삭제되었습니다." });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Mock Community API server running on http://localhost:${PORT}`);
  // Add some initial data for testing
  const initialPostId = "seed-post-1";
  if (!findPost(initialPostId)) {
    communityData.push({
      PK: initialPostId,
      SK: "POST",
      postId: initialPostId,
      title: "첫 번째 목업 게시글",
      content: "테스트용 목업 데이터입니다.",
      author: "mockAdmin",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      likesCount: 2,
      likedUsers: ["mockUser", "anotherUser"],
      commentCount: 1,
    });
    communityData.push({
      PK: initialPostId,
      SK: "COMMENT#seed-comment-1",
      commentId: "seed-comment-1",
      author: "mockUser",
      content: "첫 번째 댓글!",
      createdAt: new Date().toISOString(),
    });
    console.log("Added initial seed data for Community API.");
  }
});
