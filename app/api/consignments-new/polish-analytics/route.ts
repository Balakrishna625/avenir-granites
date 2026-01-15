import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Normalize block names to improve matching across systems
function normalizeBlockName(name?: string): string {
  if (!name) return ''
  let n = name.trim().toUpperCase()
  // Replace common separators with '-'
  n = n.replace(/[\s_]+/g, '-')
  // Ensure single hyphens
  n = n.replace(/-+/g, '-')
  // Normalize known quarry codes spacing (AVG SL 12A -> AVG-SL-12A)
  n = n.replace(/^(AVG)-(SL|GK|SJ)/, '$1-$2')
  n = n.replace(/^AVG(SL|GK|SJ)/, 'AVG-$1')
  // Remove trailing dots
  n = n.replace(/\.$/, '')
  return n
}

// Helper function to extract base block name (AVG-1A -> AVG-1)
function extractBaseBlockName(blockName: string): string {
  if (/[AB]$/i.test(blockName)) {
    return blockName
  }
  return blockName.replace(/[A-Z]$/i, '')
}

// Helper function to check if a production part matches a consignment block
function matchesBlock(productionPartName: string, consignmentBlockName: string): boolean {
  // Normalize both names to uppercase for case-insensitive comparison
  const prodName = productionPartName.toUpperCase()
  const consName = consignmentBlockName.toUpperCase()
  
  // If consignment block name ends with a letter (like AVG-GK-1A), require exact match
  if (/[AB]$/i.test(consignmentBlockName)) {
    return prodName === consName
  }
  
  // Otherwise, check if production part starts with consignment block name
  // Example: AVG-GK matches AVG-GK-1A, AVG-GK-8C, AVG-GK-11B
  return prodName.startsWith(consName + '-') || prodName === consName
}

// Helper to determine if activity is polish or laputra
function categorizePolishActivity(activity: string): 'polished' | 'laputra' | 'other' {
  const activityLower = activity.toLowerCase()
  
  // Exclude grinding activities (they're preparatory, not final polish)
  if (activityLower.includes('grinding')) {
    return 'other'
  }
  
  // Check for laputra polish
  if (activityLower.includes('laputra')) {
    return 'laputra'
  }
  
  // Check for regular polish
  if (activityLower.includes('polish')) {
    return 'polished'
  }
  
  return 'other'
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
        consignment: {
          id: consignment.id,
          consignmentNumber: consignment.consignment_number,
          quarryName: consignment.quarry_name,
          purchaseDate: consignment.purchase_date,
          totalBlocks: consignment.total_blocks_count,
          totalNetMeasurement: consignment.total_net_measurement,
          totalGrossMeasurement: consignment.total_gross_measurement
        },
        polishData: {
          totalSlabs: 0,
          totalSqft: 0,
          polishedSlabs: 0,
          polishedSqft: 0,
          laputraSlabs: 0,
          laputraSqft: 0,
          blockDetails: []
        }
      })
    }

    // 3. Get multi-cutter data FIRST (as reference for mapping)
    const { data: multiCutterReports, error: mcError } = await supabaseAdmin
      .from('multi_cutter_reports')
      .select('date, machine, blocks')

    if (mcError) {
      console.error('Error fetching multi-cutter data:', mcError)
      return NextResponse.json(
        { error: 'Failed to fetch multi-cutter data' },
        { status: 500 }
      )
    }

    // 4. Build mapping: line_polish_block_name → consignment_block_name
    // Using multi-cutter notes as the bridge
    const linePolishToConsignmentMap: Record<string, string> = {}
    
    console.log('🔍 Building mapping for consignment blocks:', blockNames)
    
    multiCutterReports?.forEach((report: any) => {
      if (!report.blocks || !Array.isArray(report.blocks)) return

      report.blocks.forEach((blockData: any) => {
        const mcBlockNameRaw = blockData.block_name // e.g., AVG-SL-12A
        const mcNotesRaw = blockData.notes?.trim() // e.g., AVG-1329A (quarry owner's serial)
        const mcBlockName = normalizeBlockName(mcBlockNameRaw)
        const mcNotes = normalizeBlockName(mcNotesRaw)
        
        if (!mcBlockName) return

        // Find which consignment block this multi-cutter block belongs to
        const matchingConsignmentBlock = blockNames.find(blockName => 
          matchesBlock(mcBlockName, normalizeBlockName(blockName))
        )

        if (matchingConsignmentBlock) {
          // Map both: the MC block name AND the notes (if exists) to the consignment block
          linePolishToConsignmentMap[mcBlockName.toUpperCase()] = matchingConsignmentBlock
          
          if (mcNotes && mcNotes !== '') {
            // The notes contain quarry owner's serial - this is what line polish workers use!
            linePolishToConsignmentMap[mcNotes.toUpperCase()] = matchingConsignmentBlock
            // Also map base without trailing letter (AVG-1329 -> AVG-1329A/B)
            const base = mcNotes.replace(/[A-Z]$/i, '')
            if (base && base !== mcNotes) {
              linePolishToConsignmentMap[base.toUpperCase()] = matchingConsignmentBlock
            }
          }
          
          // Also create a fallback mapping by stripping the quarry code
          // E.g., AVG-GK-1A → AVG-1A (in case line polish uses this format)
          const withoutQuarryCode = mcBlockName.replace(/^(AVG)-(SL|GK|SJ)-/i, '$1-')
          if (withoutQuarryCode !== mcBlockName) {
            linePolishToConsignmentMap[withoutQuarryCode.toUpperCase()] = matchingConsignmentBlock
          }
          // And map base without trailing letter
          const mcBase = mcBlockName.replace(/[A-Z]$/i, '')
          if (mcBase && mcBase !== mcBlockName) {
            linePolishToConsignmentMap[mcBase.toUpperCase()] = matchingConsignmentBlock
          }
        }
      })
    })
    
    console.log('📋 Line Polish to Consignment mapping:', linePolishToConsignmentMap)
    console.log('📊 Total mappings created:', Object.keys(linePolishToConsignmentMap).length)

    // 5. Get line polish reports
    const { data: linePolishReports, error: lpError } = await supabaseAdmin
      .from('line_polish_reports')
      .select('date, shift, activities')
      .not('activities', 'is', null)

    if (lpError) {
      console.error('Error fetching line polish data:', lpError)
      return NextResponse.json(
        { error: 'Failed to fetch polish data' },
        { status: 500 }
      )
    }

    // 6. Process line polish data using the mapping
    const polishByBlock: Record<string, {
      baseBlockName: string
      parts: Array<{
        partName: string
        slabs: number
        sqft: number
        polishType: 'polished' | 'laputra'
        activityDetail: string
        date?: string
      }>
      totalSlabs: number
      totalSqft: number
      polishedSlabs: number
      polishedSqft: number
      laputraSlabs: number
      laputraSqft: number
      originalMeasurement: number
    }> = {}

    // Initialize with consignment blocks
    consignment.granite_blocks?.forEach((block: any) => {
      polishByBlock[block.block_no] = {
        baseBlockName: block.block_no,
        parts: [],
        totalSlabs: 0,
        totalSqft: 0,
        polishedSlabs: 0,
        polishedSqft: 0,
        laputraSlabs: 0,
        laputraSqft: 0,
        originalMeasurement: block.gross_measurement || 0
      }
    })

    // Parse line polish data using the mapping
    linePolishReports?.forEach((report: any) => {
      if (!report.activities || !Array.isArray(report.activities)) return

      report.activities.forEach((activity: any) => {
        const lpBlockNameRaw = activity.block_name
        const lpBlockName = normalizeBlockName(lpBlockNameRaw)
        if (!lpBlockName) return

        // Look up which consignment block this line polish activity belongs to
        // Using the mapping we built from multi-cutter data
        let matchingConsignmentBlock = linePolishToConsignmentMap[lpBlockName.toUpperCase()]
        if (!matchingConsignmentBlock) {
          // Try base without trailing letter (AVG-1329)
          const base = lpBlockName.replace(/[A-Z]$/i, '').toUpperCase()
          matchingConsignmentBlock = linePolishToConsignmentMap[base]
        }
        if (!matchingConsignmentBlock) {
          // Try stripping quarry code (AVG-1A)
          const withoutQuarry = lpBlockName.replace(/^(AVG)-(SL|GK|SJ)-/i, '$1-').toUpperCase()
          matchingConsignmentBlock = linePolishToConsignmentMap[withoutQuarry]
        }

        if (matchingConsignmentBlock) {
          const polishCategory = categorizePolishActivity(activity.activity)
          
          // Only include actual polish activities (exclude grinding)
          if (polishCategory === 'polished' || polishCategory === 'laputra') {
            if (!polishByBlock[matchingConsignmentBlock]) {
              polishByBlock[matchingConsignmentBlock] = {
                baseBlockName: matchingConsignmentBlock,
                parts: [],
                totalSlabs: 0,
                totalSqft: 0,
                polishedSlabs: 0,
                polishedSqft: 0,
                laputraSlabs: 0,
                laputraSqft: 0,
                originalMeasurement: 0
              }
            }

            const slabs = Number(activity.slabs) || 0
            const sqft = Number(activity.sqft) || 0

            polishByBlock[matchingConsignmentBlock].parts.push({
              partName: lpBlockName, // Show the actual line polish block name
              slabs,
              sqft,
              polishType: polishCategory,
              activityDetail: activity.activity,
              date: report.date
            })

            polishByBlock[matchingConsignmentBlock].totalSlabs += slabs
            polishByBlock[matchingConsignmentBlock].totalSqft += sqft

            if (polishCategory === 'polished') {
              polishByBlock[matchingConsignmentBlock].polishedSlabs += slabs
              polishByBlock[matchingConsignmentBlock].polishedSqft += sqft
            } else if (polishCategory === 'laputra') {
              polishByBlock[matchingConsignmentBlock].laputraSlabs += slabs
              polishByBlock[matchingConsignmentBlock].laputraSqft += sqft
            }
          }
        }
      })
    })

    // 7. Calculate totals
    const blockDetails = Object.values(polishByBlock).filter(block => block.parts.length > 0)
    
    let totalSlabs = 0
    let totalSqft = 0
    let polishedSlabs = 0
    let polishedSqft = 0
    let laputraSlabs = 0
    let laputraSqft = 0

    blockDetails.forEach(block => {
      totalSlabs += block.totalSlabs
      totalSqft += block.totalSqft
      polishedSlabs += block.polishedSlabs
      polishedSqft += block.polishedSqft
      laputraSlabs += block.laputraSlabs
      laputraSqft += block.laputraSqft
    })

    return NextResponse.json({
      consignment: {
        id: consignment.id,
        consignmentNumber: consignment.consignment_number,
        quarryName: consignment.quarry_name,
        purchaseDate: consignment.purchase_date,
        totalBlocks: consignment.total_blocks_count,
        totalNetMeasurement: consignment.total_net_measurement,
        totalGrossMeasurement: consignment.total_gross_measurement
      },
      polishData: {
        totalSlabs,
        totalSqft,
        polishedSlabs,
        polishedSqft,
        laputraSlabs,
        laputraSqft,
        blockDetails
      }
    })

  } catch (error) {
    console.error('Error in consignment polish analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
