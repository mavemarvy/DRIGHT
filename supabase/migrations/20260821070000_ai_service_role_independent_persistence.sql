BEGIN;

CREATE OR REPLACE FUNCTION public.record_ai_response(
  p_request_id uuid,
  p_conversation_id uuid,
  p_provider text,
  p_model text,
  p_task_type text,
  p_content text DEFAULT NULL,
  p_input_tokens integer DEFAULT NULL,
  p_output_tokens integer DEFAULT NULL,
  p_estimated_cost numeric DEFAULT NULL,
  p_latency_ms integer DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller uuid := (SELECT auth.uid());
  message_id uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = p_conversation_id AND c.user_id = caller AND c.status <> 'deleted'
  ) THEN
    RAISE EXCEPTION 'conversation_not_owned' USING ERRCODE = '42501';
  END IF;

  IF p_success AND COALESCE(p_content, '') <> '' THEN
    INSERT INTO public.ai_messages (
      conversation_id, user_id, role, content, provider, model,
      input_tokens, output_tokens, latency_ms, status, metadata
    ) VALUES (
      p_conversation_id, caller, 'assistant', p_content, p_provider, p_model,
      p_input_tokens, p_output_tokens, p_latency_ms, 'completed',
      jsonb_build_object('requestId', p_request_id)
    )
    RETURNING id INTO message_id;

    UPDATE public.ai_conversations
    SET summary = left(p_content, 1000), updated_at = now()
    WHERE id = p_conversation_id AND user_id = caller;
  END IF;

  INSERT INTO public.ai_usage (
    request_id, user_id, conversation_id, provider, model, task_type,
    input_tokens, output_tokens, estimated_cost, latency_ms, success, error_code
  ) VALUES (
    p_request_id, caller, p_conversation_id, p_provider, p_model, p_task_type,
    p_input_tokens, p_output_tokens, p_estimated_cost, p_latency_ms,
    p_success, p_error_code
  )
  ON CONFLICT (request_id) DO UPDATE SET
    provider = EXCLUDED.provider,
    model = EXCLUDED.model,
    success = EXCLUDED.success,
    error_code = EXCLUDED.error_code,
    input_tokens = EXCLUDED.input_tokens,
    output_tokens = EXCLUDED.output_tokens,
    estimated_cost = EXCLUDED.estimated_cost,
    latency_ms = EXCLUDED.latency_ms;

  RETURN message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_ai_response(uuid,uuid,text,text,text,text,integer,integer,numeric,integer,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ai_response(uuid,uuid,text,text,text,text,integer,integer,numeric,integer,boolean,text) TO authenticated;

COMMIT;
