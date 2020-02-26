import * as nexpect from '../utils/nexpect-modified';
import { getCLIPath, isCI } from '../utils';

export function addSimpleDDB(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Please provide a friendly name for your resource')
      .sendline(settings.name || '\r')
      .wait('Please provide table name')
      .sendline('\r')
      .wait('What would you like to name this column')
      .sendline('id')
      .sendline('\r')
      .wait('Please choose the data type')
      .sendline('\r')
      .wait('Would you like to add another column')
      .sendline('n')
      .sendline('\r')
      .wait('Please choose partition key for the table')
      .sendline('\r')
      .wait('Do you want to add a sort key to your table')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add global secondary indexes to your table')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your Table')
      .sendline('n')
      .sendline('\r')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function addDDBWithTrigger(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Please provide a friendly name for your resource')
      .sendline('\r')
      .wait('Please provide table name')
      .sendline('\r')
      .wait('What would you like to name this column')
      .sendline('id')
      .sendline('\r')
      .wait('Please choose the data type')
      .sendline('\r')
      .wait('Would you like to add another column')
      .sendline('n')
      .sendline('\r')
      .wait('Please choose partition key for the table')
      .sendline('\r')
      .wait('Do you want to add a sort key to your table')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add global secondary indexes to your table')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your Table')
      .sendline('y')
      .sendline('\r')
      .wait('Select from the following options')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Do you want to edit the local')
      .sendline('n')
      .sendline('\r')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function updateDDBWithTrigger(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['update', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Specify the resource that you would want to update')
      .sendline('\r')
      .wait('Would you like to add another column')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add global secondary indexes to your table')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your Table')
      .sendline('y')
      .sendline('\r')
      .wait('Select from the following options')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Do you want to edit the local')
      .sendline('n')
      .sendline('\r')
      .wait('overwrite')
      .sendline('y')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function updateSimpleDDBwithGSI(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['update', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Specify the resource that you would want to update')
      .sendline('\r')
      .wait('Would you like to add another column')
      .sendline('y')
      .sendline('\r')
      .wait('What would you like to name this column')
      .sendline('gsi-col2')
      .sendline('\r')
      .wait('Please choose the data type')
      .sendline('\r')
      .wait('Would you like to add another column')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add global secondary indexes to your table?')
      .sendline('y')
      .sendline('\r')
      .wait('Please provide the GSI name')
      .sendline('gsi2')
      .sendline('\r')
      .wait('Please choose partition key for the GSI')
      .sendline('\r')
      .wait('Do you want to add more global secondary indexes to your table?')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to keep existing global seconday indexes created on your table?')
      .sendline('y')
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your Table?')
      .sendline('n')
      .sendline('\r')
      .wait('overwrite')
      .sendline('y')
      .sendline('\r')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function addSimpleDDBwithGSI(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Please provide a friendly name for your resource')
      .sendline('\r')
      .wait('Please provide table name')
      .sendline('\r')
      .wait('What would you like to name this column')
      .sendline('id')
      .sendline('\r')
      .wait('Please choose the data type')
      .sendline('\r')
      .wait('Would you like to add another column')
      .sendline('y')
      .sendline('\r')
      .wait('What would you like to name this column')
      .sendline('gsi-col1')
      .sendline('\r')
      .wait('Please choose the data type')
      .sendline('\r')
      .wait('Would you like to add another column')
      .sendline('n')
      .sendline('\r')
      .wait('Please choose partition key for the table')
      .sendline('\r')
      .wait('Do you want to add a sort key to your table')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add global secondary indexes to your table?')
      .sendline('y')
      .sendline('\r')
      .wait('Please provide the GSI name')
      .sendline('gsi1')
      .sendline('\r')
      .wait('Please choose partition key for the GSI')
      .sendline('\r')
      .wait('Do you want to add more global secondary indexes to your table')
      .sendline('n')
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your Table')
      .sendline('n')
      .sendline('\r')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

// Adds auth and S3 to test case where user adds storage without adding auth first
export function addS3AndAuthWithAuthOnlyAccess(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      .sendline('\r') // Content
      .wait('You need to add auth (Amazon Cognito) to your project in order to add storage')
      .sendline('y')
      .wait('Do you want to use the default authentication and security configuration')
      .sendline('\r') // Default config
      .wait('How do you want users to be able to sign in')
      .sendline('\r') // Username
      .wait('Do you want to configure advanced settings')
      .sendline('\r') // No, I am done.
      .wait('Please provide a friendly name for your resource')
      .sendline('\r') // Default name
      .wait('Please provide bucket name')
      .sendline('\r') // Default name
      .wait('Who should have access')
      .sendline('\r') // Auth users only
      .wait('What kind of access do you want for Authenticated users')
      .sendline('i') // Select all
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your S3 Bucket')
      .sendline('n')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function addS3WithGuestAccess(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      .sendline('\r') // Content
      .wait('Please provide a friendly name for your resource')
      .sendline('\r') // Default name
      .wait('Please provide bucket name')
      .sendline('\r') // Default name
      .wait('Who should have access')
      .send('j')
      .sendline('\r') // Auth and guest users
      .wait('What kind of access do you want for Authenticated users')
      .send('i') // Select all
      .sendline('\r')
      .wait('What kind of access do you want for Guest users')
      .send('j')
      .send(' ') // Select read
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your S3 Bucket')
      .sendline('n')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

// Expects 2 existing user pool groups
export function addS3WithGroupAccess(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      .sendline('\r') // Content
      .wait('Please provide a friendly name for your resource')
      .sendline('\r') // Default name
      .wait('Please provide bucket name')
      .sendline('\r') // Default name
      .wait('Restrict access by')
      .send('j')
      .sendline('\r') // Individual groups
      .wait('Select groups')
      .send('i') // Select all groups
      .sendline('\r')
      .wait('What kind of access do you want') // for <UserGroup1> users?
      .send('i') // Select all permissions
      .sendline('\r')
      .wait('What kind of access do you want') // for <UserGroup2> users?
      .send(' ') // Select create/update
      .send('j')
      .send(' ') // Select read
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your S3 Bucket')
      .sendline('n')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function addS3WithTrigger(cwd: string, settings: any, verbose: boolean = !isCI()) {
  return new Promise((resolve, reject) => {
    nexpect
      .spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true, verbose })
      .wait('Please select from one of the below mentioned services')
      .sendline('\r')
      .wait('Please provide a friendly name')
      .sendline('\r')
      .wait('Please provide bucket name')
      .sendline('\r')
      .wait('Who should have access')
      .sendline('\r')
      .wait('What kind of access do you want')
      .send(' ')
      .sendline('\r')
      .wait('Do you want to add a Lambda Trigger for your S3 Bucket')
      .sendline('y')
      .sendline('\r')
      .wait('Select from the following options')
      // j = down arrow
      .sendline('j')
      .sendline('\r')
      .wait('Do you want to edit the local')
      .sendline('n')
      .sendline('\r')
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}
