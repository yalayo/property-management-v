import { CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

import { Link } from "wouter";
import { Button } from "../ui/button";
import { Gift, ArrowRight } from "lucide-react";

interface WaitingListConfirmationProps {
  email: string | null;
}

export default function WaitingListConfirmation({ email }: WaitingListConfirmationProps) {
  return (
    <Card className="shadow-xl border-slate-200">
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 rounded-full p-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">You're on the waiting list!</CardTitle>
        <CardDescription className="text-base">
          Thanks for your interest in PropManager
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-slate-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-slate-900">What happens next?</h3>
              <ul className="mt-2 text-sm text-slate-600 space-y-2">
                <li>We're currently in early access development.</li>
                <li>You'll be among the first to know when we launch.</li>
                <li>We'll send updates to {email ? <span className="font-medium">{email}</span> : "your email"}.</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Support Our Development option */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-lg border border-indigo-100">
          <div className="flex items-start">
            <div className="shrink-0">
              <div className="bg-indigo-100 rounded-full p-2 mr-3">
                <Gift className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Support Our Development</h3>
              <p className="mt-1 text-sm text-slate-600 mb-3">
                Get lifetime access to all current and future features with a one-time contribution of <span className="font-bold text-primary">€370</span>.
              </p>
              <Link href={`/payment/crowdfunding${email ? `?email=${encodeURIComponent(email)}` : ''}`}>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Support Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
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
