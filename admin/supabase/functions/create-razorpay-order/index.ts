import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan configs: photos_limit + storage_gb for each named plan
const PLAN_CONFIGS: Record<string, { photosLimit: number; storageGb: number }> = {
  basic:   { photosLimit: 500,  storageGb: 5  },
  pro:     { photosLimit: 1000, storageGb: 10 },
  premium: { photosLimit: 2000, storageGb: 20 },
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

    const body = await req.json();
    const { plan, amountPaise, photosLimit: customPhotosLimit, customLabel, eventId } = body;

    if (!plan || !amountPaise) {
      return new Response(JSON.stringify({ error: 'Missing required fields: plan, amountPaise' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const planConfig = PLAN_CONFIGS[plan];
    const finalPhotosLimit = customPhotosLimit ?? planConfig?.photosLimit ?? 500;
    const finalStorageGb   = planConfig?.storageGb ?? Math.ceil(finalPhotosLimit * 0.01);

    const keyId     = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: `wqr_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          plan,
          user_id: user.id,
          ...(eventId ? { event_id: eventId } : {}),
          ...(customLabel ? { custom_label: customLabel } : {}),
        },
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabaseAdmin.from('purchases').insert({
      user_id:           user.id,
      plan,
      quantity:          1,
      events_granted:    9999,
      photos_limit:      finalPhotosLimit,
      storage_gb:        finalStorageGb,
      amount_paise:      amountPaise,
      razorpay_order_id: order.id,
      status:            'pending',
      ...(customLabel ? { custom_label: customLabel } : {}),
    });

    return new Response(JSON.stringify({
      orderId:     order.id,
      amount:      order.amount,
      currency:    order.currency,
      photosLimit: finalPhotosLimit,
      storageGb:   finalStorageGb,
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
