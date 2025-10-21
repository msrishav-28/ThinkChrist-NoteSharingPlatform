import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { gamificationEngine } from '@/lib/services/gamification'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { vote_type } = await request.json()
    const resourceId = params.id

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check existing vote
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .match({ user_id: user.id, resource_id: resourceId })
      .single()

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .match({ user_id: user.id, resource_id: resourceId })

        // Update resource vote count
        const field = vote_type === 'upvote' ? 'upvotes' : 'downvotes'
        await supabase.rpc(`decrement_${field}`, { resource_id: resourceId })

        return NextResponse.json({ success: true, action: 'removed' })
      } else {
        // Update vote
        await supabase
          .from('votes')
          .update({ vote_type })
          .match({ user_id: user.id, resource_id: resourceId })

        // Update both vote counts
        if (vote_type === 'upvote') {
          await supabase.rpc('increment_upvotes', { resource_id: resourceId })
          await supabase.rpc('decrement_downvotes', { resource_id: resourceId })
        } else {
          await supabase.rpc('decrement_upvotes', { resource_id: resourceId })
          await supabase.rpc('increment_downvotes', { resource_id: resourceId })
        }

        return NextResponse.json({ success: true, action: 'updated' })
      }
    } else {
      // Create new vote
      await supabase
        .from('votes')
        .insert({ user_id: user.id, resource_id: resourceId, vote_type })

      // Update resource vote count
      const field = vote_type === 'upvote' ? 'upvotes' : 'downvotes'
      await supabase.rpc(`increment_${field}`, { resource_id: resourceId })

      // Get resource owner to award them points
      const { data: resource } = await supabase
        .from('resources')
        .select('uploaded_by, resource_type')
        .eq('id', resourceId)
        .single()

      if (resource) {
        // Award points to resource owner for receiving votes
        await gamificationEngine.updateUserProgress(resource.uploaded_by, {
          type: vote_type === 'upvote' ? 'receive_upvote' : 'receive_downvote',
          userId: resource.uploaded_by,
          resourceId: resourceId,
          resourceType: resource.resource_type,
          metadata: {
            voter_id: user.id,
            vote_type: vote_type
          }
        })
      }

      return NextResponse.json({ success: true, action: 'created' })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}