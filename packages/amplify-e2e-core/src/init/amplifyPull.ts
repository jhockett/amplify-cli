import { getCLIPath, nspawn as spawn } from '../../src';
import { initJSProjectWithProfile } from '../init';

export function amplifyPull(cwd: string, settings: { override?: boolean; emptyDir?: boolean; appId?: string }) {
  return new Promise((resolve, reject) => {
    const tableHeaderRegex = /\|\sCategory\s+\|\sResource\sname\s+\|\sOperation\s+\|\sProvider\splugin\s+\|/;
    const tableSeperator = /\|(\s-+\s\|){4}/;

    const chain = spawn(getCLIPath(), settings.appId ? ['pull', '--appId', settings.appId] : ['pull'], { cwd, stripColors: true });

    if (settings.emptyDir) {
      chain
        .wait('Do you want to use an AWS profile')
        .sendLine('y')
        .wait('Please choose the profile you want to use')
        .sendCarriageReturn()
        .wait('Choose your default editor:')
        .sendCarriageReturn()
        .wait("Choose the type of app that you're building")
        .sendCarriageReturn()
        .wait('What javascript framework are you using')
        .sendCarriageReturn()
        .wait('Source Directory Path:')
        .sendCarriageReturn()
        .wait('Distribution Directory Path:')
        .sendCarriageReturn()
        .wait('Build Command:')
        .sendCarriageReturn()
        .wait('Start Command:')
        .sendCarriageReturn()
        .wait('Do you plan on modifying this backend?')
        .sendLine('y');
    } else {
      chain
        .wait('Pre-pull status')
        .wait('Current Environment')
        .wait(tableHeaderRegex)
        .wait(tableSeperator);
    }

    if (settings.override) {
      chain
        .wait('Local changes detected')
        .wait('Pulling changes from the cloud will override your local changes')
        .wait('Are you sure you would like to continue')
        .sendLine('y');
    }

    if (settings.emptyDir) {
      chain.wait(/Successfully pulled backend environment .+ from the cloud\./).wait("Run 'amplify pull' to sync upstream changes.");
    } else {
      chain
        .wait('Post-pull status')
        .wait('Current Environment')
        .wait(tableHeaderRegex)
        .wait(tableSeperator);
    }

    chain.run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        console.error(err);
        reject(err);
      }
    });
  });
}
