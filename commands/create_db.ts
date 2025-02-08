import fs from 'node:fs/promises';
import { BaseCommand } from '@adonisjs/core/ace';

export default class CreateDatabase extends BaseCommand {
    static commandName = 'db:create';
    static description = 'Create the SQLite database';

    async run() {
        const tmpDir = this.app.tmpPath();
        const dbPath = this.app.tmpPath('db.sqlite');
        this.logger.info(`Creating database at ${dbPath}`);

        try {
            await fs.access(tmpDir);
        } catch {
            await fs.mkdir(tmpDir, { recursive: true });
            this.logger.info(`Created directory ${tmpDir}`);
        }

        try {
            await fs.access(dbPath);
            this.logger.info(`Database already exists at ${dbPath}`);
        } catch {
            await fs.writeFile(dbPath, '', { flag: 'wx' });
            this.logger.success(`Database created at ${dbPath}`);
        }
    }
}
