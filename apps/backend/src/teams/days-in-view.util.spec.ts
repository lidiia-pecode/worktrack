import { closedSpellsIn, daysOutside, movesIn } from './days-in-view.util';

const WEEK = { from: '2026-02-09', to: '2026-02-15' };

describe('days in view', () => {
  it('sees no gap and no move for a manager who leads both teams', () => {
    const bothTeams = [
      { from: '2026-01-01', until: '2026-02-12' },
      { from: '2026-02-12', until: null },
    ];

    expect(daysOutside(WEEK, bothTeams)).toEqual([]);
    expect(movesIn(WEEK, bothTeams)).toEqual([]);
  });

  it('closes the gap between two spells, with a move at each end', () => {
    const awayMidWeek = [
      { from: '2026-01-01', until: '2026-02-11' },
      { from: '2026-02-13', until: null },
    ];

    expect(closedSpellsIn(WEEK, awayMidWeek, [])).toEqual([
      { from: '2026-02-11', until: '2026-02-13', reason: 'outside-team' },
    ]);
    expect(movesIn(WEEK, awayMidWeek)).toEqual([
      { date: '2026-02-11', direction: 'out' },
      { date: '2026-02-13', direction: 'in' },
    ]);
  });

  it('closes the whole range when no day is in view', () => {
    expect(daysOutside(WEEK, [])).toEqual([
      { from: '2026-02-09', until: '2026-02-16' },
    ]);
  });
});
