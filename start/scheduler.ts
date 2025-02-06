import scheduler from 'adonisjs-scheduler/services/main';

import PollTransactions from '#commands/poll_transactions';

scheduler.command(PollTransactions).daily();
