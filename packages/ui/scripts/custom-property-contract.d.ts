export interface CustomPropertyAudit {
  declarations: string[];
  references: string[];
  unexplainedReferences: string[];
}

export function auditCustomProperties(css: string): CustomPropertyAudit;
