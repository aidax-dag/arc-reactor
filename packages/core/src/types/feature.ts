export interface Feature {
  id: string;
  name: string;
  version: string;
  category: string;

  planning: {
    description: string;
    userScenarios: UserScenario[];
    dataRequirements: DataField[];
    constraints: string[];
    acceptanceCriteria: string[];
  };

  implementation: {
    frontend: TaskSpec;
    backend: TaskSpec;
    database: TaskSpec;
    protocols: ProtocolSpec[];
    tests: TaskSpec;
  };

  metadata: {
    author: string;
    createdAt: string;
    tags: string[];
    githubRepo?: string;
    visibility: 'public' | 'private';
  };
}

export interface UserScenario {
  title: string;
  steps: string[];
  expectedOutcome: string;
}

export interface DataField {
  name: string;
  type: string;
  required: boolean;
  validation?: string;
}

export interface TaskSpec {
  description: string;
  components: string[];
}

export interface ProtocolSpec {
  from: string;
  to: string;
  method: string;
  endpoint: string;
  payload: string;
}
