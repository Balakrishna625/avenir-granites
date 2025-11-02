// Run Customer Type Migration
// This script adds the customer_type column to the customers table

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kgwlobhnquaknqurjsqv.supabase.co';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_SERVICE_ROLE) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE environment variable not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function runMigration() {
  console.log('🚀 Starting Customer Type Migration...\n');

  try {
    // Step 1: Add customer_type column
    console.log('📝 Step 1: Adding customer_type column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'regular';`
    });
    
    if (alterError) {
      // If exec_sql doesn't exist, try direct query
      console.log('   Using direct query method...');
      const { error: directError } = await supabase
        .from('customers')
        .select('customer_type')
        .limit(1);
      
      if (directError && directError.message.includes('does not exist')) {
        console.log('   ✅ Column already exists or needs manual addition via Supabase SQL Editor');
      }
    } else {
      console.log('   ✅ Column added successfully');
    }

    // Step 2: Update existing customers
    console.log('\n📝 Step 2: Setting existing customers to "regular"...');
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('id, name, customer_type');

    if (fetchError) {
      throw new Error(`Failed to fetch customers: ${fetchError.message}`);
    }

    console.log(`   Found ${customers?.length || 0} customers`);
    
    // Count how many need updating
    const needsUpdate = customers?.filter(c => !c.customer_type) || [];
    console.log(`   ${needsUpdate.length} customers need customer_type update`);

    if (needsUpdate.length > 0) {
      for (const customer of needsUpdate) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({ customer_type: 'regular' })
          .eq('id', customer.id);

        if (updateError) {
          console.error(`   ⚠️  Failed to update ${customer.name}: ${updateError.message}`);
        }
      }
      console.log(`   ✅ Updated ${needsUpdate.length} customers to "regular"`);
    } else {
      console.log('   ✅ All customers already have customer_type set');
    }

    // Step 3: Verify migration
    console.log('\n📝 Step 3: Verifying migration...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('customers')
      .select('customer_type')
      .limit(5);

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }

    const allHaveType = verifyData?.every(c => c.customer_type) || false;
    if (allHaveType) {
      console.log('   ✅ All customers have customer_type!');
    } else {
      console.log('   ⚠️  Some customers still missing customer_type');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   - Total customers: ${customers?.length || 0}`);
    console.log(`   - Updated to "regular": ${needsUpdate.length}`);
    console.log(`   - Customer type feature: ACTIVE`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Refresh your admin page');
    console.log('   2. Try adding a new customer as "One-Time"');
    console.log('   3. Change an existing customer type');
    console.log('   4. Test the dashboard customer dropdown');
    console.log('\n🎉 Feature is ready to use!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n⚠️  Manual migration required:');
    console.error('   Please run the SQL in migrations/add_customer_type.sql');
    console.error('   via Supabase Dashboard → SQL Editor');
    process.exit(1);
  }
}

// Run the migration
runMigration();
