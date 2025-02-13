import WatchedAccount from "#models/watched_account";
import QontoService from "#services/qonto_service";
import { inject } from "@adonisjs/core";
import { BaseCommand } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';

enum MenuChoice {
    ADD = 'Add',
    SHOW = 'Show',
    REMOVE = 'Remove',
    LIST = 'List',
    EXIT = 'Exit'
}

export default class QontoWatch extends BaseCommand {
    static commandName = 'qonto:watch';
    static description = 'Manage watched accounts';

    private qontoService!: QontoService;
    private watchedAccount!: typeof WatchedAccount;

    static options: CommandOptions = {
        startApp: true
    };

    @inject()
    async prepare(qontoService: QontoService) {
        this.qontoService = qontoService;
        this.watchedAccount = (await import('#models/watched_account')).default;
    }

    async run(): Promise<void> {
        const menuChoice = await this.prompt.choice("What do you want to do ?", [
            { name: MenuChoice.SHOW, message: '[show] Show internal accounts' },
            { name: MenuChoice.LIST, message: '[list] List all watched accounts' },
            { name: MenuChoice.ADD, message: '[add] Add account to watch list' },
            { name: MenuChoice.REMOVE, message: '[remove] Remove an watched account' },
            { name: MenuChoice.EXIT, message: '[exit] Exit' }
        ]);

        switch (menuChoice) {
            case MenuChoice.SHOW:
                await this.show();
                break;

            case MenuChoice.LIST:
                await this.list();
                break;

            case MenuChoice.ADD:
                await this.add();
                break;

            case MenuChoice.REMOVE:
                await this.remove();
                break;

            case MenuChoice.EXIT:
                return await this.terminate();
        }

        return this.run();
    }

    async show() {
        const animation = this.logger.await('Fetching organization details');
        animation.start();

        const { organization } = await this.qontoService.organizationDetails();
        const bankAccounts = organization.bank_accounts;

        animation.stop();

        const table = this.ui.table();
        table.head(['Name', 'IBAN', 'Qonto ID', 'Watched']);

        for (const account of bankAccounts) {
            const isWatched = await this.watchedAccount.findBy('qonto_id', account.id);
            table.row([account.name, account.iban, account.id, isWatched ? 'Yes' : 'No']);
        }

        table.render();
    }

    async list() {
        const table = this.ui.table();
        const watchedAccounts = await this.watchedAccount.all();

        table.head(['ID', 'Name', 'Qonto ID']);

        if (watchedAccounts.length <= 0) {
            table.row(['No exclusions found', '', '']);
        }

        for (const account of watchedAccounts.reverse()) {
            table.row([account.id.toString(), account.name, account.qonto_id]);
        }

        table.render()
    }

    async add() {
        const animation = this.logger.await('Fetching organization details');
        animation.start();

        const { organization } = await this.qontoService.organizationDetails();
        const bankAccounts = organization.bank_accounts;

        animation.update('Organization details fetched');
        animation.stop();

        const preparedList = bankAccounts.map(account => ({
            name: account.id,
            message: `${account.name} - ${account.iban}`
        }));

        const selectedAccountsIds = await this.prompt.multiple('Select the accounts to watch', preparedList);
        for (const accountId of selectedAccountsIds) {
            const account = bankAccounts.find((acc) => acc.id === accountId)!;

            if (await this.watchedAccount.findBy('qonto_id', account.id)) {
                this.logger.warning('This account is already watched.')
                continue;
            }

            await this.watchedAccount.create({
                qonto_id: account.id,
                name: account.name
            })

            this.logger.success(`Account [${account.id}] ${account.name} has been added to the watch list.`);
        }
    }

    async remove() {
        const accounts = (await this.watchedAccount.all()).reverse();
        if (accounts.length <= 0) return this.logger.warning('No account excluded yet.');

        const preparedList = accounts.map(account => ({
            name: account.id.toString(),
            message: `${account.name} - ${account.qonto_id}`
        }));

        const selectIbans = await this.prompt.multiple('Select all the IBANs to remove', preparedList);

        for (const selectedIban of selectIbans) {
            const account = accounts.find((acc) => acc.id.toString() === selectedIban);
            if (!account) continue;

            await account.delete();
        }

        this.logger.success('Selected IBANs have been removed from the exclusion list.');
    }

    async completed() {
        if (this.error) {
            this.logger.error(this.error.message);

            // Notify Ace that error has been handled
            return true;
        }
    }
}
