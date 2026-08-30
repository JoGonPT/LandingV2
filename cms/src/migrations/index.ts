import * as migration_20260830_162937_inicial from './20260830_162937_inicial';

export const migrations = [
  {
    up: migration_20260830_162937_inicial.up,
    down: migration_20260830_162937_inicial.down,
    name: '20260830_162937_inicial'
  },
];
