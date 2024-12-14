import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Actions from './Actions.svelte';

describe('Actions Component', () => {
  it('should display the Actions section', () => {
    render(Actions, { actions: [], isLoading: false });
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should display the edit button', () => {
    render(Actions, { actions: [], isLoading: false });
    expect(screen.getByTitle('edit actions configuration')).toBeInTheDocument();
  });

  it('should display actions when available', () => {
    const actions = [{ name: 'Action 1' }, { name: 'Action 2' }];
    render(Actions, { actions, isLoading: false });
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  // it('should show no actions message when no actions are available', () => {
  //   render(Actions, { actions: [], isLoading: false });
  //   expect(screen.getByText('No actions found')).toBeInTheDocument();
  // });
});