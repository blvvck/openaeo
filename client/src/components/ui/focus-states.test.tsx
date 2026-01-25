

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import {
  FocusRing,
  FocusTrap,
  SkipToContent,
  FocusIndicator,
  useFocusReturn,
  useFocusWithin,
  useKeyboardNavigation,
  getFocusRingClasses,
  getFocusableElements,
  focusFirstElement,
  focusLastElement,
  focusClasses,
  getFocusClasses,
  FOCUS_RING_VARIANTS,
  prefersReducedMotion,
} from './focus-states';

// ===== FocusRing Component Tests =====
describe('FocusRing', () => {
  it('renders children correctly', () => {
    render(
      <FocusRing>
        <button>Click me</button>
      </FocusRing>
    );
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies default focus ring variant', () => {
    const { container } = render(
      <FocusRing>
        <span>Content</span>
      </FocusRing>
    );
    expect(container.firstChild).toHaveClass('focus-within:outline-none');
  });

  it('applies visible focus ring when visible prop is true', () => {
    const { container } = render(
      <FocusRing visible>
        <span>Content</span>
      </FocusRing>
    );
    // Should have ring classes applied directly
    expect(container.firstChild).toHaveClass('ring-2');
  });

  it('supports different variants', () => {
    const { container, rerender } = render(
      <FocusRing variant="primary" visible>
        <span>Content</span>
      </FocusRing>
    );
    expect(container.firstChild).toHaveClass('ring-primary');

    rerender(
      <FocusRing variant="destructive" visible>
        <span>Content</span>
      </FocusRing>
    );
    expect(container.firstChild).toHaveClass('ring-destructive');
  });

  it('supports custom className', () => {
    const { container } = render(
      <FocusRing className="custom-class">
        <span>Content</span>
      </FocusRing>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('supports rendering as different element', () => {
    render(
      <FocusRing as="span" data-testid="focus-ring">
        <span>Content</span>
      </FocusRing>
    );
    const element = screen.getByTestId('focus-ring');
    expect(element.tagName).toBe('SPAN');
  });

  it('includes reduced motion support', () => {
    const { container } = render(
      <FocusRing>
        <span>Content</span>
      </FocusRing>
    );
    expect(container.firstChild).toHaveClass('motion-reduce:transition-none');
  });
});

// ===== FocusTrap Component Tests =====
describe('FocusTrap', () => {
  it('renders children', () => {
    render(
      <FocusTrap>
        <button>Button 1</button>
        <button>Button 2</button>
      </FocusTrap>
    );
    expect(screen.getByRole('button', { name: /button 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /button 2/i })).toBeInTheDocument();
  });

  it('has dialog role when active', () => {
    render(
      <FocusTrap active>
        <button>Button</button>
      </FocusTrap>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('sets aria-modal when active', () => {
    render(
      <FocusTrap active>
        <button>Button</button>
      </FocusTrap>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('focuses first focusable element when activated', async () => {
    render(
      <FocusTrap active>
        <button>First</button>
        <button>Second</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /first/i })).toHaveFocus();
    });
  });

  it('focuses element matching initialFocus selector', async () => {
    render(
      <FocusTrap active initialFocus="[data-initial]">
        <button>First</button>
        <button data-initial>Second</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /second/i })).toHaveFocus();
    });
  });

  it('traps focus on Tab at last element', async () => {
    const user = userEvent.setup();
    render(
      <FocusTrap active>
        <button>First</button>
        <button>Last</button>
      </FocusTrap>
    );

    // Wait for initial focus
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /first/i })).toHaveFocus();
    });

    // Tab to last
    await user.tab();
    expect(screen.getByRole('button', { name: /last/i })).toHaveFocus();

    // Tab again should loop to first
    await user.tab();
    expect(screen.getByRole('button', { name: /first/i })).toHaveFocus();
  });

  it('traps focus on Shift+Tab at first element', async () => {
    const user = userEvent.setup();
    render(
      <FocusTrap active>
        <button>First</button>
        <button>Last</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /first/i })).toHaveFocus();
    });

    // Shift+Tab should loop to last
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: /last/i })).toHaveFocus();
  });

  it('calls onEscape when Escape is pressed', async () => {
    const onEscape = vi.fn();
    const user = userEvent.setup();

    render(
      <FocusTrap active onEscape={onEscape}>
        <button>Button</button>
      </FocusTrap>
    );

    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not trap focus when inactive', () => {
    render(
      <FocusTrap active={false}>
        <button>Button</button>
      </FocusTrap>
    );

    expect(screen.queryByRole('dialog')).not.toHaveAttribute('aria-modal', 'true');
  });

  it('supports custom className', () => {
    render(
      <FocusTrap className="custom-trap">
        <button>Button</button>
      </FocusTrap>
    );
    expect(screen.getByRole('dialog')).toHaveClass('custom-trap');
  });
});

// ===== SkipToContent Component Tests =====
describe('SkipToContent', () => {
  beforeEach(() => {
    // Create target element
    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    document.body.appendChild(main);
  });

  afterEach(() => {
    const main = document.getElementById('main-content');
    if (main) main.remove();
  });

  it('renders skip link with default text', () => {
    render(<SkipToContent targetId="main-content" />);
    expect(screen.getByRole('link', { name: /skip to content/i })).toBeInTheDocument();
  });

  it('renders custom text', () => {
    render(<SkipToContent targetId="main-content">Skip to main</SkipToContent>);
    expect(screen.getByRole('link', { name: /skip to main/i })).toBeInTheDocument();
  });

  it('has correct href', () => {
    render(<SkipToContent targetId="main-content" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '#main-content');
  });

  it('focuses target element on click', async () => {
    const user = userEvent.setup();
    render(<SkipToContent targetId="main-content" />);

    const link = screen.getByRole('link');
    await user.click(link);

    expect(document.getElementById('main-content')).toHaveFocus();
  });

  it('is visually hidden until focused', () => {
    render(<SkipToContent targetId="main-content" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('-translate-y-full');
    expect(link).toHaveClass('opacity-0');
  });

  it('becomes visible on focus', async () => {
    const user = userEvent.setup();
    render(<SkipToContent targetId="main-content" />);

    const link = screen.getByRole('link');
    await user.tab();

    expect(link).toHaveClass('focus:translate-y-0');
    expect(link).toHaveClass('focus:opacity-100');
  });

  it('has focus ring styles', () => {
    render(<SkipToContent targetId="main-content" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('focus:ring-2');
  });

  it('supports custom className', () => {
    render(<SkipToContent targetId="main-content" className="custom-skip" />);
    expect(screen.getByRole('link')).toHaveClass('custom-skip');
  });

  it('has high z-index for visibility', () => {
    render(<SkipToContent targetId="main-content" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('z-[9999]');
  });
});

// ===== FocusIndicator Component Tests =====
describe('FocusIndicator', () => {
  it('renders children', () => {
    render(
      <FocusIndicator show={false}>
        <button>Click me</button>
      </FocusIndicator>
    );
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('shows focus ring when show is true', () => {
    const { container } = render(
      <FocusIndicator show>
        <span>Content</span>
      </FocusIndicator>
    );
    expect(container.firstChild).toHaveClass('ring-2');
  });

  it('hides focus ring when show is false', () => {
    const { container } = render(
      <FocusIndicator show={false}>
        <span>Content</span>
      </FocusIndicator>
    );
    expect(container.firstChild).not.toHaveClass('ring-2');
  });

  it('supports different variants', () => {
    const { container } = render(
      <FocusIndicator show variant="primary">
        <span>Content</span>
      </FocusIndicator>
    );
    expect(container.firstChild).toHaveClass('ring-primary');
  });

  it('supports inset position', () => {
    const { container } = render(
      <FocusIndicator show position="inside">
        <span>Content</span>
      </FocusIndicator>
    );
    expect(container.firstChild).toHaveClass('ring-inset');
  });

  it('includes reduced motion support', () => {
    const { container } = render(
      <FocusIndicator show>
        <span>Content</span>
      </FocusIndicator>
    );
    expect(container.firstChild).toHaveClass('motion-reduce:transition-none');
    expect(container.firstChild).toHaveClass('motion-reduce:animate-none');
  });

  it('supports custom className', () => {
    const { container } = render(
      <FocusIndicator show className="custom-indicator">
        <span>Content</span>
      </FocusIndicator>
    );
    expect(container.firstChild).toHaveClass('custom-indicator');
  });
});

// ===== useFocusReturn Hook Tests =====
describe('useFocusReturn', () => {
  function TestComponent({ active }: { active: boolean }) {
    const { returnFocus } = useFocusReturn(active);

    return (
      <div>
        <button>Trigger</button>
        {active && (
          <div>
            <button onClick={returnFocus}>Close</button>
          </div>
        )}
      </div>
    );
  }

  it('returns focus to trigger element', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TestComponent active={false} />);

    const trigger = screen.getByRole('button', { name: /trigger/i });
    await user.click(trigger);
    expect(trigger).toHaveFocus();

    rerender(<TestComponent active={true} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});

// ===== useFocusWithin Hook Tests =====
describe('useFocusWithin', () => {
  function TestComponent() {
    const { ref, isFocusWithin } = useFocusWithin<HTMLDivElement>();

    return (
      <div ref={ref} data-testid="container" data-focus-within={isFocusWithin}>
        <input placeholder="Input" />
        <button>Button</button>
      </div>
    );
  }

  it('detects focus within container', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    const container = screen.getByTestId('container');
    expect(container).toHaveAttribute('data-focus-within', 'false');

    await user.click(screen.getByPlaceholderText('Input'));

    expect(container).toHaveAttribute('data-focus-within', 'true');
  });

  it('detects focus leaving container', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TestComponent />
        <button>Outside</button>
      </div>
    );

    const container = screen.getByTestId('container');
    await user.click(screen.getByPlaceholderText('Input'));
    expect(container).toHaveAttribute('data-focus-within', 'true');

    await user.click(screen.getByRole('button', { name: /outside/i }));
    expect(container).toHaveAttribute('data-focus-within', 'false');
  });
});

// ===== useKeyboardNavigation Hook Tests =====
describe('useKeyboardNavigation', () => {
  function TestList({ onSelect }: { onSelect?: (index: number) => void }) {
    const { containerRef, handleKeyDown, getItemProps, activeIndex } = useKeyboardNavigation<HTMLUListElement>({
      orientation: 'vertical',
      onSelect,
    });

    return (
      <ul ref={containerRef} onKeyDown={handleKeyDown} data-testid="list">
        {['Item 1', 'Item 2', 'Item 3'].map((item, index) => (
          <li key={item}>
            {/* All buttons remain tabIndex=0 so they're found by getFocusableElements */}
            <button tabIndex={0} data-active={getItemProps(index)['data-active']} data-active-index={activeIndex}>
              {item}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  it('navigates with arrow keys', async () => {
    render(<TestList />);
    const list = screen.getByTestId('list');
    const firstButton = screen.getByRole('button', { name: /item 1/i });

    // Focus first item
    firstButton.focus();
    expect(firstButton).toHaveFocus();

    // Navigate down - fireEvent on container since that's where onKeyDown is
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: /item 2/i })).toHaveFocus();

    // Navigate down again
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: /item 3/i })).toHaveFocus();
  });

  it('loops navigation at boundaries', async () => {
    render(<TestList />);
    const list = screen.getByTestId('list');
    const lastButton = screen.getByRole('button', { name: /item 3/i });

    lastButton.focus();
    expect(lastButton).toHaveFocus();

    // Navigate down at end should loop to first
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: /item 1/i })).toHaveFocus();
  });

  it('supports Home and End keys', async () => {
    render(<TestList />);
    const list = screen.getByTestId('list');
    const secondButton = screen.getByRole('button', { name: /item 2/i });

    secondButton.focus();
    expect(secondButton).toHaveFocus();

    // Home goes to first
    fireEvent.keyDown(list, { key: 'Home' });
    expect(screen.getByRole('button', { name: /item 1/i })).toHaveFocus();

    // End goes to last
    fireEvent.keyDown(list, { key: 'End' });
    expect(screen.getByRole('button', { name: /item 3/i })).toHaveFocus();
  });

  it('calls onSelect on Enter', async () => {
    const onSelect = vi.fn();
    render(<TestList onSelect={onSelect} />);
    const list = screen.getByTestId('list');
    const firstButton = screen.getByRole('button', { name: /item 1/i });

    firstButton.focus();
    fireEvent.keyDown(list, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('sets data-active attribute based on active state', () => {
    render(<TestList />);

    const firstButton = screen.getByRole('button', { name: /item 1/i });
    const secondButton = screen.getByRole('button', { name: /item 2/i });

    // First item should have data-active (from getItemProps)
    expect(firstButton).toHaveAttribute('data-active', '');
    // Other items should not have data-active
    expect(secondButton).not.toHaveAttribute('data-active');
  });

  it('getItemProps returns correct tabIndex values', () => {
    // Test the hook independently
    function TestItemProps() {
      const { getItemProps } = useKeyboardNavigation<HTMLDivElement>();
      const firstProps = getItemProps(0);
      const secondProps = getItemProps(1);

      return (
        <div>
          <span data-testid="first-tabindex">{firstProps.tabIndex}</span>
          <span data-testid="second-tabindex">{secondProps.tabIndex}</span>
        </div>
      );
    }

    render(<TestItemProps />);

    // First item (index 0, matches initialIndex) should have tabIndex 0
    expect(screen.getByTestId('first-tabindex')).toHaveTextContent('0');
    // Second item should have tabIndex -1
    expect(screen.getByTestId('second-tabindex')).toHaveTextContent('-1');
  });
});

// ===== Utility Function Tests =====
describe('getFocusRingClasses', () => {
  it('returns default focus ring classes', () => {
    const classes = getFocusRingClasses();
    expect(classes).toContain('focus-visible:ring-2');
    expect(classes).toContain('focus-visible:ring-ring');
  });

  it('returns classes for different variants', () => {
    const primary = getFocusRingClasses('primary');
    expect(primary).toContain('focus-visible:ring-primary');

    const destructive = getFocusRingClasses('destructive');
    expect(destructive).toContain('focus-visible:ring-destructive');
  });

  it('returns always-visible classes when alwaysShow is true', () => {
    const classes = getFocusRingClasses('default', { alwaysShow: true });
    expect(classes).not.toContain('focus-visible:');
    expect(classes).toContain('ring-2');
  });

  it('uses focus instead of focus-visible when focusVisible is false', () => {
    const classes = getFocusRingClasses('default', { focusVisible: false });
    expect(classes).toContain('focus:ring-2');
    expect(classes).not.toContain('focus-visible:');
  });
});

describe('getFocusableElements', () => {
  it('finds all focusable elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>Button</button>
      <a href="#">Link</a>
      <input type="text" />
      <select><option>Option</option></select>
      <textarea></textarea>
      <div tabindex="0">Div</div>
    `;
    document.body.appendChild(container);

    const focusable = getFocusableElements(container);
    expect(focusable).toHaveLength(6);

    container.remove();
  });

  it('excludes disabled elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>Enabled</button>
      <button disabled>Disabled</button>
    `;
    document.body.appendChild(container);

    const focusable = getFocusableElements(container);
    expect(focusable).toHaveLength(1);

    container.remove();
  });

  it('excludes hidden elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>Visible</button>
      <button hidden>Hidden</button>
    `;
    document.body.appendChild(container);

    const focusable = getFocusableElements(container);
    expect(focusable).toHaveLength(1);

    container.remove();
  });

  it('excludes tabindex=-1 elements', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>Normal</button>
      <button tabindex="-1">Skipped</button>
    `;
    document.body.appendChild(container);

    const focusable = getFocusableElements(container);
    expect(focusable).toHaveLength(1);

    container.remove();
  });
});

describe('focusFirstElement', () => {
  it('focuses the first focusable element', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>First</button>
      <button>Second</button>
    `;
    document.body.appendChild(container);

    const result = focusFirstElement(container);
    expect(result).toBe(true);
    expect(document.activeElement?.textContent).toBe('First');

    container.remove();
  });

  it('returns false when no focusable elements', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span>No focusable</span>';
    document.body.appendChild(container);

    const result = focusFirstElement(container);
    expect(result).toBe(false);

    container.remove();
  });
});

describe('focusLastElement', () => {
  it('focuses the last focusable element', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <button>First</button>
      <button>Last</button>
    `;
    document.body.appendChild(container);

    const result = focusLastElement(container);
    expect(result).toBe(true);
    expect(document.activeElement?.textContent).toBe('Last');

    container.remove();
  });
});

// ===== CSS Classes Tests =====
describe('focusClasses', () => {
  it('has ring variant', () => {
    expect(focusClasses.ring).toContain('focus-visible:ring-2');
    expect(focusClasses.ring).toContain('focus-visible:ring-ring');
  });

  it('has ringInset variant', () => {
    expect(focusClasses.ringInset).toContain('focus-visible:ring-inset');
  });

  it('has ringOffset variant', () => {
    expect(focusClasses.ringOffset).toContain('focus-visible:ring-offset-4');
  });

  it('has ringPrimary variant', () => {
    expect(focusClasses.ringPrimary).toContain('focus-visible:ring-primary');
  });

  it('has within variant for containers', () => {
    expect(focusClasses.within).toContain('focus-within:ring-2');
  });

  it('has none variant', () => {
    expect(focusClasses.none).toContain('focus:outline-none');
  });

  it('has transition classes', () => {
    expect(focusClasses.transition).toContain('transition-shadow');
    expect(focusClasses.transition).toContain('motion-reduce:transition-none');
  });
});

describe('getFocusClasses', () => {
  it('returns focus classes with transition', () => {
    const classes = getFocusClasses('ring');
    expect(classes).toContain('focus-visible:ring-2');
    expect(classes).toContain('transition-shadow');
  });

  it('defaults to ring variant', () => {
    const classes = getFocusClasses();
    expect(classes).toContain('focus-visible:ring-2');
  });
});

// ===== Constants Tests =====
describe('FOCUS_RING_VARIANTS', () => {
  it('has default variant', () => {
    expect(FOCUS_RING_VARIANTS.default).toContain('ring-2');
    expect(FOCUS_RING_VARIANTS.default).toContain('ring-ring');
  });

  it('has inset variant', () => {
    expect(FOCUS_RING_VARIANTS.inset).toContain('ring-inset');
  });

  it('has offset variant', () => {
    expect(FOCUS_RING_VARIANTS.offset).toContain('ring-offset-4');
  });

  it('has all color variants', () => {
    expect(FOCUS_RING_VARIANTS.primary).toContain('ring-primary');
    expect(FOCUS_RING_VARIANTS.secondary).toContain('ring-secondary');
    expect(FOCUS_RING_VARIANTS.accent).toContain('ring-accent');
    expect(FOCUS_RING_VARIANTS.destructive).toContain('ring-destructive');
    expect(FOCUS_RING_VARIANTS.success).toContain('ring-success');
  });
});

// ===== Accessibility Tests =====
describe('Accessibility', () => {
  it('FocusTrap has proper ARIA attributes', () => {
    render(
      <FocusTrap active>
        <button>Content</button>
      </FocusTrap>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('tabindex', '-1');
  });

  it('SkipToContent is keyboard accessible', async () => {
    const main = document.createElement('main');
    main.id = 'main';
    main.tabIndex = -1;
    document.body.appendChild(main);

    render(<SkipToContent targetId="main" />);

    // Directly focus the skip link (happy-dom tab order differs from browsers)
    const link = screen.getByRole('link');
    link.focus();
    expect(link).toHaveFocus();

    // Pressing Enter should skip to main
    fireEvent.click(link);
    expect(document.getElementById('main')).toHaveFocus();

    main.remove();
  });

  it('keyboard navigation supports screen reader announcements', () => {
    function TestList() {
      const { containerRef, handleKeyDown, getItemProps } = useKeyboardNavigation<HTMLUListElement>();

      return (
        <ul
          ref={containerRef}
          onKeyDown={handleKeyDown}
          role="listbox"
          aria-label="Options"
        >
          {['Option 1', 'Option 2'].map((item, index) => (
            <li key={item} role="option" aria-selected={getItemProps(index).tabIndex === 0}>
              <button {...getItemProps(index)}>{item}</button>
            </li>
          ))}
        </ul>
      );
    }

    render(<TestList />);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Options');

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('FocusIndicator supports reduced motion', () => {
    const { container } = render(
      <FocusIndicator show animated>
        <button>Content</button>
      </FocusIndicator>
    );

    expect(container.firstChild).toHaveClass('motion-reduce:transition-none');
    expect(container.firstChild).toHaveClass('motion-reduce:animate-none');
  });

  it('focus ring classes include transition for smooth focus', () => {
    expect(focusClasses.transition).toContain('duration-200');
  });
});

// ===== Integration Tests =====
describe('Integration', () => {
  it('FocusTrap with SkipToContent works together', async () => {
    const user = userEvent.setup();

    const main = document.createElement('main');
    main.id = 'main-content';
    main.tabIndex = -1;
    document.body.appendChild(main);

    render(
      <>
        <SkipToContent targetId="main-content" />
        <FocusTrap active>
          <button>First</button>
          <button>Last</button>
        </FocusTrap>
      </>
    );

    // Skip link exists and is focusable
    const skipLink = screen.getByRole('link');
    expect(skipLink).toBeInTheDocument();

    // FocusTrap auto-focuses first element
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /first/i })).toHaveFocus();
    });

    // Skip link click navigates to target
    skipLink.focus();
    fireEvent.click(skipLink);
    expect(document.getElementById('main-content')).toHaveFocus();

    main.remove();
  });

  it('multiple focus traps can exist (only active one traps)', async () => {
    render(
      <>
        <FocusTrap active={false}>
          <button>Trap 1</button>
        </FocusTrap>
        <FocusTrap active>
          <button>Trap 2 First</button>
          <button>Trap 2 Last</button>
        </FocusTrap>
      </>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /trap 2 first/i })).toHaveFocus();
    });
  });

  it('focus indicator with keyboard navigation', async () => {
    function TestNav() {
      const { containerRef, handleKeyDown, activeIndex } = useKeyboardNavigation<HTMLElement>();

      return (
        <nav ref={containerRef} onKeyDown={handleKeyDown} data-testid="test-nav">
          {['Home', 'About', 'Contact'].map((item, index) => (
            <FocusIndicator key={item} show={activeIndex === index}>
              {/* Keep all buttons tabIndex=0 so navigation works */}
              <button tabIndex={0}>{item}</button>
            </FocusIndicator>
          ))}
        </nav>
      );
    }

    const { container } = render(<TestNav />);
    const nav = screen.getByTestId('test-nav');

    // First item should have focus indicator
    const firstIndicator = container.querySelector('[class*="ring-2"]');
    expect(firstIndicator).toBeTruthy();

    // Focus first button
    const homeButton = screen.getByRole('button', { name: /home/i });
    homeButton.focus();
    expect(homeButton).toHaveFocus();

    // Navigate down using fireEvent on the nav container
    fireEvent.keyDown(nav, { key: 'ArrowDown' });

    // Now second item should have focus
    expect(screen.getByRole('button', { name: /about/i })).toHaveFocus();
  });
});

// ===== Re-export Tests =====
describe('Re-exports', () => {
  it('exports prefersReducedMotion from motion.ts', () => {
    expect(typeof prefersReducedMotion).toBe('function');
  });
});
