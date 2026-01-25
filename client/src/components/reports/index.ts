/**
 * Reports Components
 *
 * UI components for generating, sharing, and viewing reports.
 */

// Main components
export { GenerateReportDialog, GenerateReportButton } from './GenerateReportDialog';
export { ShareReportButton } from './ShareReportButton';
export { SharedReportsList } from './SharedReportsList';
export { PublicReportView } from './PublicReportView';

// Hooks
export {
  reportKeys,
  useGenerateReport,
  useDownloadReport,
  useSharedReports,
  useCreateSharedReport,
  useRevokeSharedReport,
  usePublicReport,
  useCopyShareLink,
} from './useReports';

// Types
export type {
  ReportSection,
  SharedReportStatus,
  GenerateReportRequest,
  GenerateReportResponse,
  SharedReport,
  CreateSharedReportRequest,
  PublicReportData,
} from './types';

// Constants
export { REPORT_SECTIONS, DEFAULT_REPORT_SECTIONS } from './types';
