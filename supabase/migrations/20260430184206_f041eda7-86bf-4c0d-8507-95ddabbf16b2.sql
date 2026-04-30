DO $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  FOR v_msg_id IN SELECT msg_id FROM pgmq.q_transactional_emails LOOP
    PERFORM pgmq.delete('transactional_emails', v_msg_id);
  END LOOP;
END $$;