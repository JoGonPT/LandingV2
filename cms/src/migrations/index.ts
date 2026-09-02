import * as migration_20260830_162937_inicial from './20260830_162937_inicial';
import * as migration_20260830_183855_globais from './20260830_183855_globais';
import * as migration_20260830_191336_listas from './20260830_191336_listas';
import * as migration_20260830_194206_afterlist from './20260830_194206_afterlist';
import * as migration_20260830_210302_destinos from './20260830_210302_destinos';
import * as migration_20260831_081642_imagens from './20260831_081642_imagens';
import * as migration_20260901_225040_chave_api from './20260901_225040_chave_api';
import * as migration_20260902_010202_aeroporto from './20260902_010202_aeroporto';

export const migrations = [
  {
    up: migration_20260830_162937_inicial.up,
    down: migration_20260830_162937_inicial.down,
    name: '20260830_162937_inicial',
  },
  {
    up: migration_20260830_183855_globais.up,
    down: migration_20260830_183855_globais.down,
    name: '20260830_183855_globais',
  },
  {
    up: migration_20260830_191336_listas.up,
    down: migration_20260830_191336_listas.down,
    name: '20260830_191336_listas',
  },
  {
    up: migration_20260830_194206_afterlist.up,
    down: migration_20260830_194206_afterlist.down,
    name: '20260830_194206_afterlist',
  },
  {
    up: migration_20260830_210302_destinos.up,
    down: migration_20260830_210302_destinos.down,
    name: '20260830_210302_destinos',
  },
  {
    up: migration_20260831_081642_imagens.up,
    down: migration_20260831_081642_imagens.down,
    name: '20260831_081642_imagens',
  },
  {
    up: migration_20260901_225040_chave_api.up,
    down: migration_20260901_225040_chave_api.down,
    name: '20260901_225040_chave_api',
  },
  {
    up: migration_20260902_010202_aeroporto.up,
    down: migration_20260902_010202_aeroporto.down,
    name: '20260902_010202_aeroporto'
  },
];
