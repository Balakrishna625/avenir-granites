import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Fetch all customers
    const { data: customers, error: customersError } = await supabaseAdmin
      .from('customers')
      .select('id, name')
      .order('name');

    if (customersError) throw customersError;

    // Fetch all transactions
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('id, customer_id, date, amount')
      .order('date');

    if (transactionsError) throw transactionsError;

    // Fetch all consignments
    const { data: consignments, error: consignmentsError } = await supabaseAdmin
      .from('consignments')
      .select('id, customer_id, date, total')
      .order('date');

    if (consignmentsError) throw consignmentsError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate analytics for each customer
    const analytics = customers.map(customer => {
      const customerTransactions = transactions
        .filter(t => t.customer_id === customer.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const customerConsignments = consignments
        .filter(c => c.customer_id === customer.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate payment intervals
      const paymentGaps: number[] = [];
      for (let i = 1; i < customerTransactions.length; i++) {
        const prevDate = new Date(customerTransactions[i - 1].date);
        const currDate = new Date(customerTransactions[i].date);
        const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        paymentGaps.push(daysDiff);
      }

      const avgPaymentInterval = paymentGaps.length > 0
        ? paymentGaps.reduce((sum, gap) => sum + gap, 0) / paymentGaps.length
        : 0;

      const stdDevPaymentInterval = paymentGaps.length > 1
        ? Math.sqrt(
            paymentGaps.reduce((sum, gap) => sum + Math.pow(gap - avgPaymentInterval, 2), 0) / paymentGaps.length
          )
        : 0;

      const longestPaymentGap = paymentGaps.length > 0 ? Math.max(...paymentGaps) : 0;

      // Last payment date and days since
      const lastPaymentDate = customerTransactions.length > 0
        ? customerTransactions[customerTransactions.length - 1].date
        : null;

      const daysSinceLastPayment = lastPaymentDate
        ? Math.floor((today.getTime() - new Date(lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate consistency score (lower std dev = more consistent)
      const consistencyScore = avgPaymentInterval > 0
        ? (stdDevPaymentInterval / avgPaymentInterval) * 100
        : 0;

      // Determine payment behavior cluster
      let behaviorCluster: 'Fast Payer' | 'Regular Slow Payer' | 'Irregular Payer' | 'At-Risk' | 'No History';
      
      if (customerTransactions.length === 0) {
        behaviorCluster = 'No History';
      } else if (daysSinceLastPayment !== null && avgPaymentInterval > 0 && daysSinceLastPayment > avgPaymentInterval * 2) {
        behaviorCluster = 'At-Risk';
      } else if (consistencyScore > 50) {
        behaviorCluster = 'Irregular Payer';
      } else if (avgPaymentInterval > 40) {
        behaviorCluster = 'Regular Slow Payer';
      } else {
        behaviorCluster = 'Fast Payer';
      }

      // Calculate outstanding balance
      const totalInvoiced = customerConsignments.reduce((sum, c) => sum + (c.total || 0), 0);
      const totalReceived = customerTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const outstandingBalance = totalInvoiced - totalReceived;

      // Calculate age of outstanding receivables
      const oldestConsignmentDate = customerConsignments.length > 0
        ? customerConsignments[0].date
        : null;

      const oldestReceivableAgeDays = oldestConsignmentDate && outstandingBalance > 0
        ? Math.floor((today.getTime() - new Date(oldestConsignmentDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Weighted average age of receivables
      let weightedAgeSum = 0;
      let totalWeight = 0;
      customerConsignments.forEach(cons => {
        const age = Math.floor((today.getTime() - new Date(cons.date).getTime()) / (1000 * 60 * 60 * 24));
        weightedAgeSum += age * (cons.total || 0);
        totalWeight += cons.total || 0;
      });
      const weightedAvgAge = totalWeight > 0 ? weightedAgeSum / totalWeight : 0;

      // Predict next payment
      const predictedNextPaymentDate = lastPaymentDate && avgPaymentInterval > 0
        ? new Date(new Date(lastPaymentDate).getTime() + avgPaymentInterval * 24 * 60 * 60 * 1000)
        : null;

      const predictedNextPaymentDateStr = predictedNextPaymentDate
        ? predictedNextPaymentDate.toISOString().split('T')[0]
        : null;

      // Average payment amount
      const avgPaymentAmount = customerTransactions.length > 0
        ? totalReceived / customerTransactions.length
        : 0;

      // Confidence level for prediction
      let predictionConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
      if (stdDevPaymentInterval < 10) {
        predictionConfidence = 'HIGH';
      } else if (stdDevPaymentInterval < 30) {
        predictionConfidence = 'MEDIUM';
      } else {
        predictionConfidence = 'LOW';
      }

      // Days to first payment after consignment (response time)
      let avgDaysToFirstPayment = 0;
      if (customerConsignments.length > 0 && customerTransactions.length > 0) {
        const responseTimes: number[] = [];
        customerConsignments.forEach(cons => {
          const firstPaymentAfter = customerTransactions.find(
            t => new Date(t.date) >= new Date(cons.date)
          );
          if (firstPaymentAfter) {
            const days = Math.floor(
              (new Date(firstPaymentAfter.date).getTime() - new Date(cons.date).getTime()) / (1000 * 60 * 60 * 24)
            );
            responseTimes.push(days);
          }
        });
        avgDaysToFirstPayment = responseTimes.length > 0
          ? responseTimes.reduce((sum, days) => sum + days, 0) / responseTimes.length
          : 0;
      }

      return {
        customerId: customer.id,
        customerName: customer.name,
        
        // Payment Pattern Metrics
        paymentCount: customerTransactions.length,
        avgPaymentInterval: Math.round(avgPaymentInterval),
        stdDevPaymentInterval: Math.round(stdDevPaymentInterval * 10) / 10,
        longestPaymentGap: longestPaymentGap,
        consistencyScore: Math.round(consistencyScore),
        lastPaymentDate,
        daysSinceLastPayment,
        
        // Outstanding Balance Metrics
        totalInvoiced: Math.round(totalInvoiced),
        totalReceived: Math.round(totalReceived),
        outstandingBalance: Math.round(outstandingBalance),
        oldestConsignmentDate,
        oldestReceivableAgeDays,
        weightedAvgAge: Math.round(weightedAvgAge),
        
        // Behavior Classification
        behaviorCluster,
        
        // Prediction Metrics
        avgPaymentAmount: Math.round(avgPaymentAmount),
        predictedNextPaymentDate: predictedNextPaymentDateStr,
        predictionConfidence,
        avgDaysToFirstPayment: Math.round(avgDaysToFirstPayment),
        
        // Additional Context
        consignmentCount: customerConsignments.length
      };
    });

    // Calculate summary statistics
    const summary = {
      totalCustomers: customers.length,
      customersWithHistory: analytics.filter(a => a.paymentCount > 0).length,
      
      // Cluster breakdown
      fastPayers: analytics.filter(a => a.behaviorCluster === 'Fast Payer').length,
      regularSlowPayers: analytics.filter(a => a.behaviorCluster === 'Regular Slow Payer').length,
      irregularPayers: analytics.filter(a => a.behaviorCluster === 'Irregular Payer').length,
      atRiskPayers: analytics.filter(a => a.behaviorCluster === 'At-Risk').length,
      noHistory: analytics.filter(a => a.behaviorCluster === 'No History').length,
      
      // Outstanding by cluster
      fastPayersOutstanding: analytics
        .filter(a => a.behaviorCluster === 'Fast Payer')
        .reduce((sum, a) => sum + a.outstandingBalance, 0),
      regularSlowOutstanding: analytics
        .filter(a => a.behaviorCluster === 'Regular Slow Payer')
        .reduce((sum, a) => sum + a.outstandingBalance, 0),
      irregularOutstanding: analytics
        .filter(a => a.behaviorCluster === 'Irregular Payer')
        .reduce((sum, a) => sum + a.outstandingBalance, 0),
      atRiskOutstanding: analytics
        .filter(a => a.behaviorCluster === 'At-Risk')
        .reduce((sum, a) => sum + a.outstandingBalance, 0),
      
      // Total outstanding
      totalOutstanding: analytics.reduce((sum, a) => sum + a.outstandingBalance, 0),
      
      // Average metrics across all customers with history
      avgPaymentInterval: Math.round(
        analytics.filter(a => a.paymentCount > 0).reduce((sum, a) => sum + a.avgPaymentInterval, 0) /
        Math.max(1, analytics.filter(a => a.paymentCount > 0).length)
      ),
      
      // Predicted cash inflows (next 30 days)
      predictedInflows30Days: analytics
        .filter(a => {
          if (!a.predictedNextPaymentDate) return false;
          const predictedDate = new Date(a.predictedNextPaymentDate);
          const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          return predictedDate >= today && predictedDate <= thirtyDaysFromNow;
        })
        .reduce((sum, a) => sum + a.avgPaymentAmount, 0),
      
      // High confidence predictions
      highConfidencePredictions: analytics.filter(
        a => a.predictionConfidence === 'HIGH' && a.predictedNextPaymentDate
      ).length
    };

    return NextResponse.json({
      analytics: analytics.filter(a => a.paymentCount > 0 || a.outstandingBalance > 0), // Only return customers with activity
      summary
    });

  } catch (error) {
    console.error('Error calculating customer payment analytics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    );
  }
}
