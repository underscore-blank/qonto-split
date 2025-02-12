import scheduler from 'adonisjs-scheduler/services/main';

import QontoSplit from '#commands/qonto_split';

scheduler.command(QontoSplit).daily();
