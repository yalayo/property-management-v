import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Define the schema for a single question response
const questionResponseSchema = z.object({
  questionId: z.number(),
  answer: z.boolean()
});

// Define the schema for the email input on the final step
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

type Question = {
  id: number;
  text: string;
  order: number;
};

interface SurveyProps {
  onCompleted?: (email: string) => void;
}

export default function Survey({ onCompleted }: SurveyProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Array<{ questionId: number; answer: boolean }>>([]);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Fetch questions from API
  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['/api/questions'],
    queryFn: () => fetch('/api/questions').then(res => res.json())
  });

  // Handle email form
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<{ email: string }>({
    resolver: zodResolver(emailSchema)
  });

  // Submit survey responses
  const submitSurveyMutation = useMutation({
    mutationFn: (data: { email?: string; responses: typeof responses }) => 
      apiRequest('POST', '/api/survey', data),
    onSuccess: (_, variables) => {
      toast({
        title: "Survey submitted",
        description: "Thank you for completing our survey!",
      });
      
      // If onCompleted callback was provided, pass the email
      if (onCompleted && variables.email) {
        onCompleted(variables.email);
      } else {
        // Otherwise navigate to waiting list
        navigate("/waiting-list");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to submit survey: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Effect to check if we're on the last question
  useEffect(() => {
    if (questions && questions.length > 0) {
      setIsLastQuestion(currentQuestionIndex === questions.length - 1);
    }
  }, [currentQuestionIndex, questions]);

  // Handle answer selection
  const handleAnswerSelection = (answer: boolean) => {
    if (!questions) return;

    const question = questions[currentQuestionIndex];
    const existingResponseIndex = responses.findIndex(r => r.questionId === question.id);
    
    if (existingResponseIndex >= 0) {
      // Update existing response
      const updatedResponses = [...responses];
      updatedResponses[existingResponseIndex].answer = answer;
      setResponses(updatedResponses);
    } else {
      // Add new response
      setResponses([...responses, { questionId: question.id, answer }]);
    }

    // Move to next question or show email form if on last question
    if (isLastQuestion) {
      setShowEmailForm(true);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (showEmailForm) {
      setShowEmailForm(false);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const onEmailSubmit = (data: { email: string }) => {
    submitSurveyMutation.mutate({ 
      email: data.email, 
      responses 
    });
  };

  // Skip email and just submit survey
  const skipEmail = () => {
    submitSurveyMutation.mutate({ responses });
  };

  if (isLoading) {
    return (
      <div id="survey" className="py-12 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
            <p className="mt-2 text-gray-500">Loading survey questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="survey" className="py-12 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Error</h2>
            <p className="mt-2 text-gray-500">Failed to load survey questions. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress
  const progressPercentage = questions 
    ? Math.round(((currentQuestionIndex + (showEmailForm ? 1 : 0)) / questions.length) * 100) 
    : 0;

  return (
    <div id="survey" className="py-16 bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 font-semibold tracking-wide uppercase">Take Our Survey</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Tell us about your property management challenges
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Answer a few quick questions to help us understand your needs and find the perfect solution for you.
          </p>
        </div>

        <div className="mt-10 bg-white shadow-lg rounded-xl overflow-hidden border border-indigo-100">
          <div className="px-6 py-8">
            <div className="survey-container relative">
              {/* Progress indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {!showEmailForm && questions && (
                    <span className="text-sm font-medium text-gray-700">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                  )}
                  {showEmailForm && (
                    <span className="text-sm font-medium text-gray-700">
                      Final Step
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="w-full h-2.5 bg-indigo-100" />
              </div>

              {/* Survey questions */}
              {!showEmailForm && questions && questions[currentQuestionIndex] && (
                <div className="survey-question">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {questions[currentQuestionIndex].text}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <RadioGroup 
                      defaultValue={
                        responses.find(r => r.questionId === questions[currentQuestionIndex].id)?.answer.toString()
                      }
                      onValueChange={(value) => handleAnswerSelection(value === "true")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="yes" className="text-primary" />
                        <Label htmlFor="yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="no" className="text-primary" />
                        <Label htmlFor="no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Email form */}
              {showEmailForm && (
                <div className="survey-question">
                  <h3 className="text-xl font-medium leading-6 text-gray-900">Thanks for completing our survey!</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Enter your email to see our pricing plans tailored for your needs.
                  </p>
                  
                  <form onSubmit={handleSubmit(onEmailSubmit)} className="mt-4">
                    <div className="mb-4">
                      <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</Label>
                      <div className="mt-1">
                        <Input
                          type="email"
                          id="email"
                          placeholder="you@example.com"
                          {...register("email")}
                          className={errors.email ? "border-red-300" : "border-indigo-200 focus:border-primary focus:ring-primary"}
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                        disabled={submitSurveyMutation.isPending}
                      >
                        {submitSurveyMutation.isPending ? 'Submitting...' : 'See Pricing Plans'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={skipEmail} 
                        disabled={submitSurveyMutation.isPending}
                        className="border-indigo-200 text-gray-700 hover:bg-indigo-50"
                      >
                        Skip
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="mt-6 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0 && !showEmailForm}
                  className="border-indigo-200 text-gray-700 hover:bg-indigo-50"
                >
                  Previous
                </Button>
                
                {!showEmailForm && (
                  <Button
                    type="button"
                    onClick={() => {
                      // Check if the current question has been answered
                      const currentQuestionId = questions ? questions[currentQuestionIndex].id : -1;
                      const isCurrentQuestionAnswered = responses.some(r => r.questionId === currentQuestionId);
                      
                      // If current question is answered or we're allowing navigation without answering
                      if (isCurrentQuestionAnswered) {
                        if (isLastQuestion) {
                          setShowEmailForm(true);
                        } else {
                          setCurrentQuestionIndex(currentQuestionIndex + 1);
                        }
                      } else {
                        // If not answered, set a dummy answer (default to "No")
                        handleAnswerSelection(false);
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  >
                    {isLastQuestion ? 'Finish' : 'Next'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
