import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const token = authHeader?.replace('Bearer ', '')
    if (!token) throw new Error('Missing token')

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { loan_id, amount, payment_method } = await req.json()

    const { data: loan, error: loanError } = await adminClient
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .single()

    if (loanError || !loan) throw new Error('Loan not found')
    if (loan.borrower_id !== user.id) throw new Error('Only the borrower can repay')

    const repayAmount = parseFloat(amount)
    const newRemaining = Number(loan.remaining_amount) - repayAmount
    const newStatus = newRemaining <= 0 ? 'completed' : loan.status

    // Record Repayment
    await adminClient.from('loan_repayments').insert({
      loan_id: loan.id, amount: repayAmount, payment_method, payer_id: user.id
    })

    // Update Loan
    await adminClient.from('loans').update({
      remaining_amount: newRemaining,
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', loan_id)

    // CHANGE 4: Auto-create transactions on repayment

    const { data: bProfileData } = await adminClient.from('profiles').select('name').eq('user_id', loan.borrower_id).single()
    const { data: lProfileData } = await adminClient.from('profiles').select('name').eq('user_id', loan.lender_id).single()

    const loanIdShort = loan.id.substring(0, 8)
    
    await adminClient.from('transactions').insert([
      {
        user_id: loan.borrower_id,
        type: 'expense',
        category: 'loan_repayment',
        amount: repayAmount,
        payment_method: payment_method,
        note: `Loan repayment to ${lProfileData?.name || 'Lender'} (Loan #${loanIdShort})`,
        date_time: new Date().toISOString(),
        source: 'loan_repayment',
        source_id: loan.id
      },
      {
        user_id: loan.lender_id,
        type: 'income',
        category: 'loan_repayment',
        amount: repayAmount,
        payment_method: payment_method,
        note: `Loan repayment from ${bProfileData?.name || 'Borrower'} (Loan #${loanIdShort})`,
        date_time: new Date().toISOString(),
        source: 'loan_repayment',
        source_id: loan.id
      }
    ])


    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
