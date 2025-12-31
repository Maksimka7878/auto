import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import CustomNode from './CustomNode';

describe('CustomNode', () => {
  const defaultProps = {
    id: 'test-node',
    type: 'custom',
    selected: false,
    data: {
      label: 'Test Node',
      nodeType: 'webhook',
      config: {},
    },
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    isConnectable: true,
    dragging: false,
  };

  const renderNode = (props = {}) => {
    return render(
      <ReactFlowProvider>
        <CustomNode {...defaultProps} {...props} />
      </ReactFlowProvider>
    );
  };

  it('renders node with label', () => {
    renderNode();
    expect(screen.getByText('Test Node')).toBeDefined();
  });

  it('renders node type', () => {
    renderNode();
    expect(screen.getByText(/webhook/i)).toBeDefined();
  });

  it('applies selected styles when selected', () => {
    const { container } = renderNode({ selected: true });
    const node = container.firstChild as HTMLElement;
    expect(node.className).toContain('border-primary-500');
  });

  it('renders different icons for different node types', () => {
    const { rerender } = renderNode({ data: { ...defaultProps.data, nodeType: 'send_email' } });
    expect(screen.getByText(/email/i)).toBeDefined();
  });
});
