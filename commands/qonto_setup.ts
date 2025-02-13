import QontoExclude from "#commands/qonto_exclude";
import QontoWatch from "#commands/qonto_watch";
import Config, { ConfigKey } from "#models/config";
import QontoService from "#services/qonto_service";
import { inject } from "@adonisjs/core";
import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

export default class ExcludeIban extends BaseCommand {
    public static commandName = 'qonto:setup';
    public static description = 'Configure QontoSplit settings';

    public static options: CommandOptions = {
        startApp: true
    };

    private config!: typeof Config;
    private qontoService!: QontoService;

    @inject()
    public async prepare(qontoService: QontoService) {
        this.qontoService = qontoService;
        this.config = (await import('#models/config')).default;
    }

    public async run() {
        if ((await this.config.all()).length > 0) {
            const overwrite = await this.prompt.confirm('Configuration already exists. Do you want to overwrite it?');
            if (!overwrite) return await this.terminate();
        }

        const configElements: any[] = [];

        const animation = this.logger.await('Fetching organization details');
        animation.start();

        const { organization } = await this.qontoService.organizationDetails();
        const bankAccounts = organization.bank_accounts;
        const preparedList = bankAccounts.map(account => ({
            name: account.id,
            message: `${account.name} - ${account.iban}`
        }));

        animation.update('Organization details fetched');
        animation.stop();

        configElements.push({
            key: ConfigKey.TargetAccount,
            value: await this.prompt.choice('Select withdrawal target account', preparedList)
        });

        configElements.push({
            key: ConfigKey.WithdrawalReference,
            value: await this.prompt.ask('Enter reference for withdrawals', {
                default: 'Internal Transfer - QontoSplit',
                validate: (value) => value.trim().length > 0 || 'Reference cannot be empty'
            })
        });

        configElements.push({
            key: ConfigKey.SplitAmount,
            value: await this.prompt.ask('Enter the split amount', {
                hint: 'ex. 20%',
                validate: (value) => parseFloat(value) > 0 || 'Amount must be greater than 0',
                format: (value) => value.replaceAll('%', ''),
                result: (value) => parseFloat(value) > 1 ? parseFloat(value) / 100 : parseFloat(value)
            })
        });

        configElements.push({
            key: ConfigKey.VatMode,
            value: Number(await this.prompt.toggle('Enable VAT mode?', ['Yes', 'No'], {
                default: false
            }))
        });

        configElements.push({
            key: ConfigKey.ExcludeInternalAccounts,
            value: Number(await this.prompt.toggle('Exclude internal incomes?', ['Yes', 'No'], {
                default: true
            }))
        });

        const confirm = await this.prompt.confirm('Do you want to save these settings ?');
        if (!confirm) return await this.terminate();

        await this.config.updateOrCreateMany('key', configElements);
        this.logger.success('Settings saved successfully.');

        const setWatch = await this.prompt.toggle('Do you want to setup Watched Accounts ?', ['Yes', 'No'], {
            default: true
        })

        if (setWatch) await new QontoWatch(
            this.app,
            this.kernel,
            this.parsed,
            this.ui,
            this.prompt
        ).exec();

        const setExclude = await this.prompt.toggle('Do you want to setup Excluded Accounts ?', ['Yes', 'No'], {
            default: true
        })

        if (setExclude) await new QontoExclude(
            this.app,
            this.kernel,
            this.parsed,
            this.ui,
            this.prompt
        ).exec();

        this.logger.success('Setup completed. Run qonto:split to process transactions.');
        return await this.terminate();
    }
}
