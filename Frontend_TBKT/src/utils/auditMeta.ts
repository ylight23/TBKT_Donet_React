import type { LocalAuditMetadata } from '../apis/thamSoApi';

export const formatAuditDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
};

export const buildAuditSummary = (audit?: LocalAuditMetadata): string => {
  if (!audit) return 'Chua co metadata audit';

  const version = audit.version ? `v${audit.version}` : 'v?';
  const modifyBy = audit.modifyBy || audit.createBy || 'system';
  const modifyDate = formatAuditDateTime(audit.modifyDate || audit.createDate);
  return `${version} • ${modifyBy} • ${modifyDate}`;
};
