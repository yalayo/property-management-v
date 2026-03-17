import React from "react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { ClipboardCheck, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

export default function Survey(props) {
  const { t } = useTranslation("landing");
  const [isLastQuestion, setIsLastQuestion] = useState(false);

  const questions = props.questions;
  const currentQuestionIndex = props.currentQuestionIndex;
  const currentQuestionResponse = props.currentQuestionResponse;
  const showEmailForm = props.showEmailForm;
  const isEmailFormPending = props.isEmailFormPending;
  const isLoading = props.isLoading;
  const error = props.error;

  useEffect(() => {
    if (questions && questions.length > 0) {
      setIsLastQuestion(currentQuestionIndex === questions.length - 1);
    }
  }, [currentQuestionIndex, questions]);

  const handleAnswerSelection = props.handleAnswerSelection;
  const handleNext = props.handleNext;
  const handlePrevious = props.handlePrevious;
  const handleSubmit = props.handleSubmit;

  if (isLoading) {
    return (
      <div id="survey" className="py-16 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-3xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t("survey.title")}</CardTitle>
            <CardDescription>{t("survey.loadingDesc")}</CardDescription>
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
            <CardTitle className="text-2xl font-bold text-destructive">{t("survey.errorTitle")}</CardTitle>
            <CardDescription>{t("survey.errorDesc")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
            {t("survey.title")}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("survey.subtitle")}
          </p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader className="pb-4">
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                {!showEmailForm && questions && (
                  <span className="text-sm font-medium text-slate-600">
                    {t("survey.questionOf", { current: currentQuestionIndex + 1, total: questions.length })}
                  </span>
                )}
                {showEmailForm && (
                  <span className="text-sm font-medium text-slate-600">
                    {t("survey.finalStep")}
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
                    value={currentQuestionResponse.toString() || undefined}
                    onValueChange={(value) => handleAnswerSelection(value === "true")}
                    className="space-y-4"
                  >
                    <div className="flex items-start space-x-3 border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <RadioGroupItem value="true" id="yes" className="mt-1" />
                      <div>
                        <Label htmlFor="yes" className="text-base font-medium">{t("survey.yes")}</Label>
                        <p className="text-sm text-slate-500 mt-1">{t("survey.yesDesc")}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <RadioGroupItem value="false" id="no" className="mt-1" />
                      <div>
                        <Label htmlFor="no" className="text-base font-medium">{t("survey.no")}</Label>
                        <p className="text-sm text-slate-500 mt-1">{t("survey.noDesc")}</p>
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
                  <h3 className="text-xl font-bold text-slate-900">{t("survey.thankYou")}</h3>
                  <p className="mt-2 text-slate-500">
                    {t("survey.enterEmail")}
                  </p>
                </div>

                <div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">{t("survey.emailLabel")}</Label>
                      <Input
                        type="email"
                        id="email"
                        placeholder="you@example.com"
                        value={props.email}
                        onChange={props.onChangeEmail}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        {t("survey.agreement")}
                      </p>
                    </div>
                  </div>
                </div>
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
              {t("survey.previous")}
            </Button>

            {!showEmailForm ? (
              <Button
                type="button"
                onClick={handleNext}
                size="sm"
              >
                {isLastQuestion ? t("survey.completeSurvey") : t("survey.nextQuestion")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isEmailFormPending}
                size="sm"
              >
                {isEmailFormPending ? t("survey.submitting") : t("survey.joinWaitingList")}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
