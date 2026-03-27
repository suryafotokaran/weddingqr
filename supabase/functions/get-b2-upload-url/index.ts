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

    const keyId    = Deno.env.get('B2_KEY_ID')!;
    const appKey   = Deno.env.get('B2_APP_KEY')!;
    const bucketId = Deno.env.get('B2_BUCKET_ID')!;

    if (!keyId || !appKey || !bucketId) {
      return new Response(JSON.stringify({ error: 'BackBlaze B2 not configured on server' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Authorize account
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${appKey}`),
      },
    });

    if (!authRes.ok) {
      const errBody = await authRes.text();
      console.error('B2 authorize error:', errBody);
      return new Response(JSON.stringify({ error: 'Failed to authorize with BackBlaze' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authData    = await authRes.json();
    const apiUrl      = authData.apiInfo?.storageApi?.apiUrl ?? authData.apiUrl;
    const authToken   = authData.authorizationToken;
    const downloadUrl = authData.apiInfo?.storageApi?.downloadUrl ?? authData.downloadUrl;

    // Step 2: Get upload URL for the bucket
    const uploadUrlRes = await fetch(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketId }),
    });

    if (!uploadUrlRes.ok) {
      const errBody = await uploadUrlRes.text();
      console.error('B2 get_upload_url error:', errBody);
      return new Response(JSON.stringify({ error: 'Failed to get B2 upload URL' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uploadUrlData = await uploadUrlRes.json();

    return new Response(JSON.stringify({
      uploadUrl:      uploadUrlData.uploadUrl,
      uploadAuthToken: uploadUrlData.authorizationToken,
      downloadUrl,
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
