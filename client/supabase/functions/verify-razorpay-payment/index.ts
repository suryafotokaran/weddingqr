import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { encode as hexEncode } from 'https://deno.land/std@0.168.0/encoding/hex.ts';

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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify HMAC-SHA256 signature
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const bodyStr   = `${razorpay_order_id}|${razorpay_payment_id}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC', key, new TextEncoder().encode(bodyStr)
    );

    const computedHex = new TextDecoder().decode(
      hexEncode(new Uint8Array(signatureBytes))
    );

    if (computedHex !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Payment signature verification failed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update user_plan: mark as active, set payment ID and dates
    const { data: userPlan, error: updateError } = await supabaseAdmin
      .from('user_plans')
      .update({
        razorpay_payment_id,
        status:     'active',
        start_date: new Date().toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !userPlan) {
      console.error('DB update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the end_date based on actual start_date
    const endDate = new Date(
      new Date(userPlan.start_date).getTime() + userPlan.duration_days * 86400000
    ).toISOString();

    await supabaseAdmin
      .from('user_plans')
      .update({ end_date: endDate })
      .eq('id', userPlan.id);

    return new Response(JSON.stringify({
      success:      true,
      planId:       userPlan.id,
      planKey:      userPlan.plan_key,
      photosLimit:  userPlan.photos_limit,
      durationDays: userPlan.duration_days,
      endDate,
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
