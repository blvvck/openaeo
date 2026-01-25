/**
 * Citation Components
 *
 * UI components for displaying and analyzing source citations from AI platforms.
 */

// Components
export { CitationCard, CompactCitationCard } from './CitationCard';
export { CitationList } from './CitationList';
export { SourceDetailModal } from './SourceDetailModal';

// Types
export type {
  Platform,
  Citation,
  CitationGroup,
  CitingResponse,
  CitationDetails,
} from './types';

// Constants
export { PLATFORM_INFO } from './types';
