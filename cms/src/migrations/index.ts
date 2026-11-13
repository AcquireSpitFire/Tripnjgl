import * as migration_20261113_123912_initial from './20261113_123912_initial';

export const migrations = [
  {
    up: migration_20261113_123912_initial.up,
    down: migration_20261113_123912_initial.down,
    name: '20261113_123912_initial'
  },
];
