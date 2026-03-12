import React from "react";
import { TierSelection } from "../components/payment/TierSelection";
import DashboardLayout from "../components/layouts/DashboardLayout";

function SubscriptionTiers(props) {
  const user = props.user;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Subscription Management</h1>
            <p className="text-muted-foreground">
              Currently on: <span className="font-semibold">{user?.tier || "No tier selected"}</span>
            </p>
          </div>
          
          <TierSelection />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SubscriptionTiers;