import * as m0 from './components/modal.js';
import * as m1 from './components/notifications.js';
import * as m2 from './core/app.js';
import * as m3 from './core/state.js';
import * as m4 from './domain/baixas.js';
import * as m5 from './domain/csv.js';
import * as m6 from './domain/stock.js';
import * as m7 from './features/auditoria/ui.js';
import * as m8 from './features/auth/ui.js';
import * as m9 from './features/baixas/ui.js';
import * as m10 from './features/dashboard/ui.js';
import * as m11 from './features/estoque/ui.js';
import * as m12 from './features/exportacao/ui.js';
import * as m13 from './features/fornecedores/ui.js';
import * as m14 from './features/reformas/ui.js';
import * as m15 from './features/usuarios/ui.js';
import * as m16 from './services/data-store.js';
import * as m17 from './services/maintenance.js';
import * as m18 from './utils/helpers.js';

// Ponte temporária para os eventos inline do HTML.
Object.assign(window, m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17, m18);
window.__appReady = true;
