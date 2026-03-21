import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic';

// Helper function to extract base block name (AVG-1A -> AVG-1)
// Special case: if block already ends with A or B, keep it as-is (exact matching)
function extractBaseBlockName(blockName: string): string {
  // Check if the block name ends with 'A' or 'B' (these are pre-split blocks from quarry)
  if (/[AB]$/i.test(blockName)) {
    return blockName // Keep as-is for exact matching
  }
  // For other blocks, strip the trailing letter for grouping
  return blockName.replace(/[A-Z]$/i, '')
}

// Helper function to check if a production part matches a consignment block
function matchesBlock(productionPartName: string, consignmentBlockName: string): boolean {
  // If consignment block ends with A or B, require exact match
  if (/[AB]$/i.test(consignmentBlockName)) {
    return productionPartName === consignmentBlockName
  }
  // Otherwise, match by base name (strip trailing letter from production part)
  const baseProductionName = productionPartName.replace(/[A-Z]$/i, '')
  return baseProductionName === consignmentBlockName
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const consignmentId = searchParams.get('id')

    if (!consignmentId) {
      return NextResponse.json(
        { error: 'Consignment ID is required' },
        { status: 400 }
      )
    }

    // 1. Get consignment details with blocks
    const { data: consignment, error: consignmentError } = await supabaseAdmin
      .from('granite_consignments')
      .select(`
        id,
        consignment_number,
        quarry_name,
        purchase_date,
        total_blocks_count,
        net_measurement,
        total_net_measurement,
        total_gross_measurement,
        purchase_cost,
        purchase_cost_rate,
        production_cost_per_sqft,
        transport_cost,
        loading_cost,
        quarry_commission,
        other_charges,
        total_expenditure,
        granite_blocks (
          id,
          block_no,
          net_measurement,
          gross_measurement
        )
      `)
      .eq('id', consignmentId)
      .single()

    if (consignmentError || !consignment) {
      return NextResponse.json(
        { error: 'Consignment not found' },
        { status: 404 }
      )
    }

    // 2. Extract all block names from this consignment
    const blockNames = consignment.granite_blocks?.map((block: any) => block.block_no) || []

    if (blockNames.length === 0) {
      return NextResponse.json({
        consignment,
        production: {
          totalSlabs: 0,
          totalSqft: 0,
          blockDetails: [],
          costPerSqft: 0,
          revenuePerSqft: 0, // Can be calculated if you have pricing
          profitMargin: 0
        }
      })
    }

    // 3. Get multi-cutter production data for these blocks
    // We need to look for blocks and their parts (AVG-1, AVG-1A, AVG-1B, etc.)
    const { data: multiCutterReports, error: mcError } = await supabaseAdmin
      .from('multi_cutter_reports')
      .select('date, machine, blocks')

    if (mcError) {
      console.error('Error fetching multi-cutter data:', mcError)
      return NextResponse.json(
        { error: 'Failed to fetch production data' },
        { status: 500 }
      )
    }

    // 4. Process multi-cutter data to match consignment blocks
    const productionByBlock: Record<string, {
      baseBlockName: string
      parts: Array<{
        partName: string
        slabs: number
        sqft: number
        materialType: string
        date?: string
      }>
      totalSlabs: number
      totalSqft: number
      originalMeasurement: number
    }> = {}

    // Initialize with consignment blocks
    consignment.granite_blocks?.forEach((block: any) => {
      productionByBlock[block.block_no] = {
        baseBlockName: block.block_no,
        parts: [],
        totalSlabs: 0,
        totalSqft: 0,
        originalMeasurement: block.gross_measurement || 0
      }
    })

    // Parse multi-cutter data
    multiCutterReports?.forEach((report: any) => {
      if (!report.blocks || !Array.isArray(report.blocks)) return

      report.blocks.forEach((blockData: any) => {
        const fullBlockName = blockData.block_name
        if (!fullBlockName) return

        // Find which consignment block this production part belongs to
        const matchingBlockName = blockNames.find(blockName => 
          matchesBlock(fullBlockName, blockName)
        )

        if (matchingBlockName) {
          if (!productionByBlock[matchingBlockName]) {
            productionByBlock[matchingBlockName] = {
              baseBlockName: matchingBlockName,
              parts: [],
              totalSlabs: 0,
              totalSqft: 0,
              originalMeasurement: 0
            }
          }

          const slabs = parseInt(blockData.slabs) || 0
          const sqft = parseFloat(blockData.sqft) || 0

          productionByBlock[matchingBlockName].parts.push({
            partName: fullBlockName,
            slabs,
            sqft,
            materialType: blockData.material_type || 'Unknown',
            date: report.date
          })

          productionByBlock[matchingBlockName].totalSlabs += slabs
          productionByBlock[matchingBlockName].totalSqft += sqft
        }
      })
    })

    // 5. Calculate overall statistics
    const blockDetails = Object.values(productionByBlock)
    const totalSlabs = blockDetails.reduce((sum, block) => sum + block.totalSlabs, 0)
    const totalSqft = blockDetails.reduce((sum, block) => sum + block.totalSqft, 0)
    const totalExpenditure = consignment.total_expenditure || 0
    const costPerSqft = totalSqft > 0 ? totalExpenditure / totalSqft : 0

    // Sort blocks intelligently (natural sort: AVG-SL-1, AVG-SL-2, ... AVG-SL-10)
    blockDetails.sort((a, b) => {
      const parseBlockName = (name: string) => {
        const match = name.match(/^([A-Z]+-[A-Z]+)-(\d+)([A-Z])?$/i)
        if (match) {
          return {
            prefix: match[1],
            number: parseInt(match[2]),
            suffix: match[3] || ''
          }
        }
        return { prefix: name, number: 0, suffix: '' }
      }
      
      const aParsed = parseBlockName(a.baseBlockName)
      const bParsed = parseBlockName(b.baseBlockName)
      
      // Compare prefix first
      if (aParsed.prefix !== bParsed.prefix) {
        return aParsed.prefix.localeCompare(bParsed.prefix)
      }
      // Then compare number numerically
      if (aParsed.number !== bParsed.number) {
        return aParsed.number - bParsed.number
      }
      // Finally compare suffix
      return aParsed.suffix.localeCompare(bParsed.suffix)
    })

    return NextResponse.json({
      consignment: {
        id: consignment.id,
        consignmentNumber: consignment.consignment_number,
        quarryName: consignment.quarry_name,
        purchaseDate: consignment.purchase_date,
        totalBlocks: consignment.total_blocks_count,
        totalNetMeasurement: consignment.net_measurement || consignment.total_net_measurement,
        totalGrossMeasurement: consignment.total_gross_measurement,
        totalExpenditure: consignment.total_expenditure,
        costBreakdown: {
          purchaseCost: consignment.purchase_cost,
          transportCost: consignment.transport_cost,
          loadingCost: consignment.loading_cost,
          quarryCommission: consignment.quarry_commission,
          otherCharges: consignment.other_charges
        }
      },
      production: {
        totalSlabs,
        totalSqft,
        blockDetails,
        costPerSqft,
        processingEfficiency: (consignment.net_measurement || consignment.total_net_measurement) > 0 
          ? (totalSqft / ((consignment.net_measurement || consignment.total_net_measurement) * 10.764)) * 100 // Convert m to sqft
          : 0
      }
    })

  } catch (error) {
    console.error('Error in consignment analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
