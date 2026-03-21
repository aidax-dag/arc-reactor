/**
 * Agent Message Bus — real-time communication between team agents.
 *
 * Enables agents to share context, ask questions, and coordinate
 * without going through the CEO Agent.
 *
 * Use cases:
 * - Frontend asks Backend: "What's the API response shape for /api/users?"
 * - QA asks Frontend: "What's the expected behavior when form validation fails?"
 * - Backend notifies Frontend: "I added a new field 'avatar_url' to the user response"
 */

export interface AgentMessage {
  id: string;
  from: string;        // team type: 'frontend', 'backend', etc.
  to: string;          // team type or '*' for broadcast
  type: 'question' | 'answer' | 'notify' | 'share';
  content: string;
  data?: unknown;
  timestamp: string;
}

export class AgentBus {
  private messages: AgentMessage[] = [];
  private listeners: Map<string, ((msg: AgentMessage) => void)[]> = new Map();

  /**
   * Send a message from one agent to another.
   */
  send(from: string, to: string, type: AgentMessage['type'], content: string, data?: unknown): AgentMessage {
    const msg: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from,
      to,
      type,
      content,
      data,
      timestamp: new Date().toISOString(),
    };

    this.messages.push(msg);

    // Notify listeners
    const targetListeners = this.listeners.get(to) || [];
    const broadcastListeners = this.listeners.get('*') || [];
    [...targetListeners, ...broadcastListeners].forEach(fn => fn(msg));

    return msg;
  }

  /**
   * Subscribe to messages for a specific team.
   */
  on(team: string, callback: (msg: AgentMessage) => void): void {
    const existing = this.listeners.get(team) || [];
    existing.push(callback);
    this.listeners.set(team, existing);
  }

  /**
   * Get messages for a specific team (inbox).
   */
  getMessages(team: string): AgentMessage[] {
    return this.messages.filter(m => m.to === team || m.to === '*');
  }

  /**
   * Get all messages (for logging/debugging).
   */
  getAllMessages(): AgentMessage[] {
    return [...this.messages];
  }

  /**
   * Build context string for a team agent — includes relevant messages.
   */
  buildAgentContext(team: string): string {
    const messages = this.getMessages(team);
    if (messages.length === 0) return '';

    const lines = ['## Messages from other teams'];
    for (const msg of messages.slice(-10)) {
      const icon = msg.type === 'question' ? '❓' : msg.type === 'answer' ? '💬' : msg.type === 'notify' ? '📢' : '📎';
      lines.push(`${icon} [${msg.from}→${msg.to}] ${msg.content}`);
    }
    return lines.join('\n');
  }

  /**
   * Clear all messages (between runs).
   */
  clear(): void {
    this.messages = [];
    this.listeners.clear();
  }
}

// Singleton instance
export const agentBus = new AgentBus();
