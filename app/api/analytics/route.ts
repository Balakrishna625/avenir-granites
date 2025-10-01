import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

const supabase = supabaseUrl && supabaseServiceRole 
  ? createClient(supabaseUrl, supabaseServiceRole)
  : null;

export async function GET() {
  try {
    // Return mock data if environment variables are not available (during build)
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({
        overview: {
          total_consignments: 0,
          total_blocks: 0,
          total_expenditure: 0,
          total_sqft_produced: 0,
          avg_cost_per_sqft: 0,
          total_sales: 0,
          total_profit: 0,
          total_sqft_sold: 0,
          profit_margin: 0
        },
        blocks: { by_status: {}, total: 0 },
        parts: {},
        buyers: { top_buyers: [], total_buyers: 0 },
        recent_sales: []
      });
    }
    // Get overall analytics
    const [
      consignmentsResult,
      blocksResult,
      blockPartsResult,
      salesResult
    ] = await Promise.all([
      // Total consignments and expenditure
      supabase
        .from('granite_consignments')
        .select('id, total_expenditure, total_sqft_produced, raw_material_cost_per_sqft, total_cost_per_sqft'),
      
      // Total blocks by status
      supabase
        .from('granite_blocks')
        .select('id, status, net_measurement, total_sqft'),
      
      // Block parts breakdown
      supabase
        .from('granite_block_parts')
        .select(`
          id,
          part_name,
          sqft,
          sold_sqft,
          remaining_sqft,
          granite_blocks!inner(
            consignment_id,
            granite_consignments!inner(
              total_cost_per_sqft
            )
          )
        `),
      
      // Sales data
      supabase
        .from('granite_sales')
        .select(`
          id,
          buyer_name,
          sqft_sold,
          total_selling_price,
          total_profit,
          sale_date,
          part_name,
          block_no
        `)
    ]);

    if (consignmentsResult.error) throw consignmentsResult.error;
    if (blocksResult.error) throw blocksResult.error;
    if (blockPartsResult.error) throw blockPartsResult.error;
    if (salesResult.error) throw salesResult.error;

    const consignments = consignmentsResult.data || [];
    const blocks = blocksResult.data || [];
    const blockParts = blockPartsResult.data || [];
    const sales = salesResult.data || [];

    // Calculate key metrics
    const totalConsignments = consignments.length;
    const totalBlocks = blocks.length;
    const totalExpenditure = consignments.reduce((sum, c) => sum + (c.total_expenditure || 0), 0);
    const totalSqftProduced = consignments.reduce((sum, c) => sum + (c.total_sqft_produced || 0), 0);
    const avgCostPerSqft = totalSqftProduced > 0 ? totalExpenditure / totalSqftProduced : 0;

    // Sales metrics
    const totalSales = sales.reduce((sum, s) => sum + (s.total_selling_price || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.total_profit || 0), 0);
    const totalSqftSold = sales.reduce((sum, s) => sum + (s.sqft_sold || 0), 0);

    // Block status breakdown
    const blocksByStatus = blocks.reduce((acc, block) => {
      acc[block.status] = (acc[block.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Parts breakdown
    const partsByName = blockParts.reduce((acc, part) => {
      if (!acc[part.part_name]) {
        acc[part.part_name] = { total_sqft: 0, sold_sqft: 0, remaining_sqft: 0, count: 0 };
      }
      acc[part.part_name].total_sqft += part.sqft || 0;
      acc[part.part_name].sold_sqft += part.sold_sqft || 0;
      acc[part.part_name].remaining_sqft += part.remaining_sqft || 0;
      acc[part.part_name].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Top buyers
    const buyerStats = sales.reduce((acc, sale) => {
      if (!acc[sale.buyer_name]) {
        acc[sale.buyer_name] = {
          name: sale.buyer_name,
          sqftPurchased: 0,
          totalAmount: 0,
          totalProfit: 0,
          transactions: 0
        };
      }
      acc[sale.buyer_name].sqftPurchased += sale.sqft_sold || 0;
      acc[sale.buyer_name].totalAmount += sale.total_selling_price || 0;
      acc[sale.buyer_name].totalProfit += sale.total_profit || 0;
      acc[sale.buyer_name].transactions += 1;
      return acc;
    }, {} as Record<string, any>);

    const topBuyers = Object.values(buyerStats)
      .map((buyer: any) => ({
        name: buyer.name,
        sqftPurchased: buyer.sqftPurchased,
        totalProfit: buyer.totalProfit,
        avgRate: buyer.sqftPurchased > 0 ? buyer.totalAmount / buyer.sqftPurchased : 0,
        transactions: buyer.transactions
      }))
      .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Recent sales
    const recentSales = sales
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
      .slice(0, 10)
      .map(sale => ({
        id: sale.id,
        buyer: sale.buyer_name,
        blockPart: `${sale.block_no}-${sale.part_name}`,
        sqft: sale.sqft_sold,
        rate: sale.sqft_sold > 0 ? Math.round(sale.total_selling_price / sale.sqft_sold) : 0,
        profit: sale.total_profit,
        date: new Date(sale.sale_date).toLocaleDateString('en-IN')
      }));

    const analytics = {
      overview: {
        total_consignments: totalConsignments,
        total_blocks: totalBlocks,
        total_expenditure: totalExpenditure,
        total_sqft_produced: totalSqftProduced,
        avg_cost_per_sqft: avgCostPerSqft,
        total_sales: totalSales,
        total_profit: totalProfit,
        total_sqft_sold: totalSqftSold,
        profit_margin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0
      },
      blocks: {
        by_status: blocksByStatus,
        total: totalBlocks
      },
      parts: partsByName,
      buyers: {
        top_buyers: topBuyers,
        total_buyers: Object.keys(buyerStats).length
      },
      recent_sales: recentSales
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}