import { CollaborationConfig, AgentInfo, TaskDelegation } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getLogger, logDebug } from '../logger';
import { EventEmitter } from 'events';

export interface CollaborationMessage {
  id: string;
  from: string;
  to: string;
  type: 'task' | 'knowledge' | 'status' | 'broadcast';
  payload: any;
  timestamp: Date;
}

export class CollaborationProtocol extends EventEmitter {
  private config: CollaborationConfig;
  private agentId: string;
  private agentInfo: AgentInfo;
  private connectedAgents: Map<string, AgentInfo> = new Map();
  private taskQueue: TaskDelegation[] = [];
  private messageQueue: CollaborationMessage[] = [];
  private isInitialized = false;
  private logger = getLogger();

  constructor(config: CollaborationConfig) {
    super();
    this.config = config;
    this.agentId = this.generateAgentId();
    this.agentInfo = {
      id: this.agentId,
      name: `Agent-${this.agentId.substring(0, 8)}`,
      capabilities: [],
      status: 'available',
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.config.discovery === 'mdns') {
      await this.startDiscovery();
    }

    this.isInitialized = true;
    this.logger.info({
      agentId: this.agentId,
      discovery: this.config.discovery,
    }, 'Collaboration protocol initialized');
  }

  getAgentId(): string {
    return this.agentId;
  }

  getAgentInfo(): AgentInfo {
    return { ...this.agentInfo };
  }

  async connect(agentInfo: AgentInfo): Promise<void> {
    const maxConn = this.config.maxConnections || 10;
    if (this.connectedAgents.size >= maxConn) {
      throw new Error('Maximum connections reached');
    }

    this.connectedAgents.set(agentInfo.id, agentInfo);
    this.emit('agent:connected', agentInfo);
    this.logger.info({ agentId: agentInfo.id }, 'Agent connected');
  }

  async disconnect(agentId?: string): Promise<void> {
    if (agentId) {
      this.connectedAgents.delete(agentId);
      this.emit('agent:disconnected', agentId);
    } else {
      this.connectedAgents.clear();
      this.isInitialized = false;
    }
  }

  async updateStatus(status: AgentInfo['status']): Promise<void> {
    this.agentInfo.status = status;
    await this.broadcast({
      type: 'status',
      payload: { status },
    });
  }

  async delegateTask(task: string, targetAgentId?: string): Promise<TaskDelegation> {
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
      status: 'pending',
    };

    this.taskQueue.push(delegation);

    const message: CollaborationMessage = {
      id: uuidv4(),
      from: this.agentId,
      to: targetAgent.id,
      type: 'task',
      payload: delegation,
      timestamp: new Date(),
    };

    await this.sendMessage(message);

    this.emit('task:delegated', delegation);
    this.logger.info({
      taskId: delegation.taskId,
      target: targetAgent.id,
    }, 'Task delegated');

    return delegation;
  }

  async acceptTask(taskId: string): Promise<void> {
    const task = this.taskQueue.find(t => t.taskId === taskId);
    if (task) {
      task.status = 'accepted';
      this.emit('task:accepted', task);
    }
  }

  async completeTask(taskId: string, result: any): Promise<void> {
    const task = this.taskQueue.find(t => t.taskId === taskId);
    if (task) {
      task.status = 'completed';
      task.context.result = result;

      const message: CollaborationMessage = {
        id: uuidv4(),
        from: this.agentId,
        to: task.fromAgent,
        type: 'task',
        payload: { taskId, result },
        timestamp: new Date(),
      };

      await this.sendMessage(message);
      this.emit('task:completed', task);
    }
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = this.taskQueue.find(t => t.taskId === taskId);
    if (task) {
      task.status = 'failed';
      task.context.error = error;

      const message: CollaborationMessage = {
        id: uuidv4(),
        from: this.agentId,
        to: task.fromAgent,
        type: 'task',
        payload: { taskId, error },
        timestamp: new Date(),
      };

      await this.sendMessage(message);
      this.emit('task:failed', task);
    }
  }

  async broadcast(payload: any): Promise<void> {
    const message: CollaborationMessage = {
      id: uuidv4(),
      from: this.agentId,
      to: '*',
      type: 'broadcast',
      payload,
      timestamp: new Date(),
    };

    for (const agent of this.connectedAgents.values()) {
      const agentMessage = { ...message, to: agent.id };
      await this.sendMessage(agentMessage);
    }

    this.emit('broadcast:sent', payload);
  }

  async sendMessage(message: CollaborationMessage): Promise<void> {
    this.messageQueue.push(message);
    this.emit('message:sent', message);
    logDebug('Message sent', { from: message.from, to: message.to, type: message.type });
  }

  async receiveMessage(message: CollaborationMessage): Promise<void> {
    if (message.to !== this.agentId && message.to !== '*') {
      return;
    }

    this.emit('message:received', message);

    switch (message.type) {
      case 'task':
        await this.handleTaskMessage(message);
        break;
      case 'knowledge':
        this.emit('knowledge:received', message.payload);
        break;
      case 'status':
        this.emit('status:received', message);
        break;
      case 'broadcast':
        this.emit('broadcast:received', message.payload);
        break;
    }
  }

  private async handleTaskMessage(message: CollaborationMessage): Promise<void> {
    const payload = message.payload;

    if (payload.taskId && payload.result !== undefined) {
      const task = this.taskQueue.find(t => t.taskId === payload.taskId);
      if (task) {
        task.status = 'completed';
        task.context.result = payload.result;
        this.emit('task:completed', task);
      }
    } else if (payload.taskId && payload.error) {
      const task = this.taskQueue.find(t => t.taskId === payload.taskId);
      if (task) {
        task.status = 'failed';
        task.context.error = payload.error;
        this.emit('task:failed', task);
      }
    } else if (payload.task) {
      this.emit('task:received', payload);
    }
  }

  async shareKnowledge(knowledge: any): Promise<void> {
    await this.broadcast({
      type: 'knowledge',
      payload: knowledge,
    });
  }

  async requestKnowledge(topic: string): Promise<any[]> {
    const knowledge: any[] = [];

    await this.broadcast({
      type: 'knowledge',
      payload: { request: topic },
    });

    return knowledge;
  }

  async getConnectedAgents(): Promise<AgentInfo[]> {
    return Array.from(this.connectedAgents.values());
  }

  async getAgentStatus(agentId: string): Promise<AgentInfo | undefined> {
    return this.connectedAgents.get(agentId);
  }

  async getTaskQueue(): Promise<TaskDelegation[]> {
    return [...this.taskQueue];
  }

  async getPendingTasks(): Promise<TaskDelegation[]> {
    return this.taskQueue.filter(t => t.status === 'pending' || t.status === 'accepted');
  }

  async getStats(): Promise<{
    agentId: string;
    connectedAgents: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
  }> {
    return {
      agentId: this.agentId,
      connectedAgents: this.connectedAgents.size,
      totalTasks: this.taskQueue.length,
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
      completedTasks: this.taskQueue.filter(t => t.status === 'completed').length,
      failedTasks: this.taskQueue.filter(t => t.status === 'failed').length,
    };
  }

  private async findBestAgent(task: string): Promise<AgentInfo | undefined> {
    const availableAgents = Array.from(this.connectedAgents.values())
      .filter(agent => agent.status === 'available');

    if (availableAgents.length === 0) {
      return undefined;
    }

    const taskLower = task.toLowerCase();
    let bestAgent = availableAgents[0];
    let bestScore = 0;

    for (const agent of availableAgents) {
      const capabilityScore = agent.capabilities.filter(cap =>
        taskLower.includes(cap.toLowerCase())
      ).length;

      if (capabilityScore > bestScore) {
        bestScore = capabilityScore;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private async startDiscovery(): Promise<void> {
    this.logger.debug('Starting mDNS discovery');
  }

  private generateAgentId(): string {
    return `agent_${uuidv4().substring(0, 12)}`;
  }
}