import { CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WaitingListConfirmationProps {
  email: string | null;
}

export default function WaitingListConfirmation({ email }: WaitingListConfirmationProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 rounded-full p-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">You're on the waiting list!</CardTitle>
        <CardDescription className="text-base">
          Thanks for your interest in PropManager
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-gray-500 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">What happens next?</h3>
              <ul className="mt-2 text-sm text-gray-600 space-y-2">
                <li>We're currently in early access development.</li>
                <li>You'll be among the first to know when we launch.</li>
                <li>We'll send updates to {email ? <span className="font-medium">{email}</span> : "your email"}.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 text-center">
          <p>Don't want to wait? Choose one of our available plans to get immediate access.</p>
        </div>
      </CardContent>
    </Card>
  );
}
