import { 
  Home, 
  CreditCard, 
  Calendar, 
  BarChart4 
} from "lucide-react";

export default function Features() {
  const features = [
    {
      name: "Property Management",
      description: "Easily manage multiple properties in one place. Keep track of maintenance, documents, and important dates.",
      icon: Home,
    },
    {
      name: "Financial Tracking",
      description: "Track rent payments, expenses, and generate financial reports. Automated notifications for late payments.",
      icon: CreditCard,
    },
    {
      name: "Automated Communication",
      description: "AI-powered communication tools that automatically respond to tenant inquiries via email, WhatsApp, and phone.",
      icon: Calendar,
    },
    {
      name: "Data Insights",
      description: "Gain valuable insights from your property data. Visualize trends and make informed decisions.",
      icon: BarChart4,
    },
  ];

  return (
    <div id="features" className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to manage your properties
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Our comprehensive platform offers all the tools required for efficient property management in Germany.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {features.map((feature) => (
              <div key={feature.name} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
