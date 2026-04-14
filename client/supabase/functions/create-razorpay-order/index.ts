import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Reject if user already has a paid (non-free-trial) plan
    const { data: existingPlan } = await supabaseAdmin
      .from('user_plans')
      .select('id, plan_key')
      .eq('user_id', user.id)
      .neq('plan_key', 'free_trial')
      .limit(1)
      .single();

    if (existingPlan) {
      return new Response(JSON.stringify({ error: 'You already have an active yearly plan. Only one purchase is allowed.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { plan, amountPaise } = body;

    if (!plan || !amountPaise) {
      return new Response(JSON.stringify({ error: 'Missing required fields: plan, amountPaise' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch plan config from DB (source of truth)
    const { data: planConfig, error: planErr } = await supabaseAdmin
      .from('yearly_plan_configs')
      .select('*')
      .eq('key', plan)
      .eq('is_active', true)
      .single();

    if (planErr || !planConfig) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyId     = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `wqr_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { plan, user_id: user.id },
      }),
    });

    if (!razorpayRes.ok) {
      const errBody = await razorpayRes.text();
      console.error('Razorpay error:', errBody);
      return new Response(JSON.stringify({ error: 'Failed to create Razorpay order' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await razorpayRes.json();

    // Insert pending user_plan record
    await supabaseAdmin.from('user_plans').insert({
      user_id:            user.id,
      plan_key:           plan,
      photos_limit:       planConfig.photos_limit,
      max_image_size_mb:  planConfig.max_image_size_mb,
      duration_days:      planConfig.duration_days,
      amount_paise:       amountPaise,
      razorpay_order_id:  order.id,
      status:             'pending',
      start_date:         new Date().toISOString(),
      end_date:           new Date(Date.now() + planConfig.duration_days * 86400000).toISOString(),
    });

    return new Response(JSON.stringify({
      orderId:      order.id,
      amount:       order.amount,
      currency:     order.currency,
      photosLimit:  planConfig.photos_limit,
      durationDays: planConfig.duration_days,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
