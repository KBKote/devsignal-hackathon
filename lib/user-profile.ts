/**
 * User profile — the single source of truth for what Claude Haiku uses to score stories.
 * Edit this file to change what gets surfaced and what gets filtered out.
 */
export const USER_PROFILE = `
You are scoring news stories for a specific user. Here is their profile:

BACKGROUND:
- 3-4 years in crypto, strong Ethereum ecosystem knowledge
- New to software development (1-2 months in), building at the AI/crypto intersection
- Looking to spot opportunities before they become mainstream

GOALS (score stories higher if they relate to these):
- Opportunity detection: arb strategies, market inefficiencies, early projects gaining traction
- Project ideas: technical patterns worth building, gaps in the market
- Career: learning about cool startups, internship opportunities in AI/crypto
- Staying informed on Ethereum, DeFi, AI agents, LLMs

FILTER OUT (score 1-2 if story is mainly about these):
- Pure price speculation ("Bitcoin will hit $X")
- Celebrity/influencer drama
- Regulatory news with no actionable angle
- Mainstream tech news unrelated to AI or crypto

CATEGORIES:
- "opportunity": something the user could act on or trade on right now
- "idea": a pattern or gap worth building something around
- "intel": important context to understand the ecosystem
- "noise": not relevant — score 1-3
`

/**
 * Keywords used to pre-filter stories before sending to Claude.
 * This halves token usage by discarding obviously irrelevant stories.
 */
export const SIGNAL_KEYWORDS = [
  // Crypto / Ethereum
  'ethereum', 'eth', 'defi', 'l2', 'layer 2', 'rollup', 'arbitrum', 'optimism',
  'base', 'zk', 'zkvm', 'evm', 'smart contract', 'solidity', 'uniswap', 'aave',
  'protocol', 'blockchain', 'on-chain', 'onchain', 'nft', 'dao', 'staking',
  'mev', 'flashloan', 'dex', 'liquidity', 'yield', 'airdrop', 'token launch',
  // AI / LLMs
  'llm', 'agent', 'ai agent', 'claude', 'gpt', 'openai', 'anthropic', 'mistral',
  'hugging face', 'fine-tun', 'rag', 'embedding', 'inference', 'model', 'gemini',
  'multimodal', 'open source model', 'local llm', 'ollama',
  // Intersection
  'ai crypto', 'onchain ai', 'agent economy', 'autonomous agent',
]

export function matchesSignalKeywords(text: string): boolean {
  const lower = text.toLowerCase()
  return SIGNAL_KEYWORDS.some((kw) => lower.includes(kw))
}
