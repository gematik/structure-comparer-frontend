export interface SourceProfile {
    name: string;
    simplifier_url: string;
    version: string;
  }
  
  export interface TargetProfile {
    name: string;
    simplifier_url: string;
    version: string;
  }
  
  export interface Mapping {
    id: string;
    last_updated: string;
    name: string;
    sources: SourceProfile[];
    status: string;
    target: TargetProfile;
    version: string;
  }