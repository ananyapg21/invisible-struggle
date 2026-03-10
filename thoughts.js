import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('thoughts')
      .select('id, text, created_at')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { text } = req.body
    if (!text || text.trim().length < 5 || text.trim().length > 140) {
      return res.status(400).json({ error: 'Text must be between 5 and 140 characters.' })
    }

    // Basic profanity / crisis keyword guard — flag for review instead of auto-approving
    const sensitiveKeywords = ['kill myself', 'suicide', 'end my life', 'want to die']
    const needsReview = sensitiveKeywords.some(kw => text.toLowerCase().includes(kw))

    const { data, error } = await supabase
      .from('thoughts')
      .insert([{
        text: text.trim(),
        approved: !needsReview,   // auto-approve clean thoughts, hold sensitive ones
        flagged: false,
        needs_review: needsReview
      }])
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    if (needsReview) {
      return res.status(200).json({
        message: 'received',
        note: 'Your thought has been received and will appear shortly after a quick review.'
      })
    }

    return res.status(201).json(data)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
