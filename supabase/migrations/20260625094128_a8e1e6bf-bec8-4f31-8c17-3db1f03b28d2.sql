
-- 1) Pin search_path on email queue helpers
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

-- 2) Realtime topic-scoped subscription policies
DROP POLICY IF EXISTS realtime_swipes_participant ON realtime.messages;
CREATE POLICY realtime_swipes_participant ON realtime.messages
FOR SELECT TO authenticated
USING (
  (extension = 'postgres_changes')
  AND (topic LIKE 'realtime:public:swipes:%')
  AND (
    (topic LIKE 'realtime:public:swipes:swiper_id=eq.%'
      AND (substring(topic, 'swiper_id=eq\.([0-9a-fA-F-]{36})'))::uuid = auth.uid())
    OR
    (topic LIKE 'realtime:public:swipes:swiped_id=eq.%'
      AND (substring(topic, 'swiped_id=eq\.([0-9a-fA-F-]{36})'))::uuid = auth.uid())
  )
);

DROP POLICY IF EXISTS realtime_user_settings_owner ON realtime.messages;
CREATE POLICY realtime_user_settings_owner ON realtime.messages
FOR SELECT TO authenticated
USING (
  (extension = 'postgres_changes')
  AND (topic LIKE 'realtime:public:user_settings:user_id=eq.%')
  AND ((substring(topic, 'user_id=eq\.([0-9a-fA-F-]{36})'))::uuid = auth.uid())
);

-- 3) Admin can review verification requests via Data API
DROP POLICY IF EXISTS "Admins can view verification requests" ON public.verification_requests;
CREATE POLICY "Admins can view verification requests" ON public.verification_requests
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
