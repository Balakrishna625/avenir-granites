-- =============================================
-- DATABASE DIAGNOSTIC SCRIPT
-- Date: 2025-10-06
-- Purpose: Find out exactly what triggers exist and what might be causing the error
-- =============================================

-- 1. Check all triggers on granite tables
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event_type,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('granite_blocks', 'granite_block_parts', 'granite_consignments')
ORDER BY event_object_table, trigger_name;

-- 2. Check if there are any functions that reference consignment_id
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%consignment_id%'
AND routine_type = 'FUNCTION';

-- 3. Check the structure of granite_block_parts table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated
FROM information_schema.columns
WHERE table_name = 'granite_block_parts'
ORDER BY ordinal_position;

-- 4. Check if there are any views or other objects that might have triggers
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name LIKE '%granite%';

-- Run these queries to understand what's in your database right now