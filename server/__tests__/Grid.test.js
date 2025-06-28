import Grid, { DEFAULT_COLUMNS, MIN_ROWS } from '../grid/Grid.js';

describe('Grid', () => {
  it('initializes with correct default columns and minimum rows', () => {
    const grid = new Grid(2); // less than MIN_ROWS
    expect(grid.columns).toBe(DEFAULT_COLUMNS);
    expect(grid.rows).toBe(MIN_ROWS);
    expect(grid.cells.length).toBe(MIN_ROWS);
    expect(grid.cells[0].length).toBe(DEFAULT_COLUMNS);
  });

  it('scales rows with player count when above minimum', () => {
    const grid = new Grid(5);
    expect(grid.rows).toBe(MIN_ROWS); // 5 < MIN_ROWS, so MIN_ROWS is used
    grid.setPlayerCount(10); // 10 > MIN_ROWS
    expect(grid.rows).toBe(10);
    grid.setPlayerCount(3); // 3 < MIN_ROWS, so MIN_ROWS is used
    expect(grid.rows).toBe(MIN_ROWS);
  });

  it('marks leftmost column as castle and rightmost column as portal', () => {
    const grid = new Grid(3);
    for (let row = 0; row < grid.rows; row++) {
      expect(grid.getCell(row, 0)).toEqual({ type: 'castle' });
      expect(grid.getCell(row, grid.columns - 1)).toEqual({ type: 'portal' });
    }
    expect(grid.isCastleCell(0)).toBe(true);
    expect(grid.isPortalCell(grid.columns - 1)).toBe(true);
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
