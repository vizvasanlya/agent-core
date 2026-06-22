import { CollaborationConfig, AgentInfo, TaskDelegation } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class CollaborationProtocol {
  private config: CollaborationConfig;
  private agentId: string;
  private connectedAgents: Map<string, AgentInfo> = new Map();
  private taskQueue: TaskDelegation[] = [];
  private isInitialized = false;

  constructor(config: CollaborationConfig) {
    this.config = config;
    this.agentId = this.generateAgentId();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Start discovery if using mDNS
    if (this.config.discovery === 'mdns') {
      await this.startDiscovery();
    }

    this.isInitialized = true;
  }

  async connect(agentId: string): Promise<void> {
    // Connect to another agent
    const agentInfo: AgentInfo = {
      id: agentId,
      name: `Agent-${agentId}`,
      capabilities: [],
      status: 'available'
    };

    this.connectedAgents.set(agentId, agentInfo);
  }

  async disconnect(): Promise<void> {
    // Disconnect from all agents
    this.connectedAgents.clear();
    this.isInitialized = false;
  }

  async delegateTask(task: string, targetAgentId?: string): Promise<TaskDelegation> {
    // Find the best agent for the task
    const targetAgent = targetAgentId 
      ? this.connectedAgents.get(targetAgentId)
      : await this.findBestAgent(task);

    if (!targetAgent) {
      throw new Error('No suitable agent found for task');
    }

    const delegation: TaskDelegation = {
      taskId: uuidv4(),
      fromAgent: this.agentId,
      toAgent: targetAgent.id,
      task,
      context: {},
      status: 'pending'
    };

    this.taskQueue.push(delegation);

    // Send task to agent (would use network in production)
    await this.sendTaskToAgent(delegation);

    return delegation;
  }

  async receiveTask(delegation: TaskDelegation): Promise<any> {
    // Receive and process a task from another agent
    delegation.status = 'accepted';

    // Process the task (would use actual processing in production)
    const result = await this.processTask(delegation.task);

    delegation.status = 'completed';
    return result;
  }

  async broadcast(message: string): Promise<void> {
    // Broadcast message to all connected agents
    for (const agent of this.connectedAgents.values()) {
      await this.sendMessage(agent.id, message);
    }
  }

  async sendMessage(agentId: string, message: string): Promise<void> {
    // Send message to specific agent (would use network in production)
    console.log(`Sending message to ${agentId}: ${message}`);
  }

  async getConnectedAgents(): Promise<AgentInfo[]> {
    return Array.from(this.connectedAgents.values());
  }

  async getAgentStatus(agentId: string): Promise<AgentInfo | undefined> {
    return this.connectedAgents.get(agentId);
  }

  async updateAgentStatus(status: 'available' | 'busy' | 'offline'): Promise<void> {
    // Update own status
    const ownInfo = this.connectedAgents.get(this.agentId);
    if (ownInfo) {
      ownInfo.status = status;
    }
  }

  async getTaskQueue(): Promise<TaskDelegation[]> {
    return this.taskQueue;
  }

  async completeTask(taskId: string, result: any): Promise<void> {
    const task = this.taskQueue.find(t => t.taskId === taskId);
    if (task) {
      task.status = 'completed';
    }
  }

  private async findBestAgent(task: string): Promise<AgentInfo | undefined> {
    // Simple agent selection (would use capability matching in production)
    const availableAgents = Array.from(this.connectedAgents.values())
      .filter(agent => agent.status === 'available');

    if (availableAgents.length === 0) {
      return undefined;
    }

    // Return first available agent for now
    return availableAgents[0];
  }

  private async sendTaskToAgent(delegation: TaskDelegation): Promise<void> {
    // Send task to agent (would use network in production)
    console.log(`Delegating task to ${delegation.toAgent}: ${delegation.task}`);
  }

  private async processTask(task: string): Promise<any> {
    // Process the task (would use actual processing in production)
    return { result: `Processed: ${task}` };
  }

  private async startDiscovery(): Promise<void> {
    // Start mDNS discovery (would use actual mDNS in production)
    console.log('Starting agent discovery...');
  }

  private generateAgentId(): string {
    return `agent_${uuidv4().substring(0, 8)}`;
  }

  // Collaboration patterns
  async requestHelp(task: string): Promise<TaskDelegation> {
    // Request help from other agents
    return this.delegateTask(task);
  }

  async offerHelp(agentId: string): Promise<void> {
    // Offer help to another agent
    await this.sendMessage(agentId, 'I can help with your task');
  }

  async shareKnowledge(knowledge: any): Promise<void> {
    // Share knowledge with all connected agents
    await this.broadcast(JSON.stringify({
      type: 'knowledge_share',
      data: knowledge
    }));
  }

  async requestKnowledge(topic: string): Promise<any[]> {
    // Request knowledge from other agents
    const knowledge: any[] = [];

    for (const agent of this.connectedAgents.values()) {
      await this.sendMessage(agent.id, JSON.stringify({
        type: 'knowledge_request',
        topic
      }));
    }

    return knowledge;
  }
}