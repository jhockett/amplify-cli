import open from 'open';
import ora from 'ora';
import { analyzeProject } from '../config-steps/c0-analyzeProject';
import { configFrontendHandler } from '../config-steps/c1-configFrontend';
import { configProviders } from '../config-steps/c2-configProviders';
import { configureNewUser } from '../configure-new-user';
import { onFailure } from '../config-steps/c9-onFailure';
import { onSuccess } from '../config-steps/c9-onSuccess';
import { normalizeInputParams } from '../input-params-manager';
import { write } from '../app-config';
import { Context } from '../domain/context';
import { AdminLoginServer } from '../app-config/adminLoginServer';
import { amplifyAdminUrl, originUrl } from './helpers/constants';

export const run = async (context: Context) => {
  if (context.parameters.options['usage-data-off']) {
    write(context, { usageDataConfig: { isUsageTrackingEnabled: false } });
    context.print.success('Usage Data has been turned off');
    return;
  }
  if (context.parameters.options['usage-data-on']) {
    write(context, { usageDataConfig: { isUsageTrackingEnabled: true } });
    context.print.success('Usage Data has been turned on');
    return;
  }

  if (context.parameters.options.appId && context.parameters.options.envName) {
    const { appId, envName } = context.parameters.options;
    const URL = amplifyAdminUrl(appId, envName);
    context.print.info(`Opening link: ${URL}`);
    await open(URL, { wait: false }).catch(e => {
      context.print.error('Failed to open web browser.');
      return;
    });
    const spinner = ora('Continue in browser to log in…\n').start();
    try {
      // spawn express server locally to get credentials from redirect
      const adminLoginServer = new AdminLoginServer(appId, originUrl, () => {
        adminLoginServer.shutdown();
        spinner.stop();
        context.print.info('Successfully received Amplify Admin tokens.');
      });
    } catch (e) {
      spinner.stop();
      context.print.error(e);
    }
    return;
  }

  if (!context.parameters.first) {
    await configureNewUser(context);
  }

  if (context.parameters.first === 'project') {
    constructExeInfo(context);

    try {
      await analyzeProject(context);
      await configFrontendHandler(context);
      await configProviders(context);
      await onSuccess(context);
    } catch (e) {
      context.usageData.emitError(e);
      onFailure(e);
      process.exitCode = 1;
    }
  }
};

function constructExeInfo(context: Context) {
  context.exeInfo = context.amplify.getProjectDetails();
  context.exeInfo.inputParams = normalizeInputParams(context);
}
