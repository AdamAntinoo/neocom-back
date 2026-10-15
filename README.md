# neocom-back

NestJS server for the NEOCOM ecosystem. Node comes from the nvm alias `neocom`.

```bash
nvm use
npm install
npm test
npm run start:dev
```

The server listens on port 3000 unless `PORT` is set.

## Version

Versions come from [GitVersion](https://gitversion.net/) in continuous deployment mode (`GitVersion.yml`). There is no version-source tag yet. `package.json` starts at `0.0.1`. On `main`, each later commit increments the minor version.

```bash
npm run version:sync   # write GitVersion major.minor.patch into package.json
```
