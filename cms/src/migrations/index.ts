import * as migration_20261113_123912_initial from './20261113_123912_initial';
import * as migration_20261113_214904_site_settings from './20261113_214904_site_settings';

export const migrations = [
  {
    up: migration_20261113_123912_initial.up,
    down: migration_20261113_123912_initial.down,
    name: '20261113_123912_initial',
  },
  {
    up: migration_20261113_214904_site_settings.up,
    down: migration_20261113_214904_site_settings.down,
    name: '20261113_214904_site_settings'
  },
];
