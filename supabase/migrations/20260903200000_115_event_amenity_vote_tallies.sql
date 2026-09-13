-- 115: Amenity vote tallies RPC for attendee-safe aggregates (§13.13 line 469)
-- Returns option_id → count only; no party PII. Hosts always see tallies when enabled.

CREATE OR REPLACE FUNCTION public.get_event_amenity_vote_tallies(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cfg jsonb;
    v_enabled boolean;
    v_closes_at timestamptz;
    v_results_visible text;
    v_closed boolean;
    v_is_manager boolean;
    v_visible boolean;
    v_tallies jsonb := '{}'::jsonb;
    v_total int := 0;
    r record;
BEGIN
    IF p_event_id IS NULL THEN
        RETURN jsonb_build_object(
            'enabled', false,
            'visible', false,
            'closed', false,
            'tallies', '{}'::jsonb,
            'total', 0
        );
    END IF;

    SELECT e.amenity_voting INTO v_cfg
    FROM public.events e
    WHERE e.id = p_event_id;

    IF v_cfg IS NULL THEN
        RETURN jsonb_build_object(
            'enabled', false,
            'visible', false,
            'closed', false,
            'tallies', '{}'::jsonb,
            'total', 0
        );
    END IF;

    v_enabled := COALESCE((v_cfg->>'enabled')::boolean, false)
        AND jsonb_typeof(v_cfg->'options') = 'array'
        AND jsonb_array_length(v_cfg->'options') >= 2;

    IF NOT v_enabled THEN
        RETURN jsonb_build_object(
            'enabled', false,
            'visible', false,
            'closed', false,
            'tallies', '{}'::jsonb,
            'total', 0
        );
    END IF;

    BEGIN
        v_closes_at := NULLIF(btrim(v_cfg->>'closes_at'), '')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
        v_closes_at := NULL;
    END;

    v_results_visible := COALESCE(NULLIF(btrim(v_cfg->>'results_visible'), ''), 'after_close');
    IF v_results_visible NOT IN ('after_close', 'always', 'host_only') THEN
        v_results_visible := 'after_close';
    END IF;

    v_closed := v_closes_at IS NOT NULL AND v_closes_at <= now();
    v_is_manager := public.can_manage_event_party_data(p_event_id);

    IF v_is_manager THEN
        v_visible := true;
    ELSIF v_results_visible = 'host_only' THEN
        v_visible := false;
    ELSIF v_results_visible = 'always' THEN
        v_visible := true;
    ELSE
        -- after_close
        v_visible := v_closed;
    END IF;

    IF v_visible THEN
        FOR r IN
            SELECT p.amenity_vote_option_id AS opt_id, COUNT(*)::int AS cnt
            FROM public.event_parties p
            WHERE p.event_id = p_event_id
              AND p.amenity_vote_status = 'counted'
              AND p.amenity_vote_option_id IS NOT NULL
              AND btrim(p.amenity_vote_option_id) <> ''
            GROUP BY p.amenity_vote_option_id
        LOOP
            v_tallies := v_tallies || jsonb_build_object(r.opt_id, r.cnt);
            v_total := v_total + r.cnt;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'enabled', true,
        'visible', v_visible,
        'closed', v_closed,
        'closes_at', to_jsonb(v_closes_at),
        'results_visible', v_results_visible,
        'tallies', v_tallies,
        'total', v_total
    );
END;
$$;

COMMENT ON FUNCTION public.get_event_amenity_vote_tallies(uuid) IS
    'Aggregate counted amenity votes (option_id → count). Visibility matches amenity_voting.results_visible; hosts via can_manage_event_party_data always see tallies when enabled.';

REVOKE ALL ON FUNCTION public.get_event_amenity_vote_tallies(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_amenity_vote_tallies(uuid) TO anon, authenticated;
