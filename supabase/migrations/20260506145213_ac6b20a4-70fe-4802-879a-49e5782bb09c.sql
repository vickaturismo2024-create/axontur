-- Purgar mensajes muertos de invitaciones de equipo en el DLQ transaccional.
-- Estos venían del payload "raw" antiguo que la Email API rechazaba.
DELETE FROM pgmq.q_transactional_emails_dlq
WHERE message->>'label' = 'team_invitation'
   OR message->>'idempotency_key' LIKE 'team-invite-%';