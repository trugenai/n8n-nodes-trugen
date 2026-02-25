import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	IDataObject,
	JsonObject,
	NodeApiError,
	sleep,
} from 'n8n-workflow';

const trugenHelpers = {
	formatResponse(responseData: unknown): JsonObject {
		let formatted: unknown = responseData;

		if (typeof formatted === 'string') {
			try {
				formatted = JSON.parse(formatted);
			} catch {
				return { data: formatted as string };
			}
		}

		if (!formatted || typeof formatted !== 'object') {
			return { data: String(formatted) };
		}

		if (Array.isArray(formatted)) {
			return { data: formatted };
		}

		if ('id' in formatted) {
			const typed = formatted as { id: string };
			return {
				...(formatted as JsonObject),
				call_link: `https://app.trugen.ai/agent/${typed.id}`,
				embed_code: `<iframe src="https://app.trugen.ai/embed?agentId=${typed.id}" width="100%" height="600" frameborder="0" allow="camera; microphone; autoplay"></iframe>`,
			};
		}

		return formatted as JsonObject;
	},
};

export class Trugen implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Trugen',
		name: 'trugen',
		icon: { light: 'file:trugen.svg', dark: 'file:trugen.dark.svg' },
		group: ['transform'],
		version: 1,
		usableAsTool: true,
		description: 'Create agents, list avatars, and fetch conversations from Trugen',
		defaults: { name: 'TruGen' },
		inputs: <NodeConnectionType[]>['main'],
		outputs: <NodeConnectionType[]>['main'],
		credentials: [{ name: 'trugenApi', required: true }],

		properties: [
			{
				displayName: 'Action',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Create Agent', value: 'createAgent' },
					{ name: 'Get Stock Avatars', value: 'getAvatars' },
					{ name: 'Get Conversation', value: 'getConversation' },
				],
				default: 'createAgent',
			},
			{
				displayName: 'Agent Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'System Prompt',
				name: 'system_prompt',
				type: 'string',
				required: true,
				default: 'You are a helpful assistant.',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Avatar Source',
				name: 'avatarSource',
				type: 'options',
				options: [
					{ name: 'Stock Avatar', value: 'stock' },
					{ name: 'Manual Avatar ID', value: 'manual' },
				],
				default: 'stock',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Stock Avatar ID',
				name: 'avatarStockId',
				type: 'string',
				default: '665a1170',
				displayOptions: {
					show: { operation: ['createAgent'], avatarSource: ['stock'] },
				},
			},
			{
				displayName: 'Avatar ID',
				name: 'avatarId',
				type: 'string',
				default: '665a1170',
				displayOptions: {
					show: { operation: ['createAgent'], avatarSource: ['manual'] },
				},
			},
			{
				displayName: 'Greeting',
				name: 'greeting',
				type: 'string',
				default: 'Hello! How can I help you today?',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Max Session Length (Minutes)',
				name: 'maxSessionLengthMinutes',
				type: 'number',
				default: 30,
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'LLM Provider',
				name: 'llmProvider',
				type: 'options',
				options: [
					{ name: 'Google', value: 'google' },
					{ name: 'Groq', value: 'groq' },
					{ name: 'OpenAI', value: 'openai' },
				],
				default: 'openai',
				displayOptions: { show: { operation: ['createAgent'] } },
				description: 'Provider for the Large Language Model',
			},
			{
				displayName: 'LLM Model (OpenAI)',
				name: 'llmModel_openai',
				type: 'options',
				options: [
					{ name: 'GPT-4.1-Mini', value: 'gpt-4.1-mini' },
					{ name: 'GPT-4.1-Nano', value: 'gpt-4.1-nano' },
					{ name: 'GPT-4.1', value: 'gpt-4.1' },
				],
				default: 'gpt-4.1-mini',
				displayOptions: {
					show: { operation: ['createAgent'], llmProvider: ['openai'] },
				},
				description: 'Model ID for OpenAI LLM',
			},
			{
				displayName: 'LLM Model (Groq)',
				name: 'llmModel_groq',
				type: 'options',
				options: [
					{
						name: 'Llama-4 Maverick',
						value: 'meta-llama/llama-4-maverick-17b-128e-instruct',
					},
					{
						name: 'Llama-4 Scout',
						value: 'meta-llama/llama-4-scout-17b-16e-instruct',
					},
					{ name: 'GPT OSS 20b', value: 'openai/gpt-oss-20b' },
					{ name: 'GPT OSS 120b', value: 'openai/gpt-oss-120b' },
				],
				default: 'meta-llama/llama-4-maverick-17b-128e-instruct',
				displayOptions: {
					show: { operation: ['createAgent'], llmProvider: ['groq'] },
				},
				description: 'Model ID for Groq LLM',
			},
			{
				displayName: 'LLM Model (Google)',
				name: 'llmModel_google',
				type: 'options',
				options: [
					{ name: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
					{ name: 'Gemini 2.5 Flash Lite', value: 'gemini-2.5-flash-lite' },
					{ name: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
					{ name: 'Gemini 3 Flash Preview', value: 'gemini-3-flash-preview' },
					{ name: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },
				],
				default: 'gemini-2.5-flash',
				displayOptions: {
					show: { operation: ['createAgent'], llmProvider: ['google'] },
				},
				description: 'Model ID for Google LLM',
			},
			{
				displayName: 'TTS Provider',
				name: 'ttsProvider',
				type: 'options',
				options: [{ name: 'ElevenLabs', value: 'elevenlabs' }],
				default: 'elevenlabs',
				description: 'Text-to-Speech provider',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'TTS Model',
				name: 'ttsModel',
				type: 'options',
				options: [
					{ name: 'Turbo 2.5', value: 'eleven_turbo_v2_5' },
					{ name: 'Turbo 2', value: 'eleven_turbo_v2' },
				],
				default: 'eleven_turbo_v2_5',
				description: 'Model ID for ElevenLabs TTS',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'TTS Voice ID',
				name: 'ttsVoiceId',
				type: 'options',
				options: [
					{ name: 'Alex', value: 'iP95p4xoKVk53GoZ742B' },
					{ name: 'Aman', value: 'rFzjTA9NFWPsUdx39OwG' },
					{ name: 'Chloe', value: '21m00Tcm4TlvDq8ikWAM' },
					{ name: 'Jack', value: 'bIHbv24MWmeRgasZH58o' },
					{ name: 'Lisa', value: 'FGY2WhTYpPnrIDTdsKH5' },
					{ name: 'Priya', value: 'ZUrEGyu8GFMwnHbvLhv2' },
					{ name: 'Sameer', value: 'SV61h9yhBg4i91KIBwdz' },
				],
				default: 'ZUrEGyu8GFMwnHbvLhv2',
				description: 'Voice ID for TTS',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'STT Provider',
				name: 'sttProvider',
				type: 'options',
				options: [
					{ name: 'Deepgram', value: 'deepgram' },
					{ name: 'Deepgram V2', value: 'deepgram-v2' },
				],
				default: 'deepgram',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'STT Model',
				name: 'sttModel',
				type: 'options',
				options: [
					{ name: 'Nova 3', value: 'nova-3' },
					{ name: 'Nova 2', value: 'nova-2' },
					{ name: 'Flux General English', value: 'flux-general-en' },
				],
				default: 'nova-3',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'STT Language',
				name: 'sttLanguage',
				type: 'options',
				options: [
					{ name: 'Bulgarian', value: 'bg' },
					{ name: 'Catalan', value: 'ca' },
					{ name: 'Czech', value: 'cs' },
					{ name: 'Danish', value: 'da' },
					{ name: 'Danish (Denmark)', value: 'da-DK' },
					{ name: 'Dutch', value: 'nl' },
					{ name: 'English', value: 'en' },
					{ name: 'English (Australia)', value: 'en-AU' },
					{ name: 'English (India)', value: 'en-IN' },
					{ name: 'English (New Zealand)', value: 'en-NZ' },
					{ name: 'English (United Kingdom)', value: 'en-GB' },
					{ name: 'English (United States)', value: 'en-US' },
					{ name: 'Estonian', value: 'et' },
					{ name: 'Finnish', value: 'fi' },
					{ name: 'Flemish', value: 'nl-BE' },
					{ name: 'French', value: 'fr' },
					{ name: 'French (Canada)', value: 'fr-CA' },
					{ name: 'German', value: 'de' },
					{ name: 'German (Switzerland)', value: 'de-CH' },
					{ name: 'Greek', value: 'el' },
					{ name: 'Hindi', value: 'hi' },
					{ name: 'Hungarian', value: 'hu' },
					{ name: 'Indonesian', value: 'id' },
					{ name: 'Italian', value: 'it' },
					{ name: 'Japanese', value: 'ja' },
					{ name: 'Korean', value: 'ko' },
					{ name: 'Korean (South Korea)', value: 'ko-KR' },
					{ name: 'Latvian', value: 'lv' },
					{ name: 'Lithuanian', value: 'lt' },
					{ name: 'Malay', value: 'ms' },
					{ name: 'Multilingual (Multi)', value: 'multi' },
					{ name: 'Norwegian', value: 'no' },
					{ name: 'Polish', value: 'pl' },
					{ name: 'Portuguese', value: 'pt' },
					{ name: 'Portuguese (Brazil)', value: 'pt-BR' },
					{ name: 'Portuguese (Portugal)', value: 'pt-PT' },
					{ name: 'Romanian', value: 'ro' },
					{ name: 'Russian', value: 'ru' },
					{ name: 'Slovak', value: 'sk' },
					{ name: 'Spanish', value: 'es' },
					{ name: 'Spanish (Latin America)', value: 'es-419' },
					{ name: 'Swedish', value: 'sv' },
					{ name: 'Swedish (Sweden)', value: 'sv-SE' },
					{ name: 'Turkish', value: 'tr' },
					{ name: 'Ukrainian', value: 'uk' },
					{ name: 'Vietnamese', value: 'vi' },
				],
				default: 'en',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Capabilities',
				name: 'capabilities',
				type: 'multiOptions',
				options: [
					{ name: 'Webcam Vision', value: 'webcam_vision' },
					{ name: 'Screen Vision', value: 'screen_vision' },
				],
				default: [],
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Record Calls',
				name: 'record',
				type: 'boolean',
				default: true,
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Callback Events',
				name: 'callback_events',
				type: 'multiOptions',
				options: [
					{ name: 'Agent Interrupted', value: 'agent.interrupted' },
					{ name: 'Agent Started Speaking', value: 'agent.started_speaking' },
					{ name: 'Agent Stopped Speaking', value: 'agent.stopped_speaking' },
					{ name: 'Call Ended', value: 'call_ended' },
					{ name: 'Max Call Duration Timeout', value: 'max_call_duration_timeout' },
					{ name: 'Participant Left', value: 'participant_left' },
					{ name: 'User Started Speaking', value: 'user.started_speaking' },
					{ name: 'User Stopped Speaking', value: 'user.stopped_speaking' },
					{ name: 'Utterance Committed', value: 'utterance_committed' },
				],
				default: [],
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Callback URL',
				name: 'callback_url',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['createAgent'] } },
			},
			{
				displayName: 'Conversation ID',
				name: 'conversation_id',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { operation: ['getConversation'] } },
			},
			{
				displayName: 'Wait for Completion',
				name: 'wait_for_completion',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['getConversation'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('trugenApi');

		const results: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			let response: unknown;

			try {
				if (operation === 'createAgent') {
					const avatarSource = this.getNodeParameter('avatarSource', i);
					const avatarId =
						avatarSource === 'stock'
							? this.getNodeParameter('avatarStockId', i)
							: this.getNodeParameter('avatarId', i);

					let llmModel = '';
					const llmProvider = this.getNodeParameter('llmProvider', i);
					if (llmProvider === 'openai') {
						llmModel = this.getNodeParameter('llmModel_openai', i) as string;
					} else if (llmProvider === 'groq') {
						llmModel = this.getNodeParameter('llmModel_groq', i) as string;
					} else if (llmProvider === 'google') {
						llmModel = this.getNodeParameter('llmModel_google', i) as string;
					}

					const capabilities = this.getNodeParameter('capabilities', i, []) as string[];
					const maxSessionLengthMinutes = this.getNodeParameter(
						'maxSessionLengthMinutes',
						i,
					) as number;

					const body: IDataObject = {
						agent_name: this.getNodeParameter('name', i),
						agent_system_prompt: this.getNodeParameter('system_prompt', i),
						record: this.getNodeParameter('record', i),
						callback_url: this.getNodeParameter('callback_url', i),
						callback_events: this.getNodeParameter('callback_events', i),
						avatars: [
							{
								avatar_key_id: avatarId,
								persona_name: this.getNodeParameter('name', i),
								persona_prompt: this.getNodeParameter('system_prompt', i),
								welcome_message: {
									wait_time: 2,
									messages: [this.getNodeParameter('greeting', i)],
								},
								config: {
									llm: { provider: llmProvider, model: llmModel },
									stt: {
										provider: this.getNodeParameter('sttProvider', i),
										model: this.getNodeParameter('sttModel', i),
										language: this.getNodeParameter('sttLanguage', i),
									},
									tts: {
										provider: this.getNodeParameter('ttsProvider', i),
										model_id: this.getNodeParameter('ttsModel', i),
										voice_id: this.getNodeParameter('ttsVoiceId', i),
									},
									webcam: capabilities.includes('webcam_vision'),
									screen: capabilities.includes('screen_vision'),
								},
							},
						],
						config: {
							timeout: maxSessionLengthMinutes * 60,
						},
					};

					response = await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.trugen.ai/v1/ext/agent',
						headers: { 'x-api-key': credentials.apiKey as string },
						body,
						json: true,
					});
				}

				if (operation === 'getAvatars') {
					response = await this.helpers.httpRequest({
						method: 'GET',
						url: 'https://api.trugen.ai/v1/ext/avatars',
						headers: { 'x-api-key': credentials.apiKey as string },
						json: true,
					});
				}

				if (operation === 'getConversation') {
					const conversationId = this.getNodeParameter('conversation_id', i) as string;
					const wait = this.getNodeParameter('wait_for_completion', i, false) as boolean;

					const fetch = async () => {
						return await this.helpers.httpRequest({
							method: 'GET',
							url: `https://api.trugen.ai/v1/ext/conversation/${conversationId}`,
							headers: { 'x-api-key': credentials.apiKey as string },
							json: true,
						});
					};

					response = await fetch();

					if (wait) {
						let retries = 0;
						while ((response as IDataObject).status !== 'Completed' && retries < 5) {
							await sleep(2000);
							response = await fetch();
							retries++;
						}
					}
				}

				results.push({
					json: trugenHelpers.formatResponse(response),
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return this.prepareOutputData(results);
	}
}
