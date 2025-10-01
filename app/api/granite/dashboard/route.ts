import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    // Get consignments with calculations
    const { data: consignments, error: consignmentsError } = await supabaseAdmin
      .from('granite_consignments')
      .select(`
        *,
        granite_suppliers(name)
      `)
      .order('arrival_date', { ascending: false });

    if (consignmentsError) throw consignmentsError;

    // Get blocks with parts
    const { data: blocks, error: blocksError } = await supabaseAdmin
      .from('granite_blocks')
      .select(`
        *,
        granite_consignments(consignment_number, supplier_id, granite_suppliers(name)),
        granite_block_parts(*)
      `);

    if (blocksError) throw blocksError;

    // Get sales data
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('granite_sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (salesError) throw salesError;

    // Calculate KPIs
    const totalConsignments = consignments?.length || 0;
    const totalProfit = sales?.reduce((sum, sale) => sum + (sale.total_profit || 0), 0) || 0;
    const avgMargin = sales?.length ? (totalProfit / sales.reduce((sum, sale) => sum + (sale.total_selling_price || 0), 0)) * 100 : 0;
    
    const totalProduction = consignments?.reduce((sum, cons) => sum + (cons.total_sqft_produced || 0), 0) || 0;
    const totalBlocks = blocks?.length || 0;
    
    // Cost calculations
    const totalExpenditure = consignments?.reduce((sum, cons) => sum + (cons.total_expenditure || 0), 0) || 0;
    const avgCostPerSqft = totalProduction > 0 ? totalExpenditure / totalProduction : 0;
    const avgSellingRate = sales?.length ? sales.reduce((sum, sale) => sum + (sale.rate_per_sqft || 0), 0) / sales.length : 0;
    
    // Inventory calculations
    const totalInventoryFromParts = blocks?.reduce((sum, block) => {
      return sum + (block.granite_block_parts?.reduce((partSum: number, part: any) => partSum + (part.remaining_sqft || 0), 0) || 0);
    }, 0) || 0;

    // Buyer analytics
    const buyerMap = new Map();
    sales?.forEach(sale => {
      if (!buyerMap.has(sale.buyer_name)) {
        buyerMap.set(sale.buyer_name, {
          name: sale.buyer_name,
          sqftPurchased: 0,
          totalProfit: 0,
          avgRate: 0,
          purchases: 0
        });
      }
      const buyer = buyerMap.get(sale.buyer_name);
      buyer.sqftPurchased += sale.sqft_sold || 0;
      buyer.totalProfit += sale.total_profit || 0;
      buyer.avgRate = (buyer.avgRate * buyer.purchases + (sale.rate_per_sqft || 0)) / (buyer.purchases + 1);
      buyer.purchases += 1;
    });

    const topBuyers = Array.from(buyerMap.values())
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 3);

    // Consignment analytics
    const consignmentAnalytics = consignments?.slice(0, 3).map(cons => ({
      consignment: cons.consignment_number,
      supplier: cons.granite_suppliers?.name || 'Unknown',
      blocks: cons.total_blocks || 0,
      netMeasurement: cons.total_net_measurement || 0,
      totalCost: cons.total_expenditure || 0,
      costPerSqft: cons.raw_material_cost_per_sqft || 0,
      profit: sales?.filter(s => s.consignment_id === cons.id).reduce((sum, sale) => sum + (sale.total_profit || 0), 0) || 0,
      margin: cons.total_sqft_produced > 0 ? ((sales?.filter(s => s.consignment_id === cons.id).reduce((sum, sale) => sum + (sale.total_profit || 0), 0) || 0) / cons.total_expenditure * 100) : 0
    })) || [];

    // Recent sales
    const recentSales = sales?.slice(0, 5).map(sale => ({
      date: sale.sale_date,
      buyer: sale.buyer_name,
      blockPart: `${sale.block_no}${sale.part_name}`,
      sqft: sale.sqft_sold,
      rate: sale.rate_per_sqft,
      profit: sale.total_profit
    })) || [];

    return Response.json({
      totalConsignments,
      totalProfit,
      avgMargin,
      totalProduction,
      totalBlocks,
      avgCostPerSqft,
      avgSellingRate,
      totalInventory: totalInventoryFromParts,
      activeBlocks: blocks?.filter(b => b.status !== 'SOLD').length || 0,
      consignmentAnalytics,
      topBuyers,
      recentSales
    });

  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}