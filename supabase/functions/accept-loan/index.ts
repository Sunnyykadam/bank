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

    // Using adminClient to verify user directly via the token
    const token = authHeader?.replace('Bearer ', '')
    if (!token) throw new Error('Missing token in request')

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) throw new Error(`Auth Error: Token invalid - ${authError?.message || 'No user'}`)

    const { loan_id } = await req.json()

    // Fetch loan
    const { data: loan, error: loanError } = await adminClient
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .single()

    if (loanError || !loan) throw new Error('Loan not found')
    
    // THE UNAUTHORIZED CHECK
    if (loan.recipient_id !== user.id) {
       throw new Error(`Unauthorized! Only the recipient can accept this request.`)
    }

    if (loan.status !== 'pending') throw new Error('Loan is already active or rejected')

    // CHANGE 1 & 8: Assign roles
    // Requester is ALWAYS the borrower, Recipient is ALWAYS the lender
    const borrower_id = loan.requester_id
    const lender_id = loan.recipient_id

    // CHANGE 2 & 7: Balance check & update
    const balanceField = loan.payment_method === 'cash' ? 'cash_balance' : 'bank_balance'
    
    // Fetch lender's balance
    const { data: lenderProfile, error: lenderError } = await adminClient
      .from('profiles')
      .select('name, ' + balanceField)
      .eq('user_id', lender_id)
      .single()

    if (lenderError || !lenderProfile) throw new Error('Could not verify lender balance')
    
    const availableBalance = Number(lenderProfile[balanceField]) || 0
    if (availableBalance < loan.amount) {
      throw new Error(`Lender has insufficient ${loan.payment_method} balance (available: ₹${availableBalance.toLocaleString('en-IN')})`)
    }

    // Update loan status
    const { error: updateError } = await adminClient

      .from('loans')
      .update({ 
        status: 'active', 
        borrower_id, 
        lender_id, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', loan_id)

    if (updateError) throw updateError

    // CHANGE 3: Auto-create transactions for both users
    const { data: borrowerProfile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('user_id', borrower_id)
      .single()

    const loanIdShort = loan.id.substring(0, 8)
    const lenderNote = `Loan given to ${borrowerProfile?.name || 'Borrower'} (Loan #${loanIdShort})`
    const borrowerNote = `Loan received from ${lenderProfile?.name || 'Lender'} (Loan #${loanIdShort})`

    const { error: txError } = await adminClient
      .from('transactions')
      .insert([
        {
          user_id: lender_id,
          type: 'expense',
          category: 'loan',
          amount: loan.amount,
          payment_method: loan.payment_method,
          note: lenderNote,
          date_time: new Date().toISOString(),
          source: 'loan',
          source_id: loan.id
        },
        {
          user_id: borrower_id,
          type: 'income',
          category: 'loan',
          amount: loan.amount,
          payment_method: loan.payment_method,
          note: borrowerNote,
          date_time: new Date().toISOString(),
          source: 'loan',
          source_id: loan.id
        }
      ])

    if (txError) throw txError


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

