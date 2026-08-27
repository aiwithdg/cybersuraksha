insert into public.suspects (identifier_type, identifier_value, risk_level, source)
values
  ('phone', '+919800001234', 'flagged', 'I4C demo seed data'),
  ('phone', '+919100009876', 'reported', 'user report demo'),
  ('phone', '+918700005555', 'unverified', 'bank alert demo'),
  ('phone', '+916300004321', 'reported', 'state cyber cell demo'),
  ('upi', 'refunddesk-demo@paytm', 'flagged', 'I4C demo seed data'),
  ('upi', 'kyc-helpdesk-demo@ybl', 'reported', 'user report demo'),
  ('upi', 'cashbackclaim-demo@okaxis', 'reported', 'bank alert demo'),
  ('upi', 'support-ticket-demo@upi', 'unverified', 'state cyber cell demo'),
  ('email', 'kyc-alert-demo@example.test', 'flagged', 'I4C demo seed data'),
  ('email', 'lottery-claim-demo@example.test', 'reported', 'user report demo'),
  ('email', 'bankverify-demo@example.test', 'reported', 'bank alert demo'),
  ('email', 'courier-fee-demo@example.test', 'unverified', 'state cyber cell demo'),
  ('url', 'https://secure-kyc-demo.example.test/login', 'flagged', 'I4C demo seed data'),
  ('url', 'https://upi-refund-demo.example.test/claim', 'reported', 'user report demo'),
  ('url', 'https://parcel-fee-demo.example.test/pay', 'unverified', 'bank alert demo')
on conflict (identifier_type, identifier_value) do nothing;
