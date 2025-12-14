-- Add message grouping fields to pending_expenses table
-- This allows grouping multiple messages (photos + text) into one expense

ALTER TABLE pending_expenses
  ADD COLUMN sender_phone TEXT, -- WhatsApp number of sender
  ADD COLUMN message_group_id UUID, -- Groups related messages together
  ADD COLUMN message_sequence INTEGER DEFAULT 1, -- Order within group (1=first, 2=second, etc.)
  ADD COLUMN is_primary BOOLEAN DEFAULT true; -- Primary message in group (has the main data)

-- Index for finding recent messages from same sender
CREATE INDEX idx_pending_expenses_sender_created 
  ON pending_expenses(sender_phone, created_at DESC);

-- Index for grouping
CREATE INDEX idx_pending_expenses_group_id 
  ON pending_expenses(message_group_id);

COMMENT ON COLUMN pending_expenses.sender_phone IS 'WhatsApp number of message sender (e.g., whatsapp:+919843986320)';
COMMENT ON COLUMN pending_expenses.message_group_id IS 'UUID linking related messages (e.g., 3 photos + 1 text = same group)';
COMMENT ON COLUMN pending_expenses.message_sequence IS 'Order of message in group: 1=first photo, 2=second photo, 3=text description';
COMMENT ON COLUMN pending_expenses.is_primary IS 'True for the main expense record (others are attachments)';
