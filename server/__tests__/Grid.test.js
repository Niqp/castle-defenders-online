import Grid, { DEFAULT_ROWS, MIN_COLUMNS } from '../grid/Grid.js';

describe('Grid', () => {
  it('initializes with correct default rows and minimum columns', () => {
    const grid = new Grid(2); // less than MIN_COLUMNS
    expect(grid.rows).toBe(DEFAULT_ROWS);
    expect(grid.columns).toBe(MIN_COLUMNS);
    expect(grid.cells.length).toBe(DEFAULT_ROWS);
    expect(grid.cells[0].length).toBe(MIN_COLUMNS);
  });

  it('scales columns with player count', () => {
    const grid = new Grid(5);
    expect(grid.columns).toBe(5);
    grid.setPlayerCount(7);
    expect(grid.columns).toBe(7);
    grid.setPlayerCount(3);
    expect(grid.columns).toBe(3);
  });

  it('marks top row as portal and bottom row as castle', () => {
    const grid = new Grid(3);
    for (let col = 0; col < grid.columns; col++) {
      expect(grid.getCell(0, col)).toEqual({ type: 'portal' });
      expect(grid.getCell(grid.rows - 1, col)).toEqual({ type: 'castle' });
    }
    expect(grid.isPortalCell(0)).toBe(true);
    expect(grid.isCastleCell(grid.rows - 1)).toBe(true);
  });

  it('adds and removes units in cells', () => {
    const grid = new Grid(3);
    const dummyUnit = { id: 'u1' };
    grid.addUnitToCell(2, 1, dummyUnit);
    expect(grid.getUnitsInCell(2, 1)).toContain(dummyUnit);
    grid.removeUnitFromCell(2, 1, 'u1');
    expect(grid.getUnitsInCell(2, 1)).not.toContain(dummyUnit);
  });

  it('returns empty array for empty cells', () => {
    const grid = new Grid(3);
    expect(grid.getUnitsInCell(5, 2)).toEqual([]);
  });

  it('does not allow out-of-bounds access', () => {
    const grid = new Grid(3);
    expect(grid.getCell(-1, 0)).toBeNull();
    expect(grid.getCell(0, -1)).toBeNull();
    expect(grid.getCell(grid.rows, 0)).toBeNull();
    expect(grid.getCell(0, grid.columns)).toBeNull();
  });
});
