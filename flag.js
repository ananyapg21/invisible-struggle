import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'Missing thought id' })

  // Increment flag count — if flagged 3+ times, remove from public view
  const { data: thought, error: fetchError } = await supabase
    .from('thoughts')
    .select('flag_count')
    .eq('id', id)
    .single()

  if (fetchError) return res.status(500).json({ error: fetchError.message })

  const newCount = (thought.flag_count || 0) + 1
  const shouldHide = newCount >= 3

  const { error: updateError } = await supabase
    .from('thoughts')
    .update({
      flagged: shouldHide,
      flag_count: newCount,
      approved: !shouldHide
    })
    .eq('id', id)

  if (updateError) return res.status(500).json({ error: updateError.message })

  return res.status(200).json({ flagged: true, hidden: shouldHide })
}
