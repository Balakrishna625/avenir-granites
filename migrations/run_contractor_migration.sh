#!/bin/bash

# Script to run contractor payments migration
# Make sure you have psql installed and configured with your Supabase credentials

echo "Running Contractor Payments System Migration..."
echo "================================================"
echo ""

# You can run this migration in one of these ways:
# 
# Option 1: Via Supabase Dashboard
# ---------------------------------
# 1. Go to your Supabase project dashboard
# 2. Click on "SQL Editor" in the left sidebar
# 3. Click "New Query"
# 4. Copy and paste the contents of create_contractor_payments_system.sql
# 5. Click "Run" or press Cmd+Enter
#
# Option 2: Via command line (if you have psql installed)
# --------------------------------------------------------
# Replace the connection string below with your actual Supabase connection string
# You can find it in Supabase Dashboard > Project Settings > Database > Connection string

# Uncomment and modify the line below with your connection details:
# psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f create_contractor_payments_system.sql

echo "Please run this migration using one of the methods above."
echo ""
echo "Migration file: create_contractor_payments_system.sql"
echo ""
echo "After running the migration, you should see:"
echo "  ✓ contractor_payments table created"
echo "  ✓ contractor_payment_transactions table created"
echo "  ✓ Indexes created"
echo "  ✓ Triggers set up"
echo ""
