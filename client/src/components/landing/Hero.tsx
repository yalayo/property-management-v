import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Star, BarChart, Home, Clock, Zap } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:py-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
            <h1 className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl lg:mt-6">
              <span className="block text-gray-900">Property Management</span>{' '}
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">Made Simple</span>
            </h1>
            
            <p className="mt-3 text-base text-gray-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto lg:mx-0 md:mt-5 md:text-xl">
              Streamline your rental property management with our comprehensive system designed specifically for German landlords. 
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
                    <BarChart className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="font-medium">Financial Tracking</div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-purple-100">
                    <Home className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="font-medium">Property Management</div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="font-medium">Automated Reminders</div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-cyan-100">
                    <Zap className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div className="font-medium">Fast AI Processing</div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row sm:space-x-4">
              <a 
                href="#survey" 
                className="group flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-medium rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:shadow-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200"
              >
                Take Our Survey
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </a>
              
              <div className="mt-3 sm:mt-0 flex space-x-4">
                <Link 
                  to="/onboarding" 
                  className="flex-1 flex items-center justify-center px-6 py-3.5 border border-indigo-200 text-base font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 transition-colors duration-200"
                >
                  Get Started
                </Link>
                
                <a
                  href="#pricing"
                  className="flex-1 flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                >
                  View Pricing
                </a>
              </div>
            </div>
            
            <div className="mt-6 sm:mt-8 flex items-center text-sm text-gray-500">
              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
              <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
              <span className="ml-1">Trusted by over 200 landlords in Germany</span>
            </div>
          </div>
          
          <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6">
            {/* Modern abstract decorative elements */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8">
              <div className="w-72 h-72 bg-gradient-to-r from-purple-300/30 to-blue-300/30 rounded-full filter blur-3xl"></div>
            </div>
            
            <div className="relative mx-auto w-full rounded-lg shadow-lg overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                <div className="h-96 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-8">
                  {/* Abstract geometric shapes */}
                  <div className="absolute right-4 top-4 w-32 h-32 bg-white/10 rounded-full"></div>
                  <div className="absolute left-16 bottom-16 w-48 h-48 bg-white/10 rounded-full"></div>
                  <div className="absolute left-32 top-32 w-16 h-16 bg-white/10 rounded-lg transform rotate-45"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 text-white text-center">
                    <div className="flex justify-center mb-6">
                      <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                        <Home className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Modern Property Management</h3>
                    <p className="text-white/80 max-w-md">
                      Our platform helps you stay organized, save time, and maximize your rental income with powerful automation tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom decorative shapes */}
            <div className="absolute bottom-0 right-0">
              <div className="w-40 h-40 bg-gradient-to-r from-cyan-300/20 to-blue-300/20 rounded-full filter blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
