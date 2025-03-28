import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, RefreshCw, MinimizeIcon, MaximizeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useChatbot, ChatMessage } from "@/hooks/use-chatbot";
import { cn } from "@/lib/utils";

type ChatbotWidgetProps = {
  className?: string;
};

export function ChatbotWidget({ className }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { chatHistory, sendMessage, resetChat, isTyping, isSending } = useChatbot();
  
  // Scroll to bottom whenever chat history changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);
  
  const handleSendMessage = () => {
    if (inputValue.trim() === "") return;
    sendMessage(inputValue);
    setInputValue("");
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };
  
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      {/* Chatbot button */}
      {!isOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={toggleChat} 
                size="icon" 
                className="h-12 w-12 rounded-full shadow-lg"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Open property assistant</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Chatbot interface */}
      {isOpen && (
        <Card className={cn(
          "w-80 sm:w-96 shadow-lg transition-all duration-200 ease-in-out",
          isMinimized ? "h-auto" : "h-[500px] max-h-[80vh]"
        )}>
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-medium">Property Assistant</CardTitle>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={toggleMinimize}
              >
                {isMinimized ? <MaximizeIcon className="h-4 w-4" /> : <MinimizeIcon className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive hover:text-destructive/90" 
                onClick={toggleChat}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <>
              <CardContent className="p-0 flex-grow">
                <ScrollArea className="h-[380px] p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {chatHistory.map((message) => (
                      <ChatMessageBubble key={message.id} message={message} />
                    ))}
                    {isTyping && (
                      <div className="flex items-center justify-start">
                        <div className="bg-muted text-muted-foreground rounded-lg py-2 px-3 max-w-[80%]">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              
              <CardFooter className="p-3 pt-2 border-t">
                <div className="flex items-center w-full space-x-2">
                  <Textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    className="min-h-9 h-9 resize-none"
                    disabled={isSending}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={resetChat} 
                          disabled={isSending}
                          className="h-9 w-9 flex-shrink-0"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Reset conversation</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage} 
                    disabled={inputValue.trim() === "" || isSending}
                    className="h-9 w-9 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// Component for individual chat messages
function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  
  return (
    <div className={cn(
      "flex",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "rounded-lg py-2 px-3 max-w-[80%]",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground"
      )}>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className={cn(
          "text-xs mt-1",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground/70"
        )}>
          {new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
          }).format(message.timestamp)}
        </div>
      </div>
    </div>
  );
}