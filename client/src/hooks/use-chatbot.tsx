import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";

export type ChatMessage = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
};

/**
 * Custom hook for the chatbot functionality
 * Handles user messages, API interaction, and message history
 */
export function useChatbot() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content: "Hello! I'm your Property Management Assistant. How can I help you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Send a message to the chatbot API
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chatbot/message", { message });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send message");
      }
      return await res.json();
    },
    onMutate: (message) => {
      // Add user message to chat history optimistically
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: message,
        role: "user",
        timestamp: new Date(),
      };
      
      setChatHistory((prev) => [...prev, userMessage]);
      setIsTyping(true);
    },
    onSuccess: (data) => {
      // Add assistant response to chat history
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      };
      
      setChatHistory((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get a response",
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  // Reset chat history
  const resetChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chatbot/reset");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to reset chat");
      }
      return await res.json();
    },
    onSuccess: () => {
      setChatHistory([
        {
          id: "welcome",
          content: "Chat has been reset. How can I help you today?",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
      toast({
        title: "Chat Reset",
        description: "The chat history has been cleared.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset chat",
        variant: "destructive",
      });
    },
  });

  // Send a message to the chatbot
  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      sendMessageMutation.mutate(message);
    },
    [sendMessageMutation]
  );

  // Reset the chat
  const resetChat = useCallback(() => {
    resetChatMutation.mutate();
  }, [resetChatMutation]);

  return {
    chatHistory,
    sendMessage,
    resetChat,
    isTyping,
    isSending: sendMessageMutation.isPending,
  };
}