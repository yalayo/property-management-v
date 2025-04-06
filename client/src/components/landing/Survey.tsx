import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { useToast } from "../../hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { apiRequest } from "../../lib/queryClient";
import { useLocation } from "wouter";
import { ClipboardCheck, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

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

export default function Survey(props) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Array<{ questionId: number; answer: boolean }>>([]);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Fetch questions from API
  const questions = props.questions;

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

  // Handle answer selection - only store the answer, don't navigate
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

  if (isLoading) {
    return (
      <div id="survey" className="py-16 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Property Management Survey</CardTitle>
            <CardDescription>Loading your questions...</CardDescription>
          </CardHeader>
          <CardContent className="py-8 flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div id="survey" className="py-16 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">Error Loading Survey</CardTitle>
            <CardDescription>We couldn't load the survey questions. Please try again later.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate progress
  const progressPercentage = questions 
    ? Math.round(((currentQuestionIndex + (showEmailForm ? 1 : 0)) / questions.length) * 100) 
    : 0;

  return (
    <div id="survey" className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary-50 rounded-full">
            <ClipboardCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
            Property Management Survey
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Help us understand your needs by answering a few quick questions about your property management challenges.
          </p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader className="pb-4">
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                {!showEmailForm && questions && (
                  <span className="text-sm font-medium text-slate-600">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                )}
                {showEmailForm && (
                  <span className="text-sm font-medium text-slate-600">
                    Final Step
                  </span>
                )}
                <span className="text-sm font-medium text-slate-600">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2.5" />
            </div>
          </CardHeader>
          
          <CardContent className="pt-2 px-6 pb-6">
            {/* Survey questions */}
            {!showEmailForm && questions && questions[currentQuestionIndex] && (
              <div className="survey-question">
                <h3 className="text-xl font-medium leading-7 text-slate-900 mb-6">
                  {questions[currentQuestionIndex].text}
                </h3>
                <div className="space-y-5">
                  <RadioGroup 
                    value={
                      responses.find(r => r.questionId === questions[currentQuestionIndex].id)?.answer.toString() || undefined
                    }
                    onValueChange={(value) => handleAnswerSelection(value === "true")}
                    className="space-y-4"
                  >
                    <div className="flex items-start space-x-3 border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <RadioGroupItem value="true" id="yes" className="mt-1" />
                      <div>
                        <Label htmlFor="yes" className="text-base font-medium">Yes</Label>
                        <p className="text-sm text-slate-500 mt-1">I experience this challenge</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <RadioGroupItem value="false" id="no" className="mt-1" />
                      <div>
                        <Label htmlFor="no" className="text-base font-medium">No</Label>
                        <p className="text-sm text-slate-500 mt-1">This isn't a challenge for me</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Email form */}
            {showEmailForm && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-2 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Thanks for completing our survey!</h3>
                  <p className="mt-2 text-slate-500">
                    Enter your email to join our waiting list and receive personalized solutions for your challenges.
                  </p>
                </div>
                
                <form onSubmit={handleSubmit(onEmailSubmit)}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                      <Input
                        type="email"
                        id="email"
                        placeholder="you@example.com"
                        {...register("email")}
                        className="mt-1"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500">
                        By submitting, you agree to receive emails about our property management solutions.
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between">
            {/* Navigation buttons */}
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 && !showEmailForm}
              className="text-slate-700"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {!showEmailForm ? (
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
                    if (isLastQuestion) {
                      setShowEmailForm(true);
                    } else {
                      setCurrentQuestionIndex(currentQuestionIndex + 1);
                    }
                  }
                }}
                size="sm"
              >
                {isLastQuestion ? 'Complete Survey' : 'Next Question'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit(onEmailSubmit)}
                disabled={submitSurveyMutation.isPending}
                size="sm"
              >
                {submitSurveyMutation.isPending ? 'Submitting...' : 'Join Waiting List'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
