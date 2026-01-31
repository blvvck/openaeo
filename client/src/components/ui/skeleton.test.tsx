/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonButton,
  SkeletonInput,
} from './skeleton'

// Mock matchMedia for reduced motion tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('Skeleton', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===== Base Skeleton Tests =====
  describe('Base Skeleton', () => {
    it('renders with default props', () => {
      render(<Skeleton data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toBeInTheDocument()
      expect(skeleton).toHaveAttribute('role', 'status')
      expect(skeleton).toHaveAttribute('aria-busy', 'true')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...')
    })

    it('renders with custom aria-label', () => {
      render(<Skeleton aria-label="Loading user data" data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-label', 'Loading user data')
    })

    it('applies default variant styles', () => {
      render(<Skeleton data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('rounded-md')
      expect(skeleton).toHaveClass('bg-muted')
      expect(skeleton).toHaveClass('animate-pulse')
    })

    it('applies text variant styles', () => {
      render(<Skeleton variant="text" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('rounded')
      expect(skeleton).toHaveClass('h-4')
    })

    it('applies circular variant styles', () => {
      render(<Skeleton variant="circular" data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full')
    })

    it('applies rectangular variant styles', () => {
      render(<Skeleton variant="rectangular" data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-none')
    })

    it('applies card variant styles', () => {
      render(<Skeleton variant="card" data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-lg')
    })

    it('applies shimmer animation', () => {
      render(<Skeleton animation="shimmer" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveClass('relative')
      expect(skeleton).toHaveClass('overflow-hidden')
    })

    it('applies no animation', () => {
      render(<Skeleton animation="none" data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).not.toHaveClass('animate-pulse')
    })

    it('applies custom width as number', () => {
      render(<Skeleton width={200} data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '200px' })
    })

    it('applies custom width as string', () => {
      render(<Skeleton width="50%" data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveStyle({ width: '50%' })
    })

    it('applies custom height as number', () => {
      render(<Skeleton height={100} data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '100px' })
    })

    it('applies custom height as string', () => {
      render(<Skeleton height="100%" data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveStyle({ height: '100%' })
    })

    it('merges custom className', () => {
      render(<Skeleton className="custom-class" data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveClass('custom-class')
    })

    it('merges custom style', () => {
      render(<Skeleton style={{ marginTop: '10px' }} data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveStyle({ marginTop: '10px' })
    })
  })

  // ===== Reduced Motion Tests =====
  describe('Reduced Motion', () => {
    it('disables animation when reduced motion is preferred', () => {
      mockMatchMedia(true)
      render(<Skeleton data-testid="skeleton" />)
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).not.toHaveClass('animate-pulse')
    })

    it('uses no animation in SkeletonText when reduced motion is preferred', () => {
      mockMatchMedia(true)
      render(<SkeletonText data-testid="skeleton-text" />)
      const skeletons = screen.getByTestId('skeleton-text').querySelectorAll('[role="status"]')
      // Child skeletons should have no animation
      skeletons.forEach((skeleton) => {
        expect(skeleton).not.toHaveClass('animate-pulse')
      })
    })
  })

  // ===== SkeletonText Tests =====
  describe('SkeletonText', () => {
    it('renders with default 3 lines', () => {
      render(<SkeletonText data-testid="skeleton-text" />)
      const container = screen.getByTestId('skeleton-text')
      expect(container).toHaveAttribute('role', 'status')
      expect(container).toHaveAttribute('aria-busy', 'true')
      expect(container).toHaveAttribute('aria-label', 'Loading text...')
      // 3 child skeleton lines
      const lines = container.querySelectorAll('.bg-muted')
      expect(lines).toHaveLength(3)
    })

    it('renders with custom number of lines', () => {
      render(<SkeletonText lines={5} data-testid="skeleton-text" />)
      const lines = screen.getByTestId('skeleton-text').querySelectorAll('.bg-muted')
      expect(lines).toHaveLength(5)
    })

    it('applies gap between lines', () => {
      render(<SkeletonText gap={12} data-testid="skeleton-text" />)
      expect(screen.getByTestId('skeleton-text')).toHaveStyle({ gap: '12px' })
    })

    it('renders last line with shorter width by default', () => {
      render(<SkeletonText lines={3} data-testid="skeleton-text" />)
      const lines = screen.getByTestId('skeleton-text').querySelectorAll('.bg-muted')
      // Last line should have different width
      expect(lines[2]).toHaveStyle({ width: '60%' })
    })

    it('renders with custom lastLineWidth', () => {
      render(<SkeletonText lastLineWidth="40%" data-testid="skeleton-text" />)
      const lines = screen.getByTestId('skeleton-text').querySelectorAll('.bg-muted')
      expect(lines[2]).toHaveStyle({ width: '40%' })
    })

    it('renders with custom lineHeight', () => {
      render(<SkeletonText lineHeight={20} data-testid="skeleton-text" />)
      const lines = screen.getByTestId('skeleton-text').querySelectorAll('.bg-muted')
      lines.forEach((line) => {
        expect(line).toHaveStyle({ height: '20px' })
      })
    })

    it('applies custom aria-label', () => {
      render(<SkeletonText aria-label="Loading description" data-testid="skeleton-text" />)
      expect(screen.getByTestId('skeleton-text')).toHaveAttribute('aria-label', 'Loading description')
    })
  })

  // ===== SkeletonAvatar Tests =====
  describe('SkeletonAvatar', () => {
    it('renders with default size (md)', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />)
      const avatar = screen.getByTestId('skeleton-avatar')
      expect(avatar).toHaveStyle({ width: '40px', height: '40px' })
      expect(avatar).toHaveClass('rounded-full')
    })

    it('renders with sm size', () => {
      render(<SkeletonAvatar size="sm" data-testid="skeleton-avatar" />)
      expect(screen.getByTestId('skeleton-avatar')).toHaveStyle({ width: '32px', height: '32px' })
    })

    it('renders with lg size', () => {
      render(<SkeletonAvatar size="lg" data-testid="skeleton-avatar" />)
      expect(screen.getByTestId('skeleton-avatar')).toHaveStyle({ width: '48px', height: '48px' })
    })

    it('renders with xl size', () => {
      render(<SkeletonAvatar size="xl" data-testid="skeleton-avatar" />)
      expect(screen.getByTestId('skeleton-avatar')).toHaveStyle({ width: '64px', height: '64px' })
    })

    it('renders with custom numeric size', () => {
      render(<SkeletonAvatar size={56} data-testid="skeleton-avatar" />)
      expect(screen.getByTestId('skeleton-avatar')).toHaveStyle({ width: '56px', height: '56px' })
    })

    it('has correct accessibility attributes', () => {
      render(<SkeletonAvatar data-testid="skeleton-avatar" />)
      const avatar = screen.getByTestId('skeleton-avatar')
      expect(avatar).toHaveAttribute('role', 'status')
      expect(avatar).toHaveAttribute('aria-busy', 'true')
      expect(avatar).toHaveAttribute('aria-label', 'Loading avatar...')
    })
  })

  // ===== SkeletonCard Tests =====
  describe('SkeletonCard', () => {
    it('renders with default props (header, 3 body lines)', () => {
      render(<SkeletonCard data-testid="skeleton-card" />)
      const card = screen.getByTestId('skeleton-card')
      expect(card).toHaveAttribute('role', 'status')
      expect(card).toHaveAttribute('aria-busy', 'true')
      expect(card).toHaveClass('rounded-lg', 'border')
      // Should have header avatar
      expect(card.querySelector('.rounded-full')).toBeInTheDocument()
    })

    it('renders without header when showHeader is false', () => {
      render(<SkeletonCard showHeader={false} data-testid="skeleton-card" />)
      const card = screen.getByTestId('skeleton-card')
      // Should not have avatar
      expect(card.querySelector('.rounded-full')).not.toBeInTheDocument()
    })

    it('renders with image when showImage is true', () => {
      render(<SkeletonCard showImage data-testid="skeleton-card" />)
      const card = screen.getByTestId('skeleton-card')
      // Should have image placeholder with mb-4 class
      const imageElements = card.querySelectorAll('.mb-4')
      expect(imageElements.length).toBeGreaterThan(0)
    })

    it('renders with custom image height', () => {
      render(<SkeletonCard showImage imageHeight={300} data-testid="skeleton-card" />)
      const card = screen.getByTestId('skeleton-card')
      // The image is the first child with mb-4 class
      const image = card.querySelector('.mb-4')
      expect(image).toHaveStyle({ height: '300px' })
    })

    it('renders with footer when showFooter is true', () => {
      render(<SkeletonCard showFooter data-testid="skeleton-card" />)
      const card = screen.getByTestId('skeleton-card')
      // Should have footer with buttons (border-t class)
      expect(card.querySelector('.border-t')).toBeInTheDocument()
    })

    it('renders with custom number of body lines', () => {
      render(<SkeletonCard bodyLines={5} showHeader={false} data-testid="skeleton-card" />)
      const card = screen.getByTestId('skeleton-card')
      // SkeletonText with 5 lines
      const textContainer = card.querySelector('.flex.flex-col')
      expect(textContainer?.querySelectorAll('.bg-muted')).toHaveLength(5)
    })

    it('applies custom width', () => {
      render(<SkeletonCard width={400} data-testid="skeleton-card" />)
      expect(screen.getByTestId('skeleton-card')).toHaveStyle({ width: '400px' })
    })
  })

  // ===== SkeletonTable Tests =====
  describe('SkeletonTable', () => {
    it('renders with default props (5 rows, 4 columns, header)', () => {
      render(<SkeletonTable data-testid="skeleton-table" />)
      const table = screen.getByTestId('skeleton-table')
      expect(table).toHaveAttribute('role', 'status')
      expect(table).toHaveClass('border', 'rounded-lg')
      // 1 header + 5 body rows = 6 flex containers
      const rows = table.querySelectorAll('.flex.items-center')
      expect(rows).toHaveLength(6)
    })

    it('renders without header when showHeader is false', () => {
      render(<SkeletonTable showHeader={false} data-testid="skeleton-table" />)
      const table = screen.getByTestId('skeleton-table')
      // Should not have header (no bg-muted/50)
      expect(table.querySelector('.bg-muted\\/50')).not.toBeInTheDocument()
    })

    it('renders with custom number of rows', () => {
      render(<SkeletonTable rows={10} showHeader={false} data-testid="skeleton-table" />)
      const table = screen.getByTestId('skeleton-table')
      const rows = table.querySelectorAll('.flex.items-center')
      expect(rows).toHaveLength(10)
    })

    it('renders with custom number of columns', () => {
      render(<SkeletonTable rows={1} columns={6} showHeader={false} data-testid="skeleton-table" />)
      const table = screen.getByTestId('skeleton-table')
      const cells = table.querySelectorAll('.bg-muted')
      expect(cells).toHaveLength(6)
    })

    it('applies custom row height', () => {
      render(<SkeletonTable rowHeight={60} data-testid="skeleton-table" />)
      const table = screen.getByTestId('skeleton-table')
      const rows = table.querySelectorAll('.flex.items-center')
      rows.forEach((row) => {
        expect(row).toHaveStyle({ height: '60px' })
      })
    })
  })

  // ===== SkeletonList Tests =====
  describe('SkeletonList', () => {
    it('renders with default props (5 items with avatars)', () => {
      render(<SkeletonList data-testid="skeleton-list" />)
      const list = screen.getByTestId('skeleton-list')
      expect(list).toHaveAttribute('role', 'status')
      // 5 items
      const items = list.querySelectorAll('.flex.items-center')
      expect(items).toHaveLength(5)
      // Each item has avatar
      const avatars = list.querySelectorAll('.rounded-full')
      expect(avatars).toHaveLength(5)
    })

    it('renders without avatars when showAvatar is false', () => {
      render(<SkeletonList showAvatar={false} data-testid="skeleton-list" />)
      const list = screen.getByTestId('skeleton-list')
      expect(list.querySelector('.rounded-full')).not.toBeInTheDocument()
    })

    it('renders with custom number of items', () => {
      render(<SkeletonList items={8} data-testid="skeleton-list" />)
      const list = screen.getByTestId('skeleton-list')
      const items = list.querySelectorAll('.flex.items-center')
      expect(items).toHaveLength(8)
    })

    it('applies custom gap between items', () => {
      render(<SkeletonList gap={24} data-testid="skeleton-list" />)
      expect(screen.getByTestId('skeleton-list')).toHaveStyle({ gap: '24px' })
    })
  })

  // ===== SkeletonButton Tests =====
  describe('SkeletonButton', () => {
    it('renders with default size (md)', () => {
      render(<SkeletonButton data-testid="skeleton-button" />)
      const button = screen.getByTestId('skeleton-button')
      expect(button).toHaveStyle({ width: '80px', height: '36px' })
    })

    it('renders with sm size', () => {
      render(<SkeletonButton size="sm" data-testid="skeleton-button" />)
      expect(screen.getByTestId('skeleton-button')).toHaveStyle({ width: '60px', height: '32px' })
    })

    it('renders with lg size', () => {
      render(<SkeletonButton size="lg" data-testid="skeleton-button" />)
      expect(screen.getByTestId('skeleton-button')).toHaveStyle({ width: '100px', height: '40px' })
    })

    it('has correct accessibility attributes', () => {
      render(<SkeletonButton data-testid="skeleton-button" />)
      const button = screen.getByTestId('skeleton-button')
      expect(button).toHaveAttribute('role', 'status')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveAttribute('aria-label', 'Loading button...')
    })
  })

  // ===== SkeletonInput Tests =====
  describe('SkeletonInput', () => {
    it('renders with default size (md)', () => {
      render(<SkeletonInput data-testid="skeleton-input" />)
      const input = screen.getByTestId('skeleton-input')
      const skeleton = input.querySelector('.bg-muted')
      expect(skeleton).toHaveStyle({ height: '40px' })
    })

    it('renders with sm size', () => {
      render(<SkeletonInput size="sm" data-testid="skeleton-input" />)
      const skeleton = screen.getByTestId('skeleton-input').querySelector('.bg-muted')
      expect(skeleton).toHaveStyle({ height: '32px' })
    })

    it('renders with lg size', () => {
      render(<SkeletonInput size="lg" data-testid="skeleton-input" />)
      const skeleton = screen.getByTestId('skeleton-input').querySelector('.bg-muted')
      expect(skeleton).toHaveStyle({ height: '48px' })
    })

    it('renders with label when showLabel is true', () => {
      render(<SkeletonInput showLabel data-testid="skeleton-input" />)
      const skeletons = screen.getByTestId('skeleton-input').querySelectorAll('.bg-muted')
      // Label + input = 2 skeletons
      expect(skeletons).toHaveLength(2)
    })

    it('renders without label by default', () => {
      render(<SkeletonInput data-testid="skeleton-input" />)
      const skeletons = screen.getByTestId('skeleton-input').querySelectorAll('.bg-muted')
      // Just input = 1 skeleton
      expect(skeletons).toHaveLength(1)
    })

    it('applies custom width', () => {
      render(<SkeletonInput width="300px" data-testid="skeleton-input" />)
      const skeleton = screen.getByTestId('skeleton-input').querySelector('.bg-muted')
      expect(skeleton).toHaveStyle({ width: '300px' })
    })
  })

  // ===== Accessibility Tests =====
  describe('Accessibility', () => {
    it('all skeleton variants have role="status"', () => {
      const { rerender } = render(<Skeleton data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')

      rerender(<SkeletonText data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')

      rerender(<SkeletonAvatar data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')

      rerender(<SkeletonCard data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')

      rerender(<SkeletonTable data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')

      rerender(<SkeletonList data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')

      rerender(<SkeletonButton data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')

      rerender(<SkeletonInput data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('role', 'status')
    })

    it('all skeleton variants have aria-busy="true"', () => {
      const { rerender } = render(<Skeleton data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')

      rerender(<SkeletonText data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')

      rerender(<SkeletonAvatar data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')

      rerender(<SkeletonCard data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')

      rerender(<SkeletonTable data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')

      rerender(<SkeletonList data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')

      rerender(<SkeletonButton data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')

      rerender(<SkeletonInput data-testid="skeleton" />)
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-busy', 'true')
    })

    it('supports custom aria-label for screen readers', () => {
      render(
        <>
          <Skeleton aria-label="Loading profile" data-testid="s1" />
          <SkeletonText aria-label="Loading bio" data-testid="s2" />
          <SkeletonAvatar aria-label="Loading user avatar" data-testid="s3" />
          <SkeletonCard aria-label="Loading post" data-testid="s4" />
          <SkeletonTable aria-label="Loading data table" data-testid="s5" />
          <SkeletonList aria-label="Loading notifications" data-testid="s6" />
          <SkeletonButton aria-label="Loading action" data-testid="s7" />
          <SkeletonInput aria-label="Loading form field" data-testid="s8" />
        </>
      )

      expect(screen.getByTestId('s1')).toHaveAttribute('aria-label', 'Loading profile')
      expect(screen.getByTestId('s2')).toHaveAttribute('aria-label', 'Loading bio')
      expect(screen.getByTestId('s3')).toHaveAttribute('aria-label', 'Loading user avatar')
      expect(screen.getByTestId('s4')).toHaveAttribute('aria-label', 'Loading post')
      expect(screen.getByTestId('s5')).toHaveAttribute('aria-label', 'Loading data table')
      expect(screen.getByTestId('s6')).toHaveAttribute('aria-label', 'Loading notifications')
      expect(screen.getByTestId('s7')).toHaveAttribute('aria-label', 'Loading action')
      expect(screen.getByTestId('s8')).toHaveAttribute('aria-label', 'Loading form field')
    })

    it('child elements are hidden from screen readers', () => {
      render(<SkeletonCard data-testid="skeleton-card" />)
      const card = screen.getByTestId('skeleton-card')
      const childSkeletons = card.querySelectorAll('[aria-hidden="true"]')
      // Should have multiple aria-hidden children
      expect(childSkeletons.length).toBeGreaterThan(0)
    })
  })
})
