"use client";

import React from 'react';

interface PromoCodeInputProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  appliedPromo: {
    code: string;
    discount: number;
    promoId: string;
    type: string;
    value: number;
  } | null;
  promoError: string;
  promoLoading: boolean;
  handleApplyPromo: () => void;
  handleRemovePromo: () => void;
}

export function PromoCodeInput({
  promoCode,
  setPromoCode,
  appliedPromo,
  promoError,
  promoLoading,
  handleApplyPromo,
  handleRemovePromo,
}: PromoCodeInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Promo code"
          className="flex-1 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-600/50 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all uppercase tracking-wide"
        />
        <button
          type="button"
          onClick={handleApplyPromo}
          disabled={promoLoading || !promoCode.trim()}
          className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          className={`
            ${promoLoading || !promoCode.trim()
              ? 'bg-gray-700 text-gray-400 border-gray-600/30'
              : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_0_1px_rgba(32,249,40,0.3)]'}
          `}
        >
          {promoLoading ? 'Applying...' : 'Apply'}
        </button>
      </div>

      {appliedPromo && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300 text-xs font-medium uppercase tracking-wide">Promo Applied</span>
            <span className="text-white text-sm">{appliedPromo.code}</span>
          </div>
          <button
            type="button"
            onClick={handleRemovePromo}
            className="text-emerald-400 text-xs font-medium hover:text-emerald-300 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {promoError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-red-400 text-xs">⚠</span>
          <span className="text-red-300 text-xs">{promoError}</span>
        </div>
      )}
    </div>
  );
}
