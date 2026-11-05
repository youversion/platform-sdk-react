export interface CustomPropertyAudit {
  declarations: string[];
  references: string[];
  unexplainedReferences: string[];
}

export function auditCustomProperties(css: string): CustomPropertyAudit;

export interface ShadowPropertyDefaultsAudit {
  registeredDefaults: string[];
  shadowDefaults: string[];
  missingShadowDefaults: string[];
}

export function auditShadowPropertyDefaults(css: string): ShadowPropertyDefaultsAudit;
