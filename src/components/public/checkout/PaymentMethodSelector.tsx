"use client";

import React from 'react';

export interface PaymentProvider {
  provider_name: string;
  display_name: string;
  logo_url?: string;
  fee_percent: number;
  base_fee_usd: number;
}

interface PaymentMethodSelectorProps {
  providers: PaymentProvider[];
  selectedMethod: string;
  onChange: (method: string) => void;
}

export function PaymentMethodSelector({ providers, selectedMethod, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        Payment Method
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {providers.map((provider) => {
          const isSelected = selectedMethod === provider.provider_name;
          return (
            <button
              key={provider.provider_name}
              type="button"
              onClick={() => onChange(provider.provider_name)}
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all
                ${isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(32,249,40,0.3)]'
                  : 'border-gray-600/30 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              {provider.logo_url ? (
                <img src={provider.logo_url} alt={provider.display_name} className="w-8 h-8 rounded object-cover" />
              ) : (
                <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-700">
                  {provider.provider_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium">{provider.display_name}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {provider.fee_percent > 0 ? `${provider.fee_percent}% fee` : 'Free'} · {provider.base_fee_usd > 0 ? `+$${provider.base_fee_usd}` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
