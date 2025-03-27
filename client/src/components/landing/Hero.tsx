import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Star } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          {/* Create a diagonal section */}
          <svg
            className="hidden lg:block absolute right-0 inset-y-0 h-full w-48 text-white transform translate-x-1/2"
            fill="currentColor"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon points="50,0 100,0 50,100 0,100" />
          </svg>

          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 lg:mt-16 lg:px-8 xl:mt-20">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl">
                <span className="block xl:inline text-gray-900">Property Management</span>{' '}
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 xl:inline">Made Simple</span>
              </h1>
              
              <p className="mt-3 text-base text-gray-600 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Streamline your rental property management with our comprehensive system designed specifically for German landlords. 
              </p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm md:text-base text-gray-700">
                  <CheckCircle className="h-5 w-5 text-indigo-500 mr-2" />
                  <span>Automate tenant communications</span>
                </div>
                <div className="flex items-center text-sm md:text-base text-gray-700">
                  <CheckCircle className="h-5 w-5 text-purple-500 mr-2" />
                  <span>Track rent payments and expenses</span>
                </div>
                <div className="flex items-center text-sm md:text-base text-gray-700">
                  <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
                  <span>Generate professional financial reports</span>
                </div>
              </div>
              
              <div className="mt-8 sm:mt-10">
                <a href="#survey" className="group w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 sm:w-auto">
                  Take Our Survey
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>
                
                <div className="mt-4 flex flex-col sm:flex-row sm:space-x-3">
                  <Link 
                    to="/onboarding" 
                    className="w-full sm:w-auto flex items-center justify-center px-5 py-3 border-2 border-indigo-200 text-base font-medium rounded-full text-indigo-700 bg-white hover:bg-indigo-50 transition-colors duration-200 mb-3 sm:mb-0"
                  >
                    Get Started
                  </Link>
                  
                  <a
                    href="#pricing"
                    className="w-full sm:w-auto flex items-center justify-center px-5 py-3 text-base font-medium rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 border-2 border-gray-200"
                  >
                    View Pricing
                  </a>
                </div>
              </div>
              
              <div className="mt-6 flex items-center text-sm text-gray-500">
                <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                <Star className="h-4 w-4 text-yellow-500 mr-1" fill="currentColor" />
                <span className="ml-1">Trusted by over 200 landlords in Germany</span>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 shadow-2xl">
        <div 
          className="h-56 w-full sm:h-72 md:h-96 lg:w-full lg:h-full"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Fancy gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-blue-900/40"></div>
          
          {/* Abstract shape for modern design */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full filter blur-2xl"></div>
          <div className="absolute top-10 left-10 w-32 h-32 bg-purple-600/20 rounded-full filter blur-xl"></div>
        </div>
      </div>
    </div>
  );
}
