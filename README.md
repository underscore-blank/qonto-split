<a name="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/underscore-blank/qonto-split">
    <img src=".github/assets/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">qonto-split</h3>

  <p align="center">
    Automatically split your Qonto incomes into an internal account.
    <br />
    <a href="https://github.com/underscore-blank/qonto-split/issues/new?labels=bug">Report Bug</a>
    ·
    <a href="https://github.com/underscore-blank/qonto-split/issues/new?labels=enhancement">Request Modification</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#getting-started_prerequisites">Prerequisites</a></li>
        <li><a href="#getting-started_installation">1. Installation</a></li>
        <li><a href="#getting-started_environment">2. Environment variables</a></li>
        <li><a href="#getting-started_setup">3. Setup</a></li>
        <li><a href="#getting-started_manual_run">4. Manual Run</a></li>
        <li><a href="#getting-started_auto_run">5. Scheduled Run (Cron-like)</a></li>
      </ul>
    </li>
    <li>
      <a href="#commands">Commands</a>
      <ul>
        <li><a href="#commands_watch"><code>qonto:watch</code> - Manage watched accounts</a></li>
        <li><a href="#commands_exclude"><code>qonto:exclude</code> - Manage excluded accounts</a></li>
      </ul>
    </li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Qonto Split is a tool that automatically distributes your Qonto account’s income into an internal account.

The initial purpose was to allocate incoming VAT amounts to a sub-account to prevent excessive cash flow usage and ensure a constant provision for its payment. However, it can also be used to allocate a fixed percentage of an incoming amount (a different calculation than VAT). This feature is not available on Qonto.

### Built With

-   [![TypeScript][TypeScript]][TypeScript-url]
-   [![AdonisJS][AdonisJS]][AdonisJS-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

Follow the step-by-step guide below to start using `qonto-split`.

### <span id="getting-started_prerequisites">Prerequisites</span>

We ❤️ `pnpm` for managing project dependencies. You can install it using npm or yarn. If you don’t have it, use the 
following command or refer to the `pnpm` [documentation](https://pnpm.io/installation) for more information.

```sh
npm install -g pnpm@latest-10
```

### <span id="getting-started_installation">1. Installation</span>

Run the following commands to get the project on your machine:

1. Clone the repo (using HTTPS or SSH)
    ```sh
    git clone https://github.com/underscore-blank/qonto-split.git
    ```
2. Go to the project directory
    ```sh
    cd qonto-split
    ```
3. Install packages dependencies
    ```sh
    pnpm install
    ```
4. Copy the `.env.example` file to `.env`
    ```sh
    cp .env.example .env
    ```
5. Generate the application key
    ```sh
    node ace generate:key
    ```
6. Create the database (we use SQLite)
    ```sh
    node ace db:create
    ```
7. Run the migrations
    ```sh
    node ace migration:fresh
    ```

That's it! You are now ready to setup the application.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
   
### <span id="getting-started_environment">2. Environment variables</span>

Define all the environment variables in the `.env` file at the project root. Your completed file should look like this. The `NODE_ENV` variable influences the application’s behavior:

- `development` : All commands are executed in dry-run mode, and **no transfers are made**.
- `production` : Commands are executed normally, and transfers are performed.

To retrieve your credentials, go to [Qonto](https://app.qonto.com) and get your secret key and organization ID: 
**Settings (Cog Icon) > Integrations & Partnerships > API Key.**

```env
TZ=UTC
PORT=3333
HOST=localhost
LOG_LEVEL=info
APP_KEY=RzsLKGzEC3xQVLYG64vfifRkDMz4VVgk # Your app key may be different
NODE_ENV=development # Set as production for production environment

QONTO_API_BASE_URL=https://thirdparty.qonto.com/
QONTO_SECRET_KEY=YOUR_QONTO_SECRET_KEY # Your Qonto secret key
QONTO_ORGANIZATION_SLUG=YOUR_QONTO_ORGANIZATION_SLUG # Your Qonto organization slug
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### <span id="getting-started_setup">3. Setup</span>

Now, you will configure the application. If you need to modify the configuration later, simply rerun the setup command. The setup wizard will guide you interactively.
The setup will allow you to configure watched accounts and IBANs to exclude. If you want to configure them later, check the [commands](#commands) section.

- **Reference for withdrawal:** The reference used for transfers to help you identify them. Default: `Internal Transfer - Qonto Split`.
- **Split amount:**  The percentage of the incoming amount to transfer to the internal account. Enter the number without the `%`.
- **VAT mode:** Changes the calculation mode for the transferred amount. In VAT mode, the amount is calculated 
  based on the **Split amount**. In fixed mode, it is calculated as a percentage of the incoming amount.
- **Exclude internal incomes:** If you want to exclude internal transfers from the split, enable this option.

**Configuration form:**

![Qonto Setup Form](./.github/assets/qonto_setup.png)

**Run the setup with the following command:**
```sh
node ace qonto:setup
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### <span id="getting-started_manual_run">4. Manual Run</span>

To manually execute the application, use the following command.

**Options :**
- `--interactive` or `-i`: Enables interactive mode, allowing you to review transfers before execution. Default: `false`.
- `--dry`: Runs in dry-run mode, where no transfers are made. Default activated if `NODE_ENV=development`.
- `--interval[=value]` : Defines the time interval for transaction retrieval. Possible values:
  - `year`
  - `quarter`
  - `month` 
  - `week` (default)
  - `day` 
  - `hour` 
  - `minute`

**Run manually with:**
```sh
node ace qonto:split --interactive
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### <span id="getting-started_auto_run">5. Scheduled Run (Cron-like)</span>

To automatically execute the application daily, use the built-in pm2 configuration:

```sh
pm2 start scheduler.config.cjs && pm2 save
```

> You can modify the `pm2` configuration by editing [`scheduler.config.cjs`](./scheduler.config.cjs)  in the project root.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- COMMANDS -->

## Commands

Additional commands are available to help manage the application's configuration. You can also use them if you don't want to restart the entire setup process.

### <span id="commands_watch">`qonto:watch` - Manage watched accounts</span>

This command allows you to manage the accounts monitored by the application. You can add or remove accounts to watch. The monitored accounts are used to retrieve transactions and incoming transfers.

![Qonto Watch Form](./.github/assets/qonto_watch.png)

**Run with the following command:**
```sh
node ace qonto:watch
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### <span id="commands_exlude">`qonto:exclude` - Manage excluded accounts</span>

This command allows you to manage accounts that should be excluded from income distribution. Excluded accounts will not be considered when splitting income. All transactions from these accounts will be ignored.

![Qonto Exclude Form](./.github/assets/qonto_exclude.png)

**Run with the following command :**
```sh
node ace qonto:exclude
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

-   Kylian Mallet - [@Kylian-Mallet](https://github.com/Kylian-Mallet) - [kylian.mallet@sklav.group](mailto:kylian.mallet@sklav.group)
-   Guillaume Varin - [@GullmeVrn](https://github.com/GullmeVrn) - [guillaume.varin@sklav.group](mailto:guillaume.varin@sklav.group)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[product-screenshot]: .github/assets/screenshot.jpeg
[AdonisJS]: https://img.shields.io/badge/AdonisJS-5468FF?style=for-the-badge&logo=adonisjs&logoColor=whtie
[AdonisJS-url]: https://adonisjs.com/
[TypeScript]: https://img.shields.io/badge/typescript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
