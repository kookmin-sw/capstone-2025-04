output "chatbot_api_invoke_url" {
  description = "The invoke URL for the deployed Chatbot API stage"
  value       = aws_api_gateway_stage.chatbot_api_stage.invoke_url
} 