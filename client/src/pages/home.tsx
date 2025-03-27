import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Survey from "@/components/landing/Survey";
import Pricing from "@/components/landing/Pricing";
import Dashboard from "@/components/landing/Dashboard";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Survey />
      <Pricing />
      <Dashboard />
      <Footer />
    </div>
  );
}
