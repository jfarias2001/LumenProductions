/**
 * Camada de provider de IA (SPEC-001 §9.2 / SPEC-002 §1.1).
 * Abstração `AIProvider` + adapter OpenAI. Troca de provider sem tocar nos services.
 */
import OpenAI from 'openai';
import type { ZodType, ZodTypeDef } from 'zod';
import { config } from '../../config.js';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateStructuredArgs<T> {
  system: string;
  user: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  /** Nome lógico do schema (vai no log do AIJob / mensagens de erro). */
  schemaName: string;
  model?: string;
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatArgs {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  /** Se presente, ativa streaming e é chamado a cada pedaço de texto. */
  onToken?: (delta: string) => void;
}

export interface AIProvider {
  readonly enabled: boolean;
  generateStructured<T>(args: GenerateStructuredArgs<T>): Promise<{ data: T; usage: TokenUsage; model: string }>;
  /** Chat em texto livre (PRD-003). Com `onToken`, transmite por streaming. */
  chat(args: ChatArgs): Promise<{ text: string; usage: TokenUsage; model: string }>;
}

export class AINotConfiguredError extends Error {
  code = 'AI_NOT_CONFIGURED';
  constructor() {
    super('Camada de IA não configurada (defina OPENAI_API_KEY no backend).');
  }
}

export class AIOutputError extends Error {
  code = 'AI_OUTPUT_INVALID';
}

/**
 * Modelos de raciocínio (o1/o3/o4…) e a família GPT-5 só aceitam `temperature = 1`
 * (o default) e devolvem 400 para qualquer outro valor. Para esses, omitimos o
 * parâmetro e deixamos o modelo usar o default. Modelos clássicos (gpt-4o, gpt-4o-mini,
 * gpt-4-turbo, gpt-3.5…) continuam recebendo o `temperature` configurado.
 */
function supportsTemperature(model: string): boolean {
  return !/^(o\d|gpt-5)/i.test(model);
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI | null;
  readonly enabled: boolean;

  constructor() {
    this.enabled = Boolean(config.openaiApiKey);
    this.client = this.enabled ? new OpenAI({ apiKey: config.openaiApiKey }) : null;
  }

  async generateStructured<T>({
    system,
    user,
    schema,
    schemaName,
    model,
    temperature = 0.5,
  }: GenerateStructuredArgs<T>): Promise<{ data: T; usage: TokenUsage; model: string }> {
    if (!this.client) throw new AINotConfiguredError();
    const usedModel = model ?? config.aiDefaultModel;

    const completion = await this.client.chat.completions.create({
      model: usedModel,
      ...(supportsTemperature(usedModel) ? { temperature } : {}),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AIOutputError(`Resposta da IA não é JSON válido (${schemaName}).`);
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new AIOutputError(`Saída da IA não bate com o schema ${schemaName}: ${result.error.message}`);
    }

    return {
      data: result.data,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
      model: usedModel,
    };
  }

  async chat({ messages, model, temperature = 0.6, onToken }: ChatArgs): Promise<{ text: string; usage: TokenUsage; model: string }> {
    if (!this.client) throw new AINotConfiguredError();
    const usedModel = model ?? config.aiDefaultModel;

    // ── Sem streaming ──────────────────────────────────────────────────────────
    if (!onToken) {
      const completion = await this.client.chat.completions.create({
        model: usedModel,
        ...(supportsTemperature(usedModel) ? { temperature } : {}),
        messages,
      });
      return {
        text: completion.choices[0]?.message?.content ?? '',
        usage: {
          inputTokens: completion.usage?.prompt_tokens ?? 0,
          outputTokens: completion.usage?.completion_tokens ?? 0,
        },
        model: usedModel,
      };
    }

    // ── Streaming ────────────────────────────────────────────────────────────────
    const stream = await this.client.chat.completions.create({
      model: usedModel,
      ...(supportsTemperature(usedModel) ? { temperature } : {}),
      messages,
      stream: true,
      stream_options: { include_usage: true },
    });

    let text = '';
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        text += delta;
        onToken(delta);
      }
      if (chunk.usage) {
        usage.inputTokens = chunk.usage.prompt_tokens ?? usage.inputTokens;
        usage.outputTokens = chunk.usage.completion_tokens ?? usage.outputTokens;
      }
    }
    return { text, usage, model: usedModel };
  }
}

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) provider = new OpenAIProvider();
  return provider;
}
