# n8n-nodes-trugen

This package provides an **n8n community node** for interacting with **Trugen** — allowing you to create AI video agents, list stock avatars, and fetch conversation details directly from n8n workflows.

---

## Supported Features

The **Trugen** node exposes the following actions:

- **Create Agent**
  Create and deploy a Trugen video agent with full configuration support (LLM, TTS, STT, callbacks, recording, etc.)

- **Get Stock Avatars**
  Retrieve the list of available Trugen stock avatars

- **Get Conversation**
  Fetch conversation details by ID, with optional polling until completion

---

## Installation

n8n community guidelines provide complete overview of installation and usage steps.

---

## Supported Features

The **Trugen** node contains a single action selector with three actions.

#### 1. Create Agent

Create and deploy a Trugen agent.

Key configuration options include:

* Agent name and system prompt
* Stock or custom avatar selection
* LLM provider and model (OpenAI, Groq, Google)
* STT and TTS configuration
* Greeting message and session timeout
* Recording and webhook callbacks

#### 2. Get Stock Avatars

Returns a list of all available Trugen stock avatars.

No additional parameters are required.

#### 3. Get Conversation

Retrieve details for a conversation by its ID.

Optional:

* Wait until the conversation reaches a `Completed` status before returning

---

## Documentation and Resources

- n8n Community nodes installation [https://docs.n8n.io/integrations/community-nodes/installation][https://docs.n8n.io/integrations/community-nodes/installation]
- Official API Documentation [https://docs.trugen.ai](https://docs.trugen.ai)
- Webhook and callbacks integrations [https://docs.trugen.ai/docs/agents/callback](https://docs.trugen.ai/docs/agents/callback)
- Enabled automted NPN package deployment workflow.


---
