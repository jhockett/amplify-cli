import { $TSContext, pathManager, stateManager } from 'amplify-cli-core';
import fs from 'fs-extra';
import { CheckboxQuestion, InputQuestion, ListQuestion, prompt } from 'inquirer';
import _ from 'lodash';
import ora from 'ora';
import path from 'path';
import uuid from 'uuid';
import { categoryName, layerParametersFileName, provider, ServiceName } from './constants';
import { getLayerConfiguration } from './layerConfiguration';
import { LayerParameters, LayerPermission, LayerVersionMetadata, PermissionEnum } from './layerParams';
import { hashLayerVersionContents, loadPreviousLayerHash } from './packageLayer';
export interface LayerInputParams {
  layerPermissions?: PermissionEnum[];
  accountIds?: string[];
  orgIds?: string[];
}

export function layerVersionQuestion(versions: string[]): ListQuestion {
  return {
    type: 'list',
    name: 'layerVersion',
    message: 'Select the layer version to update:',
    choices: versions,
  };
}

export function layerNameQuestion(projectName: string): InputQuestion {
  return {
    type: 'input',
    name: 'layerName',
    message: 'Provide a name for your Lambda layer:',
    validate: (input: string) => {
      input = input.trim();
      const meta = stateManager.getMeta();
      if (!/^[a-zA-Z0-9-_]{1,87}$/.test(input)) {
        return 'Lambda layer names must be 1-87 characters long. Only alphanumeric, -, and _ characters supported.';
      } else if (meta?.function?.input || meta?.function?.[`${projectName}-${input}`]) {
        return `A Lambda layer with the name ${input} already exists in this project.`;
      }
      return true;
    },
    default: () => {
      const [shortId] = uuid().split('-');
      return `layer-${shortId}`;
    },
  };
}

export function layerPermissionsQuestion(params?: PermissionEnum[]): CheckboxQuestion {
  return {
    type: 'checkbox',
    name: 'layerPermissions',
    message:
      'The current AWS account will always have access to this layer.\nOptionally, configure who else can access this layer. (Hit <Enter> to skip)',
    choices: [
      {
        name: 'Specific AWS accounts',
        value: PermissionEnum.AwsAccounts,
        checked: _.includes(params, PermissionEnum.AwsAccounts),
      },
      {
        name: 'Specific AWS organization',
        value: PermissionEnum.AwsOrg,
        checked: _.includes(params, PermissionEnum.AwsOrg),
      },
      {
        name: 'Public (Anyone on AWS can use this layer)',
        short: 'Public',
        value: PermissionEnum.Public,
        checked: _.includes(params, PermissionEnum.Public),
      },
    ],
    default: [PermissionEnum.Private],
  };
}

export async function layerAccountAccessPrompt(defaultAccountIds?: string[]): Promise<string[]> {
  const hasDefaults = defaultAccountIds && defaultAccountIds.length > 0;
  const answer = await prompt({
    type: 'input',
    name: 'authorizedAccountIds',
    message: 'Provide a list of comma-separated AWS account IDs:',
    validate: (input: string) => {
      const accounts = input.split(',');
      for (const accountId of accounts) {
        if (!/^[0-9]{12}$/.test(accountId.trim())) {
          return `AWS account IDs must be 12 digits long. ${accountId} did not match the criteria.`;
        }
      }
      return true;
    },
    default: hasDefaults ? defaultAccountIds.join(',') : undefined,
  });
  return _.uniq(answer.authorizedAccountIds.split(',').map((accountId: string) => accountId.trim()));
}

export async function layerOrgAccessPrompt(defaultOrgs?: string[]): Promise<string[]> {
  const hasDefaults = defaultOrgs && defaultOrgs.length > 0;
  const answer = await prompt({
    type: 'input',
    name: 'authorizedOrgIds',
    message: 'Provide a list of comma-separated AWS organization IDs:',
    validate: (input: string) => {
      const orgIds = input.split(',');
      for (const orgId of orgIds) {
        if (!/^o-[a-zA-Z0-9]{10,32}$/.test(orgId.trim())) {
          return 'The organization ID starts with "o-" followed by a 10-32 character-long alphanumeric string.';
        }
      }
      return true;
    },
    default: hasDefaults ? defaultOrgs.join(',') : undefined,
  });
  return _.uniq(answer.authorizedOrgIds.split(',').map((orgId: string) => orgId.trim()));
}

export function previousPermissionsQuestion(): ListQuestion {
  return {
    type: 'list',
    name: 'usePreviousPermissions',
    message: 'What permissions do you want to grant to this new layer version?',
    choices: [
      {
        name: 'The same permission as the latest layer version',
        short: 'Previous version permissions',
        value: true,
      },
      {
        name: 'Only accessible by the current account. You can always edit this later with: amplify update function',
        short: 'Private',
        value: false,
      },
    ],
    default: 0,
  };
}

export function layerInputParamsToLayerPermissionArray(parameters: LayerInputParams): LayerPermission[] {
  const { layerPermissions = [] } = parameters;

  if (layerPermissions.filter(p => p === PermissionEnum.Public).length > 0) {
    return [
      {
        type: PermissionEnum.Public,
      },
    ];
  }

  const permissionObj: Array<LayerPermission> = [];
  layerPermissions.forEach(val => {
    let obj: LayerPermission;
    if (val === PermissionEnum.Public) {
      obj = {
        type: PermissionEnum.Public,
      };
    } else if (val === PermissionEnum.AwsOrg) {
      obj = {
        type: PermissionEnum.AwsOrg,
        orgs: parameters.orgIds,
      };
    } else if (val === PermissionEnum.AwsAccounts) {
      obj = {
        type: PermissionEnum.AwsAccounts,
        accounts: parameters.accountIds,
      };
    }
    permissionObj.push(obj);
  });

  const privateObj: LayerPermission = {
    type: PermissionEnum.Private,
  };
  permissionObj.push(privateObj); // layer is always accessible by the aws account of the owner
  return permissionObj;
}

export function loadStoredLayerParameters(context: $TSContext, layerName: string): LayerParameters {
  const backendDirPath = pathManager.getBackendDirPath();
  const { permissions, runtimes } = getLayerConfiguration(backendDirPath, layerName);
  return {
    layerName,
    runtimes,
    permissions,
    providerContext: {
      provider: provider,
      service: ServiceName.LambdaLayer,
      projectName: context.amplify.getProjectDetails().projectConfig.projectName,
    },
    build: true,
  };
}

export function getLayerPath(layerName: string) {
  return path.join(pathManager.getBackendDirPath(), categoryName, layerName);
}

export async function isNewVersion(layerName: string) {
  const previousHash = loadPreviousLayerHash(layerName);
  const currentHash = await hashLayerVersionContents(getLayerPath(layerName));
  return previousHash !== currentHash;
}

export function isMultiEnvLayer(layerName: string) {
  const layerParametersPath = path.join(getLayerPath(layerName), layerParametersFileName);
  return !fs.existsSync(layerParametersPath);
}

export async function loadLayerDataFromCloud(context: $TSContext, layerName: string): Promise<LayerVersionMetadata[]> {
  const spinner = ora('Loading layer data from the cloud...').start();
  let layerMetadata: LayerVersionMetadata[];
  try {
    const { envName }: { envName: string } = context.amplify.getEnvInfo();
    const providerPlugin = await import(context.amplify.getProviderPlugins(context).awscloudformation);
    const Lambda = await providerPlugin.getLambdaSdk(context);
    const layerVersionList = await Lambda.listLayerVersions(isMultiEnvLayer(layerName) ? `${layerName}-${envName}` : layerName);
    const Cfn = await providerPlugin.getCloudFormationSdk(context);
    const stackList = await Cfn.listStackResources();
    const layerStacks = stackList?.StackResourceSummaries?.filter(stack => stack.LogicalResourceId.includes(layerName));
    let detailedLayerStack;

    if (layerStacks?.length > 0) {
      detailedLayerStack = (await Cfn.listStackResources(layerStacks[0].PhysicalResourceId)).StackResourceSummaries; // TODO this only works for 1 layer
    }
    layerVersionList.forEach(layerVersion => {
      let layerLogicalIdSuffix;
      detailedLayerStack
        .filter(stack => stack.ResourceType === 'AWS::Lambda::LayerVersion' && stack.PhysicalResourceId === layerVersion.LayerVersionArn)
        .forEach(stack => {
          layerVersion.LogicalName = stack.LogicalResourceId;
          layerLogicalIdSuffix = stack.LogicalResourceId.replace('LambdaLayerVersion', '');
        });

      detailedLayerStack
        .filter(
          stack =>
            stack.ResourceType === 'AWS::Lambda::LayerVersionPermission' &&
            stack.PhysicalResourceId.split('#')[0] === layerVersion.LayerVersionArn,
        )
        .forEach(stack => {
          // layer version permission
          layerVersion.permissions = layerVersion.permissions || [];
          const permissionTypeString = stack.LogicalResourceId.replace('LambdaLayerPermission', '').replace(layerLogicalIdSuffix, '');
          const accountIds = [];
          const orgIds = [];
          if (permissionTypeString === PermissionEnum.Private) {
            layerVersion.permissions.push({ type: PermissionEnum.Private });
          } else if (permissionTypeString === PermissionEnum.Public) {
            layerVersion.permissions.push({ type: PermissionEnum.Public });
          } else if (permissionTypeString.startsWith(PermissionEnum.AwsAccounts)) {
            accountIds.push(permissionTypeString.replace(PermissionEnum.AwsAccounts, ''));
          } else if (permissionTypeString.startsWith(PermissionEnum.AwsOrg)) {
            const orgId = permissionTypeString.replace(PermissionEnum.AwsOrg + 'o', 'o-');
            orgIds.push(orgId);
          }

          if (accountIds.length > 0) {
            layerVersion.permissions.push({
              type: PermissionEnum.AwsAccounts,
              accounts: accountIds,
            });
          }
          if (orgIds.length > 0) {
            layerVersion.permissions.push({
              type: PermissionEnum.AwsOrg,
              orgs: orgIds,
            });
          }
        });
    });
    layerMetadata = layerVersionList;
  } catch (e) {
    // TODO error handling
    spinner.fail();
    context.print.error(`An error occurred getting latest layer version metadata for "${layerName}": ${e}`);
    throw e;
  }
  console.log(`processed layerMetadata from cloud:`, layerMetadata);
  spinner.stop();
  return layerMetadata;
}
