'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  CreditCard,
  FileText,
  Calendar,
  TrendingDown,
  Archive,
  History
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n: number) => INR.format(n || 0);

interface SettlementModalProps {
  customerId: string;
  customerName: string;
  currentBalance: number;
  oldDueAmount: number;
  waivedAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerSettlementModal({
  customerId,
  customerName,
  currentBalance,
  oldDueAmount,
  waivedAmount,
  onClose,
  onSuccess
}: SettlementModalProps) {
  const totalOwed = currentBalance + oldDueAmount - waivedAmount;
  const isZeroBalance = totalOwed === 0;
  
  const [step, setStep] = useState<'confirm' | 'details' | 'processing' | 'success'>('confirm');
  const [settlementMode, setSettlementMode] = useState<string>('RTGS');
  const [settlementAmount, setSettlementAmount] = useState<string>(currentBalance.toString());
  const [settlementReference, setSettlementReference] = useState<string>('');
  const [settlementNotes, setSettlementNotes] = useState<string>('');
  const [waiveRemaining, setWaiveRemaining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const remainingAfterPayment = Math.max(0, totalOwed - parseFloat(settlementAmount || '0'));

  const handleSettlement = async () => {
    try {
      setStep('processing');
      setError(null);

      const response = await fetch('/api/customers/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          settlementAmount: isZeroBalance ? 0 : parseFloat(settlementAmount) || 0,
          settlementMode: isZeroBalance ? 'FULL_WAIVER' : settlementMode,
          settlementReference: isZeroBalance ? '' : settlementReference,
          settlementNotes: isZeroBalance ? 'Zero balance settlement - all cleared' : settlementNotes,
          waiveRemaining: isZeroBalance ? true : waiveRemaining,
          settledBy: 'admin' // You can get this from user session
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Settlement failed');
      }

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to settle account');
      setStep(isZeroBalance ? 'confirm' : 'details');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Settle Customer Account</h2>
              <p className="text-sm text-gray-600">{customerName}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <CardContent className="p-6">
          {/* Step 1: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-2">
                      {isZeroBalance ? 'Settle Account with Zero Balance' : 'About Account Settlement'}
                    </h3>
                    {isZeroBalance ? (
                      <>
                        <p className="text-sm text-amber-800 mb-3">
                          The customer has a zero balance. Click "Yes, Settle Account" to close the current period and start fresh.
                        </p>
                        <p className="text-sm text-amber-800 font-medium">
                          No payment details required since balance is fully cleared.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-amber-800 mb-3">
                          Settling an account will:
                        </p>
                        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                          <li>Archive all current consignments and transactions</li>
                          <li>Close the current accounting period</li>
                          <li>Start a fresh new period with zero balance</li>
                          <li>Keep all historical data accessible for viewing</li>
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Financial Summary */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">Current Financial Summary</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Period Balance:</span>
                    <span className="font-semibold text-gray-900">{fmt(currentBalance)}</span>
                  </div>
                  {oldDueAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Old Due Amount:</span>
                      <span className="font-semibold text-orange-600">{fmt(oldDueAmount)}</span>
                    </div>
                  )}
                  {waivedAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Previously Waived:</span>
                      <span className="font-semibold text-green-600">-{fmt(waivedAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Amount Owed:</span>
                    <span className="text-lg font-bold text-red-600">{fmt(totalOwed)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (isZeroBalance) {
                      handleSettlement();
                    } else {
                      setStep('details');
                    }
                  }} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isZeroBalance ? 'Yes, Settle Account' : 'Continue to Settlement'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Settlement Details */}
          {step === 'details' && (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900">Error</p>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Settlement Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total owed: {fmt(totalOwed)}
                </p>
              </div>

              {/* Settlement Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={settlementMode}
                  onChange={(e) => setSettlementMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RTGS">RTGS/NEFT/Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="PARTIAL_WAIVER">Partial Payment + Waive Rest</option>
                  <option value="FULL_WAIVER">Full Waiver (No Payment)</option>
                </select>
              </div>

              {/* Reference Number */}
              {settlementMode !== 'CASH' && settlementMode !== 'FULL_WAIVER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      value={settlementReference}
                      onChange={(e) => setSettlementReference(e.target.value)}
                      className="pl-10"
                      placeholder="Transaction reference, cheque number, etc."
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Settlement Notes
                </label>
                <textarea
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  placeholder="Any additional notes about this settlement..."
                />
              </div>

              {/* Waive Remaining */}
              {remainingAfterPayment > 0 && settlementMode !== 'FULL_WAIVER' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waiveRemaining}
                      onChange={(e) => setWaiveRemaining(e.target.checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">
                        Waive remaining balance of {fmt(remainingAfterPayment)}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Check this to forgive the remaining amount after payment
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Settlement Summary */}
              <div className="border rounded-lg overflow-hidden bg-green-50">
                <div className="bg-green-100 px-4 py-3 border-b border-green-200">
                  <h3 className="font-semibold text-green-900">Settlement Summary</h3>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Payment Receiving:</span>
                    <span className="font-semibold text-green-700">{fmt(parseFloat(settlementAmount) || 0)}</span>
                  </div>
                  {waiveRemaining && remainingAfterPayment > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Amount Waiving:</span>
                      <span className="font-semibold text-blue-700">{fmt(remainingAfterPayment)}</span>
                    </div>
                  )}
                  {!waiveRemaining && remainingAfterPayment > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Carrying Forward:</span>
                      <span className="font-semibold text-orange-700">{fmt(remainingAfterPayment)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">New Period Starting Balance:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {waiveRemaining ? fmt(0) : fmt(remainingAfterPayment)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('confirm')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSettlement} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!settlementAmount && settlementMode !== 'FULL_WAIVER'}
                >
                  Complete Settlement
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Settlement...</h3>
              <p className="text-gray-600">Please wait while we settle the account</p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Settled Successfully!</h3>
              <p className="text-gray-600">A new accounting period has been started for {customerName}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
