import type { ModalView } from "@slack/web-api"

export type ChargeModalState = {
  workspace_id: string
  channel_id: string
  charging_slack_user_id: string
  thread_ts: string | null
  add_new_term: { name: string } | null
}

export function buildChargeModal(state: ChargeModalState): ModalView {
  const isAddNew = state.add_new_term !== null
  const blocks: ModalView["blocks"] = [
    {
      type: "input",
      block_id: "charged_user",
      label: { type: "plain_text", text: "Who said it?" },
      element: {
        type: "external_select",
        action_id: "value",
        placeholder: { type: "plain_text", text: "Search teammates" },
        min_query_length: 0,
      },
    },
    {
      type: "input",
      block_id: "jargon_term",
      label: { type: "plain_text", text: "Jargon term" },
      dispatch_action: true,
      element: {
        type: "external_select",
        action_id: "value",
        placeholder: { type: "plain_text", text: "Search or add a new term" },
        min_query_length: 0,
      },
    },
  ]

  if (isAddNew) {
    blocks.push(
      {
        type: "input",
        block_id: "new_term_name",
        label: { type: "plain_text", text: "New term" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          initial_value: state.add_new_term!.name,
          placeholder: { type: "plain_text", text: "e.g. synergy" },
        },
      },
      {
        type: "input",
        block_id: "new_term_cost",
        label: { type: "plain_text", text: "Cost per use ($)" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          initial_value: "1.00",
          placeholder: { type: "plain_text", text: "1.00" },
        },
      }
    )
  }

  return {
    type: "modal",
    callback_id: "charge_modal",
    title: { type: "plain_text", text: "Jargon Jar" },
    submit: {
      type: "plain_text",
      text: isAddNew ? "Charge & save term" : "Charge",
    },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify(state),
    blocks,
  }
}

export function parseChargeModalState(privateMetadata: string | undefined): ChargeModalState {
  const fallback: ChargeModalState = {
    workspace_id: "",
    channel_id: "",
    charging_slack_user_id: "",
    thread_ts: null,
    add_new_term: null,
  }
  if (!privateMetadata) return fallback
  try {
    const parsed = JSON.parse(privateMetadata) as Partial<ChargeModalState>
    return {
      workspace_id: parsed.workspace_id ?? "",
      channel_id: parsed.channel_id ?? "",
      charging_slack_user_id: parsed.charging_slack_user_id ?? "",
      thread_ts: parsed.thread_ts ?? null,
      add_new_term: parsed.add_new_term ?? null,
    }
  } catch {
    return fallback
  }
}
