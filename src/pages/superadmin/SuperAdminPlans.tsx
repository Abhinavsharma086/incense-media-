import React, { useState } from 'react';
import { getPlans, savePlans, SubscriptionPlan } from '@/lib/roleAuthStore';
import { CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';

const SuperAdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(getPlans());

  const handleToggleStatus = (id: string) => {
    const updated = plans.map((p) =>
      p.id === id ? { ...p, status: p.status === 'active' ? ('inactive' as const) : ('active' as const) } : p
    );
    setPlans(updated);
    savePlans(updated);
    toast.success('Subscription plan status updated');
  };

  return (
    <div className="space-y-8 font-sans animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-[hsl(var(--admin-text-primary))]">
          Subscription Plans & Tiers
        </h1>
        <p className="text-[hsl(var(--admin-text-secondary))] mt-1">
          Configure subscription packages, employee limitations, pricing, and features for Admins.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`border border-[hsl(var(--admin-border))] rounded-2xl shadow-sm hover:shadow-md transition-all ${
              plan.id === 'plan-enterprise' ? 'ring-2 ring-primaryRed/40' : ''
            } p-6 flex flex-col justify-between relative overflow-hidden bg-[hsl(var(--admin-card))]`}
          >
            {plan.id === 'plan-enterprise' && (
              <div className="absolute top-0 right-0 bg-primaryRed text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                Most Popular
              </div>
            )}

            <div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-primaryRed flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-[hsl(var(--admin-text-primary))]">{plan.name}</h3>
              <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-1">Up to {plan.maxEmployees} Employees Allowed</p>

              <div className="my-6">
                <span className="text-4xl font-extrabold text-[hsl(var(--admin-text-primary))]">${plan.priceMonthly}</span>
                <span className="text-[hsl(var(--admin-text-secondary))] text-xs font-semibold"> / month</span>
                <div className="text-xs text-primaryRed font-semibold mt-1">${plan.priceYearly} billed annually</div>
              </div>

              <div className="space-y-3 pt-4 border-t border-[hsl(var(--admin-border))]">
                <p className="text-xs font-semibold text-[hsl(var(--admin-text-secondary))] uppercase tracking-wider">Plan Features:</p>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-[hsl(var(--admin-text-primary))]">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[hsl(var(--admin-border))] mt-6 flex items-center justify-between">
              <span
                className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                  plan.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {plan.status}
              </span>
              <button
                onClick={() => handleToggleStatus(plan.id)}
                className="text-xs font-semibold text-primaryRed hover:underline cursor-pointer"
              >
                Toggle Status
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminPlans;
