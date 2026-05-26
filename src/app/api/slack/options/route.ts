import { NextResponse } from "next/server"
import { getWorkspaceBySlackTeamId } from "@/lib/db/queries"
import { verifySlackRequest } from "@/lib/slack/security"
import {
  buildMemberOptions,
  buildTermOptions,
  type OptionsBlockId,
} from "@/lib/slack/options"

type BlockSuggestionPayload = {
  type: "block_suggestion"
  team: { id: string }
  block_id: OptionsBlockId | string
  action_id: string
  value: string
}

export async function POST(request: Request) {
  const body = await request.text()
  if (!verifySlackRequest(request, body)) {
    return new Response("Invalid request signature", { status: 401 })
  }

  const formData = new URLSearchParams(body)
  const payloadString = formData.get("payload")
  if (!payloadString) return NextResponse.json({ options: [] })
  const payload = JSON.parse(payloadString) as BlockSuggestionPayload
  if (payload.type !== "block_suggestion") return NextResponse.json({ options: [] })

  const workspace = await getWorkspaceBySlackTeamId(payload.team.id)
  if (!workspace) return NextResponse.json({ options: [] })

  const query = payload.value ?? ""

  if (payload.block_id === "charged_user") {
    const options = await buildMemberOptions(workspace, query)
    return NextResponse.json({ options })
  }

  if (payload.block_id === "jargon_term") {
    const options = await buildTermOptions(workspace, query)
    return NextResponse.json({ options })
  }

  return NextResponse.json({ options: [] })
}
