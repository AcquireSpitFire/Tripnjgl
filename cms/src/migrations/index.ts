import * as migration_20261113_123912_initial from './20261113_123912_initial';
import * as migration_20261113_214904_site_settings from './20261113_214904_site_settings';
import * as migration_20261116_212625_release_visibility from './20261116_212625_release_visibility';

export const migrations = [
  {
    up: migration_20261113_123912_initial.up,
    down: migration_20261113_123912_initial.down,
    name: '20261113_123912_initial',
  },
  {
    up: migration_20261113_214904_site_settings.up,
    down: migration_20261113_214904_site_settings.down,
    name: '20261113_214904_site_settings',
  },
  {
    up: migration_20261116_212625_release_visibility.up,
    down: migration_20261116_212625_release_visibility.down,
    name: '20261116_212625_release_visibility'
  },
];
