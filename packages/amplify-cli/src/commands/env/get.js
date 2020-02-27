const chalk = require('chalk');

module.exports = {
  name: 'get',
  run: async context => {
    const envName = context.parameters.options.name;
    if (!envName) {
      context.print.error('You must pass in the name of the environment using the --name flag');
      process.exit(1);
    }
    const allEnvs = context.amplify.getEnvDetails();

    if (context.parameters.options.json) {
      if (allEnvs[envName]) {
        context.print.fancy(JSON.stringify(allEnvs[envName], null, 4));
      } else {
        context.print.fancy(JSON.stringify({ error: `No environment found with name: '${envName}'` }, null, 4));
      }
      return;
    }

    if (envName in allEnvs) {
      const env = allEnvs[envName];
      context.print.info('');
      context.print.info(chalk.red(envName));
      context.print.info('--------------');

      Object.keys(env).forEach(provider => {
        context.print.info(`Provider: ${provider}`);

        Object.keys(env[provider]).forEach(providerAttr => {
          context.print.info(`${providerAttr}: ${env[provider][providerAttr]}`);
        });

        context.print.info('--------------');
        context.print.info('');
      });
    } else {
      context.print.error('No environment found with the corresponding name provided');
    }
  },
};
